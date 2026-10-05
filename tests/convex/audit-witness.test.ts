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
    for (const school of ["A", "B", "C"]) await admin.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school, reason: REASON });
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
