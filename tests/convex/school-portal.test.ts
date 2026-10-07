import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { makeLearner, newTest, type T } from "./helpers";
import { STATIC_PROGRAMS } from "../../convex/lib/staticCurriculum";

const program = STATIC_PROGRAMS.find((p) => p.id === "assessment-for-learning")!;
const mod = program.modules[0];
const moduleLessons = mod.lessons.map((l) => `${mod.id}/${l.id}`);
const rubric = [
  { criterion: "Clear success criteria", levels: ["Below", "Approaching", "Meeting", "Exceeding"] },
  { criterion: "Levels describe observable evidence", levels: ["Below", "Approaching", "Meeting", "Exceeding"] },
];
// Friday 9 October 2026, 17:00 EAT = 14:00 UTC. "Now" is Monday morning that week.
const MONDAY = Date.parse("2026-10-05T06:00:00Z");
const FRIDAY_5PM = Date.parse("2026-10-09T14:00:00Z");
const SATURDAY = Date.parse("2026-10-10T07:00:00Z");

afterEach(() => vi.useRealTimers());

async function setUp(t: T) {
  const principal = await makeLearner(t, { name: "Principal Mwangi" });
  await t.run((ctx) => ctx.db.insert("subscriptions", { userId: principal.profileId, plan: "school", status: "active", createdAt: Date.now(), updatedAt: Date.now() }));
  await principal.as.mutation(api.schools.create, { name: "Kisumu Day Secondary" });
  const code = (await t.run((ctx) => ctx.db.query("schools").first()))!.code;
  const people = { hod: await makeLearner(t, { name: "HOD Achieng" }), amina: await makeLearner(t, { name: "Amina" }), brian: await makeLearner(t, { name: "Brian" }), english: await makeLearner(t, { name: "English Teacher" }) };
  for (const p of Object.values(people)) await p.as.mutation(api.schools.join, { code });
  const maths = await principal.as.mutation(api.schoolPortal.saveDepartment, { name: "Mathematics" });
  const englishDept = await principal.as.mutation(api.schoolPortal.saveDepartment, { name: "English" });
  const staff = await principal.as.query(api.schoolPortal.staff, {});
  const member = (name: string) => staff.find((s) => s.name === name)!.memberId;
  await principal.as.mutation(api.schoolPortal.setMember, { memberId: member("HOD Achieng"), role: "hod", departmentId: maths, canAssign: true });
  await principal.as.mutation(api.schoolPortal.setMember, { memberId: member("Amina"), role: "teacher", departmentId: maths, canAssign: false });
  await principal.as.mutation(api.schoolPortal.setMember, { memberId: member("Brian"), role: "teacher", departmentId: maths, canAssign: false });
  await principal.as.mutation(api.schoolPortal.setMember, { memberId: member("English Teacher"), role: "teacher", departmentId: englishDept, canAssign: false });
  return { principal, ...people, maths, englishDept };
}

