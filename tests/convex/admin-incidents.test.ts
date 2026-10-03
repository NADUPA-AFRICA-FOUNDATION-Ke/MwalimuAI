import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { addActivity, days, makeStaff, newTest, type T } from "./helpers";

const REASON = "Platform outage 12-13 Sep, confirmed in INC-77";
const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(new RegExp(code));
const blank = {
  subjects: [],
  grades: [],
  cbcLevel: "beginner" as const,
  lang: "en" as const,
  completed: true,
  a11ySettings: {
    textSize: "normal" as const,
    highContrast: false,
    reduceMotion: false,
    dyslexiaFont: false,
    wideSpacing: false,
  },
  lowBandwidth: false,
  notificationsState: { read: [], dismissed: [] },
  sidebarCollapsed: false,
};
async function manyProfiles(t: T, n: number) {
  return await t.run(async (ctx) => {
    const ids: Id<"profiles">[] = [];
    for (let i = 0; i < n; i++)
      ids.push(
        await ctx.db.insert("profiles", {
          ...blank,
          tokenIdentifier: `t|${i}`,
          authSubject: `a${i}`,
          email: `bulk${i}@x.test`,
          updatedAt: Date.now(),
        }),
      );
    return ids;
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("bulk incident restoration", () => {
  it("previews impact, gates large runs on approval, restores idempotently with per-user audit", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const admin = await makeStaff(t, "super_admin");
    const ids = await manyProfiles(t, 60);
    // everyone was active the day before the window (days(6)); window is days(5)..days(4)
    for (const id of ids) await addActivity(t, id, [days(6)]);
    await addActivity(t, ids[0], [days(5), days(4)]); // fully covered: not affected
    await addActivity(t, ids[1], [days(5)]); // partially covered: only days(4) restored

    const incidentId = await support.as.mutation(api.admin.incidents.create, {
      title: "Sep outage",
      description: "API down",
      windowStart: days(5),
      windowEnd: days(4),
      reason: REASON,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const preview = await support.as.query(api.admin.incidents.get, { incidentId });
    expect(preview).toMatchObject({ candidatesReady: true, candidateCount: 59, needsApproval: true });

    await rejects(
      support.as.mutation(api.admin.incidents.execute, { incidentId, reason: REASON }),
      "APPROVAL_REQUIRED",
    );
    await rejects(support.as.mutation(api.admin.incidents.approve, { incidentId, reason: REASON }), "FORBIDDEN");
    await admin.as.mutation(api.admin.incidents.approve, { incidentId, reason: REASON });
    await support.as.mutation(api.admin.incidents.execute, { incidentId, reason: REASON });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const done = await support.as.query(api.admin.incidents.get, { incidentId });
    expect(done).toMatchObject({ status: "completed", restoredCount: 59, skippedCount: 0 });
    const rows = await t.run(async (ctx) => ctx.db.query("activityLog").collect());
    const restored = rows.filter((r) => r.source === "restored");
    expect(restored).toHaveLength(58 * 2 + 1);
    expect(rows.filter((r) => r.userId === ids[0] && r.source === "restored")).toHaveLength(0);

    const audits = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    const perUser = audits.filter((a) => a.action === "streak.restore" && a.incidentId === incidentId);
    expect(perUser).toHaveLength(59);
    expect(perUser.every((a) => a.actorEmail === support.email && a.reason?.includes("Sep outage"))).toBe(true);
    expect(audits.map((a) => a.action)).toEqual(
      expect.arrayContaining(["incident.create", "incident.approve", "incident.execute", "incident.complete"]),
    );
    expect(
      await admin.as.query(api.admin.audit.verifyChain, { paginationOpts: { numItems: 300, cursor: null } }),
    ).toMatchObject({ ok: true });

    await rejects(support.as.mutation(api.admin.incidents.execute, { incidentId, reason: REASON }), "INVALID_STATE");
  });

  it("small incidents run without approval, and bad windows are rejected", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const ids = await manyProfiles(t, 3);
    for (const id of ids) await addActivity(t, id, [days(4)]);
    await rejects(
      support.as.mutation(api.admin.incidents.create, {
        title: "x",
        description: "",
        windowStart: days(30),
        windowEnd: days(2),
        reason: REASON,
      }),
      "LOOKBACK_EXCEEDED|at most",
    );
    await rejects(
      support.as.mutation(api.admin.incidents.create, {
        title: "x",
        description: "",
        windowStart: days(3),
        windowEnd: days(1),
        reason: "short",
      }),
      "REASON_REQUIRED",
    );
    const incidentId = await support.as.mutation(api.admin.incidents.create, {
      title: "Small",
      description: "",
      windowStart: days(3),
      windowEnd: days(2),
      reason: REASON,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await support.as.mutation(api.admin.incidents.execute, { incidentId, reason: REASON });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await support.as.query(api.admin.incidents.get, { incidentId })).toMatchObject({
      status: "completed",
      restoredCount: 3,
    });
  });

  it("cancelling stops a draft incident from ever running", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const [id] = await manyProfiles(t, 1);
    await addActivity(t, id, [days(4)]);
    const incidentId = await support.as.mutation(api.admin.incidents.create, {
      title: "Oops",
      description: "",
      windowStart: days(3),
      windowEnd: days(2),
      reason: REASON,
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await support.as.mutation(api.admin.incidents.cancel, { incidentId, reason: REASON });
    await rejects(support.as.mutation(api.admin.incidents.execute, { incidentId, reason: REASON }), "INVALID_STATE");
    expect(
      await t.run(
        async (ctx) => (await ctx.db.query("activityLog").collect()).filter((r) => r.source === "restored").length,
      ),
    ).toBe(0);
  });
});
