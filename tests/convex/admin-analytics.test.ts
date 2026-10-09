import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest, days } from "./helpers";

const REASON = "Quarterly programme review for the funders";
const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(new RegExp(code));

const save = (learner: Awaited<ReturnType<typeof makeLearner>>, completedLessons: string[], extra: Record<string, unknown> = {}) =>
  learner.as.mutation(api.learningProgress.save, {
    programId: "cbc-foundations",
    progress: { completedLessons, reflections: {}, cohortJoined: false, ...extra },
  });

describe("learning analytics", () => {
  it("counts starts and per-lesson completions as learners work, and fixes counts when progress shrinks", async () => {
    const t = newTest();
    const a = await makeLearner(t);
    const b = await makeLearner(t);
    const viewer = await makeStaff(t, "viewer");

    await save(a, ["m1/l1"]);
    await save(a, ["m1/l1", "m1/l2"]);
    await save(b, ["m1/l1"]);

    const o = await viewer.as.query(api.admin.analytics.overview, {});
    const p = o.programs.find((x) => x.id === "cbc-foundations")!;
    expect(p.enrolled).toBe(2);
    expect(p.funnel.find((l) => l.key === "m1/l1")).toMatchObject({ completions: 2, pctOfEnrolled: 100 });
    expect(p.funnel.find((l) => l.key === "m1/l2")).toMatchObject({ completions: 1, pctOfEnrolled: 50 });
    expect(p.completionRate).toBe(0);
    expect(o.totals.enrolments).toBeGreaterThanOrEqual(2);

    // Removing a lesson takes it back off the counter rather than double counting later.
    await save(a, ["m1/l1"]);
    const again = (await viewer.as.query(api.admin.analytics.overview, {})).programs.find((x) => x.id === "cbc-foundations")!;
    expect(again.funnel.find((l) => l.key === "m1/l2")?.completions).toBe(0);
  });

  it("tracks daily active learners from activity", async () => {
    const t = newTest();
    const a = await makeLearner(t);
    const b = await makeLearner(t);
    const viewer = await makeStaff(t, "viewer");
    const today = days(0);
    await a.as.mutation(api.activity.record, { date: today, type: "login" });
    await a.as.mutation(api.activity.record, { date: today, type: "login" }); // same day again: not double counted
    await b.as.mutation(api.activity.record, { date: today, type: "login" });
    await b.as.mutation(api.activity.record, { date: today, type: "lesson" });
    await a.as.mutation(api.activity.record, { date: today, type: "journal" });
    await b.as.mutation(api.activity.record, { date: today, type: "community" });
    await b.as.mutation(api.activity.record, { date: today, type: "tool" });
    const trend = await viewer.as.query(api.admin.analytics.trend, { days: 7 });
    expect(trend.at(-1)).toMatchObject({ date: today, active: 2, lessons: 1, tools: 1, journal: 1, community: 1, assessments: 0 });
    expect(trend).toHaveLength(7);
  });

  it("pages learner rows with progress, filters by county and completion, and enforces roles", async () => {
    const t = newTest();
    const nakuru = await makeLearner(t, { county: "Nakuru", name: "Wanjiru" });
    const kisumu = await makeLearner(t, { county: "Kisumu", name: "Otieno" });
    const support = await makeStaff(t, "support_agent");
    const content = await makeStaff(t, "content_manager");
    await save(nakuru, ["m1/l1", "m1/l2"]);
    await save(kisumu, ["m1/l1"]);

    const page = await support.as.mutation(api.admin.analytics.learners, {
      reason: REASON,
      programId: "cbc-foundations",
      paginationOpts: { numItems: 50, cursor: null },
    });
    expect(page.page).toHaveLength(2);
    const row = page.page.find((r) => r.name === "Wanjiru")!;
    expect(row).toMatchObject({ county: "Nakuru", lessonsCompleted: 2, programTitle: expect.any(String) });
    expect(row.lessonsTotal).toBeGreaterThan(2);
    expect(row.progressPct).toBeGreaterThan(0);

    const nak = await support.as.mutation(api.admin.analytics.learners, {
      reason: REASON,
      programId: "cbc-foundations",
      paginationOpts: { numItems: 50, cursor: null },
      county: "nakuru",
    });
    expect(nak.page.map((r) => r.name)).toEqual(["Wanjiru"]);
    const done = await support.as.mutation(api.admin.analytics.learners, {
      reason: REASON,
      programId: "cbc-foundations",
      paginationOpts: { numItems: 50, cursor: null },
      status: "completed",
    });
    expect(done.page).toHaveLength(0);
    // Every page of learner-level data is audited on the server, whatever the client does afterwards.
    const audited = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audited.filter((a) => a.action === "analytics.export_page")).toHaveLength(3);

    // Aggregates are open to content managers; learner identities are not.
    await expect(content.as.query(api.admin.analytics.overview, {})).resolves.toBeTruthy();
    await rejects(content.as.mutation(api.admin.analytics.learners, { reason: REASON, programId: "cbc-foundations", paginationOpts: { numItems: 5, cursor: null } }), "FORBIDDEN");
    await rejects(content.as.mutation(api.admin.analytics.logExport, { reason: REASON, programs: [], rows: 0 }), "FORBIDDEN");
  });

  it("audits learner-level exports and only a Super Admin can rebuild", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const admin = await makeStaff(t, "super_admin");
    await rejects(support.as.mutation(api.admin.analytics.logExport, { reason: "short", programs: ["x"], rows: 1 }), "REASON_REQUIRED");
    await support.as.mutation(api.admin.analytics.logExport, { reason: REASON, programs: ["cbc-foundations"], rows: 12 });
    const rows = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(rows.some((r) => r.action === "analytics.export" && r.reason === REASON)).toBe(true);
    await rejects(support.as.mutation(api.admin.analytics.rebuild, { reason: REASON }), "FORBIDDEN");
    await expect(admin.as.mutation(api.admin.analytics.rebuild, { reason: REASON })).resolves.toBeNull();
  });

  it("rebuilds the counters from source rows", async () => {
    const t = newTest();
    const a = await makeLearner(t);
    const viewer = await makeStaff(t, "viewer");
    await save(a, ["m1/l1", "m1/l2"]);
    await a.as.mutation(api.activity.record, { date: days(0), type: "login" });
    // Simulate drift, then rebuild every phase directly.
    await t.run(async (ctx) => {
      for (const r of await ctx.db.query("analyticsCounters").collect()) await ctx.db.patch(r._id, { value: 999 });
    });
    await t.mutation(internal.admin.analytics.rebuildStep, { phase: "clear" });
    await t.mutation(internal.admin.analytics.rebuildStep, { phase: "progress" });
    await t.mutation(internal.admin.analytics.rebuildStep, { phase: "activity" });
    const p = (await viewer.as.query(api.admin.analytics.overview, {})).programs.find((x) => x.id === "cbc-foundations")!;
    expect(p.enrolled).toBe(1);
    expect(p.funnel.find((l) => l.key === "m1/l2")?.completions).toBe(1);
    expect((await viewer.as.query(api.admin.analytics.trend, { days: 7 })).at(-1)?.active).toBe(1);
  });
});