describe("My School portal: the acceptance scenario", () => {
  it("assigns a module and a rubric task to Mathematics, blocks a Saturday submission, and reports it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(MONDAY);
    const t = newTest();
    const { principal, hod, amina, brian, english, maths } = await setUp(t);

    const moduleWork = await principal.as.mutation(api.schoolPortal.createAssignment, {
      title: "CBC Assessment Rubrics", description: "Complete the module.", objectives: ["Design a rubric"], skillArea: "Assessment",
      kind: "module", modules: [{ programId: program.id, moduleKey: mod.id }], opensAt: MONDAY, dueAt: FRIDAY_5PM, mandatory: true, graceMinutes: 0, allowResubmit: true,
      audience: { kind: "department", departmentId: maths },
    });
    const task = await principal.as.mutation(api.schoolPortal.createAssignment, {
      title: "Submit a rubric for one strand you teach", description: "Practical task.", objectives: [], skillArea: "Assessment",
      kind: "task", modules: [], taskInstructions: "Upload or type your rubric.", rubric, opensAt: MONDAY, dueAt: FRIDAY_5PM, mandatory: true, graceMinutes: 0, allowResubmit: true,
      audience: { kind: "department", departmentId: maths },
    });
    expect(moduleWork.teachers).toBe(3); // HOD and both maths teachers; not the English teacher
    expect(await english.as.query(api.schoolPortal.myWork, {})).toEqual([]);

    // Amina completes the module during the week and submits the rubric on time.
    await amina.as.mutation(api.learningProgress.save, { programId: program.id, progress: { completedLessons: moduleLessons, reflections: {} } });
    const aminaWork = await amina.as.query(api.schoolPortal.myWork, {});
    expect(aminaWork.find((w) => w.kind === "module")!.status).toBe("submitted");
    const aminaTask = aminaWork.find((w) => w.kind === "task")!;
    await amina.as.mutation(api.schoolPortal.submitTask, { targetId: aminaTask.targetId, text: "Strand: Fractions. Criteria and the four CBC levels are written below for each." });

    // Brian tries on Saturday: refused, and the attempt is recorded.
    vi.setSystemTime(SATURDAY);
    const brianTask = (await brian.as.query(api.schoolPortal.myWork, {})).find((w) => w.kind === "task")!;
    const refused = await brian.as.mutation(api.schoolPortal.submitTask, { targetId: brianTask.targetId, text: "My rubric for measurement, with all four levels." });
    expect(refused).toMatchObject({ ok: false, message: expect.stringContaining("deadline passed") });
    expect((await brian.as.query(api.schoolPortal.myWork, {})).find((w) => w.kind === "task")!.status).toBe("invalid");

    // The HOD reviews Amina's rubric with the rubric levels and feedback.
    const detail = await hod.as.query(api.schoolPortal.assignmentDetail, { id: task.id });
    const aminaRow = detail.rows.find((r) => r.name === "Amina")!;
    await hod.as.mutation(api.schoolPortal.reviewSubmission, { submissionId: aminaRow.submission!._id, levels: [4, 3], feedback: "Clear criteria. Make level 2 more observable.", allowResubmit: false });
    const item = await amina.as.query(api.schoolPortal.myWorkItem, { targetId: aminaTask.targetId });
    expect(item.status).toBe("reviewed");
    expect(item.submissions[0].review?.feedback).toContain("Clear criteria");
    expect(item.rating).toBe(3.5);
    expect(detail.rows.find((r) => r.name === "Brian")!.blockedAttempts.length).toBe(1);

    // The principal's overview.
    const o = await principal.as.query(api.schoolPortal.overview, { departmentId: maths });
    expect(o.overdue).toBeGreaterThanOrEqual(2); // Brian missed both; the HOD did nothing
    expect(o.completionRate).toBe(Math.round((2 / 6) * 100));
    expect(o.teachers[0].overdue).toBe(2);
    expect(o.skills[0]).toMatchObject({ skill: "Assessment" });
    // Notifications: managers heard about the submission and the blocked attempt.
    const principalNotes = await t.run((ctx) => ctx.db.query("notifications").withIndex("by_user_and_created_at", (q) => q.eq("userId", principal.profileId)).collect());
    expect(principalNotes.map((n) => n.title).join("|")).toMatch(/Amina submitted/);
    expect(principalNotes.map((n) => n.title).join("|")).toMatch(/Brian tried to submit/);
  });
});

