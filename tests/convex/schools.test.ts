import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { addActivity, days, makeLearner, makeStaff, newTest } from "./helpers";

const REASON = "Pilot school agreed with the county office";

describe("schools", () => {
  it("a head teacher sees only learning progress of teachers who joined, and leaving ends that at once", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "support_agent");
    const head = await makeLearner(t, { name: "Head Teacher" });
    const a = await makeLearner(t, { name: "Teacher A" });
    const b = await makeLearner(t, { name: "Teacher B" });
    const outsider = await makeLearner(t, { name: "Not in school" });
    await admin.as.mutation(api.admin.schools.create, { name: "Moi Primary", county: "Nakuru", headEmail: head.email, reason: REASON });

    const state = await head.as.query(api.schools.mine, {});
    expect(state.state).toBe("head");
    const code = (state as { school: { code: string } }).school.code;
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);

    // Teachers join with the code (lower case and spaces are fine); bad codes are refused.
    await expect(a.as.mutation(api.schools.join, { code: "ZZZZZZZZ" })).rejects.toThrow(/did not match/);
    await a.as.mutation(api.schools.join, { code: ` ${code.toLowerCase()} ` });
    await b.as.mutation(api.schools.join, { code });
    await expect(a.as.mutation(api.schools.join, { code })).rejects.toThrow(/already in a school/);

    await addActivity(t, a.profileId, [days(0), days(1), days(2)]);
    await a.as.mutation(api.learningProgress.save, { programId: "cbc-foundations", progress: { completedLessons: ["m1/l1", "m1/l2"], reflections: { "m1/l1": "Private thought" }, cohortJoined: false } });
    await t.run(async (ctx) => { await ctx.db.insert("journalEntries", { userId: a.profileId, clientId: "j", entryDate: "2026-10-01", title: "Secret diary", content: "Very private", mood: 3, createdAt: Date.now(), updatedAt: Date.now() }); });

    const roster = await head.as.query(api.schools.roster, { paginationOpts: { numItems: 25, cursor: null } });
    const names = roster.page.map((r) => r.name).sort();
    expect(names).toEqual(["Head Teacher", "Teacher A", "Teacher B"]);
    const ta = roster.page.find((r) => r.name === "Teacher A")!;
    expect(ta).toMatchObject({ lessonsCompleted: 2, programsStarted: 1, streak: 3, role: "teacher" });
    // Nothing private leaks into what the head receives.
    expect(JSON.stringify(roster)).not.toMatch(/Private thought|Secret diary|Very private|email/);

    const sum = await head.as.query(api.schools.summary, {});
    expect(sum).toMatchObject({ members: 3, teachers: 2, activeLast7Days: 1, lessonsCompleted: 2 });
    expect(sum.programs[0]).toMatchObject({ programId: "cbc-foundations", started: 1 });

    // Not a head: no access. Leaving removes the teacher from the view straight away.
    await expect(a.as.query(api.schools.roster, { paginationOpts: { numItems: 5, cursor: null } })).rejects.toThrow(/head teacher/);
    await expect(outsider.as.query(api.schools.summary, {})).rejects.toThrow(/head teacher/);
    await a.as.mutation(api.schools.leave, {});
    expect((await head.as.query(api.schools.summary, {})).members).toBe(2);
    await head.as.mutation(api.schools.removeMember, { profileId: b.profileId });
    expect((await head.as.query(api.schools.summary, {})).members).toBe(1);
    await expect(head.as.mutation(api.schools.leave, {})).rejects.toThrow(/cannot leave/);
  });

  it("creating a school needs the School plan, a head can rotate the code, and staff can archive", async () => {
    const t = newTest();
    const staff = await makeStaff(t, "super_admin");
    const payer = await makeLearner(t);
    const free = await makeLearner(t);
    await expect(free.as.mutation(api.schools.create, { name: "Free School" })).rejects.toThrow(/School plan/);
    await t.run(async (ctx) => { await ctx.db.insert("subscriptions", { userId: payer.profileId, plan: "school", status: "active", createdAt: Date.now(), updatedAt: Date.now() }); });
    expect((await payer.as.query(api.schools.mine, {})).canCreate).toBe(true);
    const id = await payer.as.mutation(api.schools.create, { name: "Paid Academy", county: "Kisumu" });
    const first = ((await payer.as.query(api.schools.mine, {})) as { school: { code: string } }).school.code;
    const second = await payer.as.mutation(api.schools.regenerateCode, {});
    expect(second).not.toBe(first);

    const joiner = await makeLearner(t);
    await expect(joiner.as.mutation(api.schools.join, { code: first })).rejects.toThrow(/did not match/); // the old code stopped working
    await joiner.as.mutation(api.schools.join, { code: second });

    const list = await staff.as.query(api.admin.schools.list, {});
    expect(list[0]).toMatchObject({ name: "Paid Academy", members: 2 });
    await staff.as.mutation(api.admin.schools.archive, { schoolId: id, reason: REASON });
    expect((await joiner.as.query(api.schools.mine, {})).state).toBe("none");
  });
});
