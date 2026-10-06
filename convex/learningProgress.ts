import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { CERTIFICATE_PASS_RATIO, isProgramCompleteServer, loadProgramDef, rescoreAssessment, SERIAL_PATTERN } from "./lib/eligibility";
import { fail } from "./lib/errors";
import { applyProgressDelta } from "./lib/analytics";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("learningProgress").withIndex("by_user", (q) => q.eq("userId", profile._id)).collect();
  },
});

export const save = mutation({
  args: { programId: v.string(), progress: v.any() },
  handler: async (ctx, { programId, progress }) => {
    const profile = await requireCurrentProfile(ctx);
    const def = await loadProgramDef(ctx, programId);
    if (!def) throw fail("INVALID_ARGUMENT", "Unknown program");
    const existing = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", programId)).unique();

    // Archived lessons stay valid so earlier completions are never silently dropped.
    const validKeys = def.knownLessonKeys;
    const completedLessons = [...new Set<string>((Array.isArray(progress?.completedLessons) ? progress.completedLessons : [])
      .filter((k: unknown): k is string => typeof k === "string" && validKeys.has(k)))];
    const reflections: Record<string, string> = {};
    for (const [k, text] of Object.entries(progress?.reflections ?? {})) {
      if (validKeys.has(k) && typeof text === "string") reflections[k] = text.slice(0, 5000);
    }
    // Assessment results are written only by submitAssessment (marked on the server, attempt-limited). Anything the
    // client sends for them is ignored, so this cannot be used to probe answers by trial and error.
    void rescoreAssessment;
    const preAssessment = existing?.preAssessment;
    const postAssessment = existing?.postAssessment;

    // Certificate fields are only kept when the *recomputed* progress meets the bar,
    // and an already-issued serial can never be replaced from the client.
    const eligible = isProgramCompleteServer(def, { completedLessons, reflections, postAssessment });
    const claimedSerial = typeof progress?.certificateSerial === "string" ? progress.certificateSerial.toUpperCase() : undefined;
    const serial = existing?.certificateSerial
      ?? (eligible && claimedSerial && SERIAL_PATTERN.test(claimedSerial) ? claimedSerial : undefined);
    const earnedAt = existing?.certificateEarnedAt
      ?? (eligible && serial && typeof progress?.certificateEarnedAt === "string" ? progress.certificateEarnedAt : undefined);

    const value = {
      userId: profile._id, programId, completedLessons, reflections,
      ...(preAssessment ? { preAssessment } : {}),
      ...(postAssessment ? { postAssessment } : {}),
      ...(progress?.assignment && typeof progress.assignment.text === "string" ? { assignment: {
        text: String(progress.assignment.text).slice(0, 20000),
        feedback: String(progress.assignment.feedback ?? "").slice(0, 20000),
        submittedAt: String(progress.assignment.submittedAt ?? ""),
      } } : {}),
      ...(earnedAt ? { certificateEarnedAt: earnedAt } : {}),
      ...(serial ? { certificateSerial: serial } : {}),
      cohortJoined: progress?.cohortJoined === true, updatedAt: Date.now(),
    };
    await applyProgressDelta(ctx, programId, existing, value, existing?._creationTime ?? Date.now());
    if (existing) { await ctx.db.patch(existing._id, value); return existing._id; }
    return await ctx.db.insert("learningProgress", value);
  },
});


const MAX_POST_ATTEMPTS_PER_DAY = 3;

/**
 * Marks a quiz on the server. The browser never has the answer key: it sends the chosen options and gets back the
 * score. Per-question feedback (which were right, the correct option and why) is only returned for the pre-assessment,
 * which has no pass mark, and for a post-assessment that was passed. A failed post-assessment returns the score only,
 * so retaking cannot be used to harvest the answers; retakes are limited per day.
 */
export const submitAssessment = mutation({
  args: { programId: v.string(), kind: v.union(v.literal("pre"), v.literal("post")), answers: v.array(v.number()), attemptId: v.optional(v.id("assessmentAttempts")) },
  handler: async (ctx, { programId, kind, answers, attemptId }) => {
    const profile = await requireCurrentProfile(ctx);
    const def = await loadProgramDef(ctx, programId);
    if (!def) throw fail("INVALID_ARGUMENT", "Unknown program");
    const questions = kind === "pre" ? def.preAssessment : def.postAssessment;
    if (questions.length === 0) throw fail("INVALID_ARGUMENT", "This program has no assessment");
    if (answers.length !== questions.length || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) throw fail("INVALID_ARGUMENT", "Answer every question");
    const now = Date.now();
    if (kind === "post") {
      const recent = await ctx.db.query("assessmentAttempts").withIndex("by_profile_and_program", (q) => q.eq("profileId", profile._id).eq("programId", programId).gt("startedAt", now - 86_400_000)).take(20);
      if (recent.filter((a) => a.kind === "post" && a.submittedAt !== undefined).length >= MAX_POST_ATTEMPTS_PER_DAY)
        throw fail("TOO_MANY_ATTEMPTS", "You have taken this assessment several times today. Review the lessons and try again tomorrow.");
    }
    const score = answers.reduce((n, a, i) => n + (a === questions[i].correct ? 1 : 0), 0);
    const total = questions.length;
    const passed = kind === "pre" || score / total >= CERTIFICATE_PASS_RATIO;
    // Record the attempt (with its integrity log) and the result.
    const attempt = attemptId ? await ctx.db.get(attemptId) : null;
    if (attempt && attempt.profileId === profile._id && attempt.submittedAt === undefined) await ctx.db.patch(attempt._id, { submittedAt: now, score, total });
    else await ctx.db.insert("assessmentAttempts", { profileId: profile._id, programId, kind, startedAt: now, submittedAt: now, score, total, assistive: false, events: [] });
    const existing = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", programId)).unique();
    const result = { score, total, date: new Date(now).toLocaleDateString("en-KE"), answers };
    const field = kind === "pre" ? "preAssessment" : "postAssessment";
    // Same bookkeeping as save(): analytics counters and quiz item analysis follow every change.
    const base = existing
      ? (({ _id, _creationTime, ...rest }) => rest)(existing)
      : { userId: profile._id, programId, completedLessons: [] as string[], reflections: {} as Record<string, string>, cohortJoined: false };
    const value = { ...base, [field]: result, updatedAt: now };
    await applyProgressDelta(ctx, programId, existing, value as never, existing?._creationTime ?? now);
    if (existing) await ctx.db.patch(existing._id, { [field]: result, updatedAt: now });
    else await ctx.db.insert("learningProgress", value as never);
    const explanations = questions as { correct: number; explanation?: string }[];
    return {
      score,
      total,
      passed,
      review: passed ? explanations.map((q, i) => ({ correct: q.correct, chosen: answers[i], explanation: q.explanation ?? "" })) : null,
    };
  },
});
