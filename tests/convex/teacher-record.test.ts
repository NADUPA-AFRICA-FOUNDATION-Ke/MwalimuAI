import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, newTest, type T } from "./helpers";

async function school(t: T, name: string) {
  const head = await makeLearner(t, { name: `Head of ${name}` });
  await t.run((ctx) => ctx.db.insert("subscriptions", { userId: head.profileId, plan: "school", status: "active", createdAt: Date.now(), updatedAt: Date.now() }));
  const id = await head.as.mutation(api.schools.create, { name });
  const code = (await t.run((ctx) => ctx.db.get(id)))!.code;
  return { head, id, code };
}

describe("Portable teacher records", () => {
  it("shows a summary by default, the full record only when shared, and logs every view", async () => {
    const t = newTest();
    const a = await school(t, "Alpha School");
    const teacher = await makeLearner(t, { name: "Wanjiru" });
    await teacher.as.mutation(api.schools.join, { code: a.code });
    await teacher.as.mutation(api.learningProgress.save, { programId: "assessment-for-learning", progress: { completedLessons: ["m1/l1"], reflections: {} } });
    await t.run(async (ctx) => {
      const row = (await ctx.db.query("learningProgress").first())!;
      await ctx.db.patch(row._id, { preAssessment: { score: 3, total: 5, date: "2026-10-01", answers: [] } });
    });

    const summary = await a.head.as.mutation(api.teacherRecord.openTeacher, { profileId: teacher.profileId });
    expect(summary.level).toBe("summary");
    expect(summary.programs[0]).not.toHaveProperty("pre");

    await teacher.as.mutation(api.teacherRecord.setSharing, { level: "full" });
    const full = await a.head.as.mutation(api.teacherRecord.openTeacher, { profileId: teacher.profileId });
    expect(full.programs[0]).toMatchObject({ pre: 60 });

    const mine = await teacher.as.query(api.teacherRecord.mine, {});
    expect(mine.views.map((v) => v.level)).toEqual(["full", "summary"]);
    expect(mine.views[0].viewer).toBe("Head of Alpha School");

    // A teacher in the school cannot open a colleague's record.
    const colleague = await makeLearner(t, { name: "Colleague" });
    await colleague.as.mutation(api.schools.join, { code: a.code });
    await expect(colleague.as.mutation(api.teacherRecord.openTeacher, { profileId: teacher.profileId })).rejects.toThrow();
  });

  it("moves the teacher and their record to a new school when its principal accepts the transfer", async () => {
    const t = newTest();
    const a = await school(t, "Alpha School");
    const b = await school(t, "Beta School");
    const teacher = await makeLearner(t, { name: "Otieno" });
    await teacher.as.mutation(api.schools.join, { code: a.code });

    await teacher.as.mutation(api.teacherRecord.requestTransfer, { code: b.code, message: "Posted by TSC" });
    await expect(teacher.as.mutation(api.teacherRecord.requestTransfer, { code: b.code })).rejects.toThrow(/already/);
    await expect(a.head.as.query(api.teacherRecord.transferInbox, {})).resolves.toEqual([]);
    const inbox = await b.head.as.query(api.teacherRecord.transferInbox, {});
    expect(inbox).toHaveLength(1);
    expect(inbox[0].from).toBe("Alpha School");

    await b.head.as.mutation(api.teacherRecord.decideTransfer, { id: inbox[0]._id, accept: true });
    expect((await teacher.as.query(api.schoolPortal.me, {}))!.schoolName).toBe("Beta School");
    // The old school no longer has access.
    await expect(a.head.as.mutation(api.teacherRecord.openTeacher, { profileId: teacher.profileId })).rejects.toThrow();
    await expect(b.head.as.mutation(api.teacherRecord.openTeacher, { profileId: teacher.profileId })).resolves.toMatchObject({ name: "Otieno" });
    const notes = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notes.some((n) => n.userId === a.head.profileId && n.title.includes("transferred out"))).toBe(true);
  });
});
