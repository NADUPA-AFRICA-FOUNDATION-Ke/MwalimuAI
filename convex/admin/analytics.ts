import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { staffMutation, staffQuery } from "../lib/staff";
import { applyProgressDelta, bump, countNeedsAnswers, programCatalog, readCounters } from "../lib/analytics";
import { getProgramDef } from "../lib/contentRead";
import { addDays, eatDateKey } from "../lib/streakMath";
import { fail } from "../lib/errors";

const TREND_TYPES = ["login", "lesson", "tool", "assessment"] as const;
const REBUILD_DAYS = 120;
const MAX_EXPORT_ROWS = 50_000;

const round1 = (n: number) => Math.round(n * 10) / 10;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Per-program funnel and rates, from the counters. */
export const overview = staffQuery({
  permission: "analytics.read",
  args: {},
  handler: async (ctx) => {
    const catalog = await programCatalog(ctx);
    const programs = [];
    for (const p of catalog) {
      const base = (s: string) => `p:${p.id}:${s}`;
      const counters = await readCounters(ctx, [
        ...["enrolled", "lessons", "pre", "preSum", "post", "postSum", "assign", "cert", "certDays"].map(base),
        ...p.lessons.map((l) => base(`l:${l.key}`)),
      ]);
      const get = (s: string) => counters.get(base(s)) ?? 0;
      const enrolled = get("enrolled");
      const active = p.lessons.filter((l) => l.active);
      const completed = get("cert");
      programs.push({
        id: p.id,
        title: p.title,
        totalLessons: active.length,
        enrolled,
        completed,
        completionRate: round1(ratio(completed, enrolled) * 100),
        avgProgressPct: round1(Math.min(100, ratio(get("lessons"), enrolled * Math.max(1, active.length)) * 100)),
        preTaken: get("pre"),
        postTaken: get("post"),
        avgPrePct: round1(ratio(get("preSum"), get("pre"))),
        avgPostPct: round1(ratio(get("postSum"), get("post"))),
        assignments: get("assign"),
        avgDaysToCertificate: round1(ratio(get("certDays"), completed)),
        funnel: p.lessons.map((l) => {
          const n = counters.get(base(`l:${l.key}`)) ?? 0;
          return { key: l.key, title: l.title, module: l.module, active: l.active, completions: n, pctOfEnrolled: round1(ratio(n, enrolled) * 100) };
        }),
      });
    }
    const enrolments = programs.reduce((n, p) => n + p.enrolled, 0);
    const certificates = programs.reduce((n, p) => n + p.completed, 0);
    return {
      programs,
      totals: { enrolments, certificates, completionRate: round1(ratio(certificates, enrolments) * 100) },
    };
  },
});

/** Learners active per day (EAT) and how many did each kind of activity. */
export const trend = staffQuery({
  permission: "analytics.read",
  args: { days: v.number() },
  handler: async (ctx, { days }) => {
    const n = Math.min(Math.max(Math.floor(days), 7), 90);
    const today = eatDateKey(Date.now());
    const dates = Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
    const counters = await readCounters(ctx, dates.flatMap((d) => TREND_TYPES.map((t) => `d:${d}:${t}`)));
    return dates.map((date) => ({
      date,
      active: counters.get(`d:${date}:login`) ?? 0,
      lessons: counters.get(`d:${date}:lesson`) ?? 0,
      tools: counters.get(`d:${date}:tool`) ?? 0,
      assessments: counters.get(`d:${date}:assessment`) ?? 0,
    }));
  },
});

/**
 * One page of learner-level rows for a program, newest progress first. Used by the on-screen table and the Excel
 * export, which walks the pages. Learner identity is included, so it needs the export permission.
 */
