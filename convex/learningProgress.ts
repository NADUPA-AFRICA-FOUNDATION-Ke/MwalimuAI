import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { isProgramCompleteServer, loadProgramDef, rescoreAssessment, SERIAL_PATTERN } from "./lib/eligibility";
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
    const preAssessment = rescoreAssessment(def.preAssessment, progress?.preAssessment);
    const postAssessment = rescoreAssessment(def.postAssessment, progress?.postAssessment);

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