describe("My School portal: permissions", () => {
  it("keeps an HOD to their department and plain teachers out of management", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(MONDAY);
    const t = newTest();
    const { hod, amina, english, maths } = await setUp(t);
    await expect(hod.as.mutation(api.schoolPortal.createAssignment, {
      title: "Whole school task", description: "", objectives: [], skillArea: "Assessment", kind: "module", modules: [{ programId: program.id, moduleKey: mod.id }],
      opensAt: MONDAY, dueAt: FRIDAY_5PM, mandatory: false, graceMinutes: 0, allowResubmit: false, audience: { kind: "all" },
    })).rejects.toThrow(/own department/);
    const englishMember = (await t.run((ctx) => ctx.db.query("schoolMembers").collect())).find((m) => m.profileId === english.profileId)!;
    await expect(hod.as.mutation(api.schoolPortal.createAssignment, {
      title: "Sneaky", description: "", objectives: [], skillArea: "Assessment", kind: "module", modules: [{ programId: program.id, moduleKey: mod.id }],
      opensAt: MONDAY, dueAt: FRIDAY_5PM, mandatory: false, graceMinutes: 0, allowResubmit: false, audience: { kind: "teachers", profileIds: [englishMember.profileId] },
    })).rejects.toThrow(/teachers you manage/);
    expect((await hod.as.query(api.schoolPortal.staff, {})).every((s) => s.department?._id === maths)).toBe(true);
    await expect(amina.as.query(api.schoolPortal.staff, {})).rejects.toThrow(/principal/);
    await expect(amina.as.mutation(api.schoolPortal.saveDepartment, { name: "Science" })).rejects.toThrow();
    await expect(hod.as.mutation(api.schoolPortal.saveDepartment, { name: "Science" })).rejects.toThrow(/Only the principal/);
  });

  it("logs extensions with a reason, lets the teacher submit within them, and reminds 48h and 24h before", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(MONDAY);
    const t = newTest();
    const { principal, brian, maths } = await setUp(t);
    const task = await principal.as.mutation(api.schoolPortal.createAssignment, {
      title: "Scheme of work", description: "", objectives: [], skillArea: "Planning", kind: "task", modules: [], taskInstructions: "Upload your scheme of work.", rubric,
      opensAt: MONDAY, dueAt: FRIDAY_5PM, mandatory: true, graceMinutes: 0, allowResubmit: false, audience: { kind: "department", departmentId: maths },
    });
    vi.setSystemTime(FRIDAY_5PM - 40 * 3_600_000);
    await t.mutation(internal.schoolPortal.remind, {});
    vi.setSystemTime(FRIDAY_5PM - 20 * 3_600_000);
    await t.mutation(internal.schoolPortal.remind, {});
    await t.mutation(internal.schoolPortal.remind, {}); // no duplicates
    const brianNotes = await t.run((ctx) => ctx.db.query("notifications").withIndex("by_user_and_created_at", (q) => q.eq("userId", brian.profileId)).collect());
    expect(brianNotes.filter((n) => /Due in/.test(n.title)).map((n) => n.title)).toEqual(["Due in 2 days: Scheme of work", "Due in 24 hours: Scheme of work"]);

    vi.setSystemTime(SATURDAY);
    const target = (await t.run((ctx) => ctx.db.query("assignmentTargets").collect())).find((x) => x.assignmentId === task.id && x.profileId === brian.profileId)!;
    await expect(principal.as.mutation(api.schoolPortal.grantExtension, { targetId: target._id, until: SATURDAY + 86_400_000, reason: "x" })).rejects.toThrow(/reason/);
    await principal.as.mutation(api.schoolPortal.grantExtension, { targetId: target._id, until: SATURDAY + 86_400_000, reason: "Was ill on Friday, note seen" });
    await brian.as.mutation(api.schoolPortal.submitTask, { targetId: target._id, text: "My scheme of work for Term 3, weeks 1 to 10." });
    const after = (await t.run((ctx) => ctx.db.get(target._id)))!;
    expect(after).toMatchObject({ status: "submitted", late: false });
    const log = await principal.as.query(api.schoolPortal.schoolLog, {});
    expect(log.some((l) => l.action === "assignment.extension" && /ill on Friday/.test(l.detail ?? ""))).toBe(true);
  });
});