export const learners = staffQuery({
  permission: "analytics.export",
  args: {
    programId: v.string(),
    paginationOpts: paginationOptsValidator,
    county: v.optional(v.string()),
    status: v.optional(v.union(v.literal("all"), v.literal("completed"), v.literal("in_progress"))),
  },
  handler: async (ctx, args) => {
    const def = await getProgramDef(ctx, args.programId);
    const catalog = (await programCatalog(ctx)).find((p) => p.id === args.programId);
    const total = def?.activeLessonKeys.size ?? 0;
    const page = await ctx.db
      .query("learningProgress")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .order("desc")
      .paginate(args.paginationOpts);
    const county = args.county?.trim().toLowerCase();
    const rows = [];
    for (const r of page.page) {
      const p = await ctx.db.get(r.userId);
      if (!p) continue;
      if (county && (p.county ?? "").trim().toLowerCase() !== county) continue;
      const done = def ? r.completedLessons.filter((k) => def.activeLessonKeys.has(k)).length : r.completedLessons.length;
      const complete = Boolean(r.certificateSerial) || (total > 0 && done >= total);
      if (args.status === "completed" && !complete) continue;
      if (args.status === "in_progress" && complete) continue;
      rows.push({
        learnerId: p._id,
        name: p.name,
        email: p.email ?? "",
        phone: p.phoneNormalized ?? "",
        county: p.county ?? "",
        school: p.school ?? "",
        experienceLevel: p.cbcLevel,
        accountStatus: p.status ?? "active",
        programId: r.programId,
        programTitle: catalog?.title ?? r.programId,
        lessonsCompleted: done,
        lessonsTotal: total,
        progressPct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
        lastLesson: r.completedLessons[r.completedLessons.length - 1] ?? "",
        preScorePct: r.preAssessment && r.preAssessment.total > 0 ? Math.round((r.preAssessment.score / r.preAssessment.total) * 100) : null,
        postScorePct: r.postAssessment && r.postAssessment.total > 0 ? Math.round((r.postAssessment.score / r.postAssessment.total) * 100) : null,
        assignmentSubmitted: Boolean(r.assignment),
        certificate: r.certificateSerial ?? "",
        startedAt: r._creationTime,
        lastActivityAt: r.updatedAt,
      });
    }
    return { page: rows, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});

/** Records who took a learner-level export, of what, and why. The data itself is read through `learners`. */
export const logExport = staffMutation({
  permission: "analytics.export",
  requireReason: true,
  args: {
    reason: v.string(),
    programs: v.array(v.string()),
    county: v.optional(v.string()),
    status: v.optional(v.string()),
    rows: v.number(),
  },
  handler: async (_ctx, args, { staff }, log) => {
    if (args.rows > MAX_EXPORT_ROWS) throw fail("EXPORT_TOO_LARGE", `Exports are limited to ${MAX_EXPORT_ROWS} rows`);
    await log({
      action: "analytics.export",
      targetType: "analytics",
      targetId: "learners",
      targetLabel: `${args.rows} rows`,
      after: { programs: args.programs, county: args.county ?? null, status: args.status ?? "all", rows: args.rows, by: staff.email },
    });
    return null;
  },
});

// ── Rebuilding the counters from source rows (first run after deploy, or to repair drift) ──

export const rebuild = staffMutation({
  permission: "analytics.rebuild",
  requireReason: true,
  args: { reason: v.string() },
  handler: async (ctx, _args, _staff, log) => {
    await ctx.scheduler.runAfter(0, internal.admin.analytics.rebuildStep, { phase: "clear" });
    await log({ action: "analytics.rebuild", targetType: "analytics", targetId: "counters" });
    return null;
  },
});

/** Idempotent when run on its own; run it when learners are quiet, since live updates during a run can double count. */
export const rebuildStep = internalMutation({
  args: { phase: v.union(v.literal("clear"), v.literal("progress"), v.literal("needs"), v.literal("activity")), cursor: v.optional(v.string()) },
  handler: async (ctx, { phase, cursor }) => {
    const again = (args: { phase: "clear" | "progress" | "needs" | "activity"; cursor?: string }) =>
      ctx.scheduler.runAfter(0, internal.admin.analytics.rebuildStep, args);

    if (phase === "clear") {
      const rows = await ctx.db.query("analyticsCounters").take(300);
      for (const r of rows) await ctx.db.delete(r._id);
      await again(rows.length === 300 ? { phase: "clear" } : { phase: "progress" });
      return;
    }
    if (phase === "progress") {
      const page = await ctx.db.query("learningProgress").paginate({ numItems: 100, cursor: cursor ?? null });
      for (const r of page.page) await applyProgressDelta(ctx, r.programId, null, r, r._creationTime);
      await again(page.isDone ? { phase: "needs" } : { phase: "progress", cursor: page.continueCursor });
      return;
    }
    if (phase === "needs") {
      const page = await ctx.db.query("assessmentResults").paginate({ numItems: 100, cursor: cursor ?? null });
      for (const r of page.page) await countNeedsAnswers(ctx, r.responses);
      await again(page.isDone ? { phase: "activity" } : { phase: "needs", cursor: page.continueCursor });
      return;
    }
    const since = addDays(eatDateKey(Date.now()), -REBUILD_DAYS);
    const page = await ctx.db
      .query("activityLog")
      .withIndex("by_date_and_type", (q) => q.gte("date", since))
      .paginate({ numItems: 500, cursor: cursor ?? null });
    const tally = new Map<string, number>();
    for (const r of page.page) {
      if (r.source === "restored") continue;
      const key = `d:${r.date}:${r.type}`;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    for (const [key, n] of tally) await bump(ctx, key, n);
    if (!page.isDone) await again({ phase: "activity", cursor: page.continueCursor });
  },
});
