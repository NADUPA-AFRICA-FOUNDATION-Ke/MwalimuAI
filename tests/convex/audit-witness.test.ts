import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";

const REASON = "Checking the integrity of the log";
afterEach(() => vi.unstubAllGlobals());

const checkpoints = (t: ReturnType<typeof newTest>) => t.run((ctx) => ctx.db.query("auditCheckpoints").collect());

describe("audit log witness", () => {
  it("passes on a clean log, advances incrementally, and emails the fingerprint to Super Admins", async () => {
    const sent: { to: string[]; subject: string; text: string }[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => { sent.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); });
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const learner = await makeLearner(t);
    await admin.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school: "A School", reason: REASON });
    await admin.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school: "B School", reason: REASON });

    await t.mutation(internal.auditWitness.check, {});
    let cps = await checkpoints(t);
    expect(cps).toHaveLength(1);
    expect(cps[0]).toMatchObject({ status: "ok", newRows: 2 });

    await admin.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school: "C School", reason: REASON });
    await t.mutation(internal.auditWitness.check, {});
    cps = (await checkpoints(t)).sort((a, b) => a.at - b.at);
    expect(cps[1]).toMatchObject({ status: "ok", newRows: 1 }); // only what is new
    expect((await admin.as.query(api.admin.audit.lastCheckpoint, {}))?.status).toBe("ok");

    await t.action(internal.auditWitness.notify, { status: "ok", rows: 1, headHash: cps[1].headHash });
    expect(sent.at(-1)).toMatchObject({ to: [admin.email], subject: expect.stringMatching(/all good/) });
    expect(sent.at(-1)!.text).toContain(cps[1].headHash);
  });

  it("catches an edited entry on the full check and a deleted checkpoint entry on the daily one", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const learner = await makeLearner(t);
    // Entries a second apart, so "the second entry" is never the one the checkpoint ends on.
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const school of ["A", "B", "C"]) { vi.setSystemTime(Date.now() + 1000); await admin.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school, reason: REASON }); }
    vi.useRealTimers();
    await t.mutation(internal.auditWitness.check, {});

    // Someone quietly edits an old entry's content (without being able to redo every hash after it).
    const rows = await t.run((ctx) => ctx.db.query("auditLog").withIndex("by_created_at").order("asc").collect());
    await t.run((ctx) => ctx.db.patch(rows[1]._id, { after: { school: "tampered" } }));
    await t.mutation(internal.auditWitness.check, { full: true });
    const broken = (await checkpoints(t)).find((c) => c.status === "broken");
    expect(broken?.note).toMatch(/chain breaks/);

    // Or deletes the entry the last checkpoint ended on.
    const t2 = newTest();
    const a2 = await makeStaff(t2, "super_admin");
    const l2 = await makeLearner(t2);
    await a2.as.mutation(api.admin.users.updateProfile, { profileId: l2.profileId, school: "X", reason: REASON });
    await t2.mutation(internal.auditWitness.check, {});
    const head = (await t2.run((ctx) => ctx.db.query("auditLog").withIndex("by_created_at").order("desc").first()))!;
    await t2.run((ctx) => ctx.db.delete(head._id));
    await t2.mutation(internal.auditWitness.check, {});
    expect((await checkpoints(t2)).some((c) => c.status === "broken" && /missing or was changed/.test(c.note ?? ""))).toBe(true);
  });
});

describe("retention", () => {
  it("clears old operational rows and leaves learner content and the audit log alone", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const admin = await makeStaff(t, "super_admin");
    await admin.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school: "S", reason: REASON });
    const old = Date.now() - 400 * 86_400_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("clientErrors", { fingerprint: "old", source: "browser", message: "old error", count: 1, firstSeen: old, lastSeen: old });
      await ctx.db.insert("clientErrors", { fingerprint: "new", source: "browser", message: "new error", count: 1, firstSeen: Date.now(), lastSeen: Date.now() });
      await ctx.db.insert("journalEntries", { userId: learner.profileId, clientId: "j", entryDate: "2025-01-01", title: "t", content: "keep me", mood: 3, createdAt: old, updatedAt: old });
    });
    await t.mutation(internal.retention.sweep, {});
    const left = await t.run(async (ctx) => ({ errors: (await ctx.db.query("clientErrors").collect()).map((e) => e.fingerprint), journal: (await ctx.db.query("journalEntries").collect()).length, audit: (await ctx.db.query("auditLog").collect()).length }));
    expect(left.errors).toEqual(["new"]);
    expect(left.journal).toBe(1);
    expect(left.audit).toBeGreaterThan(0);
    await expect(t.mutation(internal.retention.purgeMigrationRecords, { confirm: "yes" })).rejects.toThrow(/confirmation phrase/);
  });
});
