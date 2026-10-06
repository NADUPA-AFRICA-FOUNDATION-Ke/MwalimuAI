import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";
import { PROGRAMS } from "../../lib/learning-paths-data";
import { STATIC_PROGRAMS } from "../../convex/lib/staticCurriculum";

const REASON = "Reviewed against KICD design, ready to go";
const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(new RegExp(code));
const quiz = (kind: "pre" | "post") => ({
  kind,
  orderIndex: 0,
  questions: [{ id: "q1", question: "2+2?", options: ["1", "2", "3", "4"], correct: 3, explanation: "Arithmetic" }],
});
const programData = (title = "Numeracy Basics") => ({
  title,
  shortTitle: "Numeracy",
  tagline: "t",
  description: "d",
  track: "core",
  kicdAlignment: "KICD",
  hours: 3,
  orderIndex: 0,
  assignment: { title: "A", context: "c", task: "do it", hints: [], rubric: [] },
  certificate: { subtitle: "s", skills: ["x"] },
  tags: { cbcLevels: ["Grade 4"], subjects: ["Mathematics"], counties: ["Kisumu"] },
});
const lessonData = (title = "Lesson One") => ({
  title,
  duration: "10 min",
  videoTitle: "v",
  videoPoints: ["a"],
  reading: "## Hello\nBody",
  reflectionPrompt: "p",
  reflectionPlaceholder: "",
  orderIndex: 0,
});

async function buildLive(t: ReturnType<typeof newTest>) {
  const author = await makeStaff(t, "content_manager");
  const reviewer = await makeStaff(t, "super_admin");
  const publishItem = async (itemId: any) => {
    await author.as.mutation(api.admin.content.submitForReview, { itemId });
    await reviewer.as.mutation(api.admin.content.review, { itemId, decision: "approve", reason: REASON });
    await reviewer.as.mutation(api.admin.content.publish, { itemId, reason: REASON });
  };
  const programId = await author.as.mutation(api.admin.content.createItem, {
    kind: "program",
    key: "numeracy",
    data: programData(),
  });
  const moduleId = await author.as.mutation(api.admin.content.createItem, {
    kind: "module",
    key: "m1",
    parentId: programId,
    data: { title: "Module 1", description: "", orderIndex: 0 },
  });
  const lessonId = await author.as.mutation(api.admin.content.createItem, {
    kind: "lesson",
    key: "l1",
    parentId: moduleId,
    data: lessonData(),
  });
  return { author, reviewer, programId, moduleId, lessonId, publishItem };
}

describe("content workflow", () => {
  it("nothing is visible to learners until reviewed by someone else and published", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const { author, reviewer, programId, moduleId, lessonId } = await buildLive(t);
    expect((await learner.as.query(api.content.publishedPrograms, {})).programs).toHaveLength(0);

    await rejects(author.as.mutation(api.admin.content.publish, { itemId: programId, reason: REASON }), "NOT_APPROVED");
    await author.as.mutation(api.admin.content.submitForReview, { itemId: programId });
    await rejects(
      author.as.mutation(api.admin.content.review, { itemId: programId, decision: "approve", reason: REASON }),
      "SELF_REVIEW",
    );
    await rejects(author.as.mutation(api.admin.content.publish, { itemId: programId, reason: REASON }), "NOT_APPROVED");
    await reviewer.as.mutation(api.admin.content.review, { itemId: programId, decision: "approve", reason: REASON });
    // approved is still not live
    expect((await learner.as.query(api.content.publishedPrograms, {})).programs).toHaveLength(0);
    // children cannot go live before their parent
    await author.as.mutation(api.admin.content.submitForReview, { itemId: lessonId });
    await reviewer.as.mutation(api.admin.content.review, { itemId: lessonId, decision: "approve", reason: REASON });
    await rejects(
      reviewer.as.mutation(api.admin.content.publish, { itemId: lessonId, reason: REASON }),
      "PARENT_NOT_LIVE",
    );
    await reviewer.as.mutation(api.admin.content.publish, { itemId: programId, reason: REASON });
    await author.as.mutation(api.admin.content.submitForReview, { itemId: moduleId });
    await reviewer.as.mutation(api.admin.content.review, { itemId: moduleId, decision: "approve", reason: REASON });
    await reviewer.as.mutation(api.admin.content.publish, { itemId: moduleId, reason: REASON });
    await reviewer.as.mutation(api.admin.content.publish, { itemId: lessonId, reason: REASON });

    const { programs, managedKeys } = await learner.as.query(api.content.publishedPrograms, {});
    expect(managedKeys).toEqual(["numeracy"]);
    expect(programs).toHaveLength(1);
    expect(programs[0]).toMatchObject({
      id: "numeracy",
      lessons: 1,
      tags: { cbcLevels: ["Grade 4"], counties: ["Kisumu"] },
    });
    expect(programs[0].modules[0].lessons[0]).toMatchObject({ id: "l1", title: "Lesson One" });
  });

  it("edits to live content stay private until re-reviewed; rejection sends it back", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const { author, reviewer, lessonId, programId, moduleId, publishItem } = await buildLive(t);
    for (const id of [programId, moduleId, lessonId]) await publishItem(id);

    await author.as.mutation(api.admin.content.saveDraft, {
      itemId: lessonId,
      data: lessonData("Lesson One (revised)"),
    });
    const live = () =>
      learner.as.query(api.content.publishedPrograms, {}).then((r) => r.programs[0].modules[0].lessons[0].title);
    expect(await live()).toBe("Lesson One");
    // staff preview shows the draft; the published preview does not
    const draftView = await author.as.query(api.admin.content.preview, { programKey: "numeracy", mode: "draft" });
    expect(draftView?.modules[0].lessons[0].title).toBe("Lesson One (revised)");
    expect(
      (await author.as.query(api.admin.content.preview, { programKey: "numeracy", mode: "published" }))?.modules[0]
        .lessons[0].title,
    ).toBe("Lesson One");

    await author.as.mutation(api.admin.content.submitForReview, { itemId: lessonId });
    await rejects(
      author.as.mutation(api.admin.content.saveDraft, { itemId: lessonId, data: lessonData("sneaky") }),
      "awaiting review",
    );
    await reviewer.as.mutation(api.admin.content.review, {
      itemId: lessonId,
      decision: "reject",
      reason: "Typo in the reading section",
    });
    expect(await live()).toBe("Lesson One");
    await author.as.mutation(api.admin.content.saveDraft, { itemId: lessonId, data: lessonData("Lesson One v2") });
    await publishItem(lessonId);
    expect(await live()).toBe("Lesson One v2");
    const detail = await author.as.query(api.admin.content.getItem, { itemId: lessonId });
    expect(detail.history.map((h) => h.status)).toEqual(["published", "superseded"]);
  });

  it("validates content and tags, and enforces roles", async () => {
    const t = newTest();
    const viewer = await makeStaff(t, "viewer");
    const support = await makeStaff(t, "support_agent");
    const { author, programId } = await buildLive(t);
    await rejects(
      author.as.mutation(api.admin.content.createItem, {
        kind: "lesson",
        key: "bad",
        parentId: programId,
        data: lessonData(),
      }),
      "belongs under a module",
    );
    await rejects(
      author.as.mutation(api.admin.content.createItem, { kind: "program", key: "numeracy", data: programData() }),
      "ALREADY_EXISTS",
    );
    await rejects(
      author.as.mutation(api.admin.content.createItem, {
        kind: "program",
        key: "p2",
        data: { ...programData(), tags: { cbcLevels: ["Grade 99"] } },
      }),
      "Unknown CBC level",
    );
    await rejects(
      author.as.mutation(api.admin.content.createItem, {
        kind: "program",
        key: "p3",
        data: { ...programData(), tags: { counties: ["Atlantis"] } },
      }),
      "Unknown county",
    );
    const badQuiz = {
      ...quiz("pre"),
      questions: [{ id: "q1", question: "?", options: ["a", "b"], correct: 0, explanation: "" }],
    };
    const prog = await author.as.mutation(api.admin.content.createItem, {
      kind: "program",
      key: "p4",
      data: programData("P4"),
    });
    await rejects(
      author.as.mutation(api.admin.content.createItem, { kind: "quiz", key: "pre", parentId: prog, data: badQuiz }),
      "exactly 4 options",
    );
    await expect(
      author.as.mutation(api.admin.content.createItem, { kind: "quiz", key: "pre", parentId: prog, data: quiz("pre") }),
    ).resolves.toBeTruthy();

    await rejects(
      viewer.as.mutation(api.admin.content.createItem, { kind: "program", key: "p5", data: programData() }),
      "FORBIDDEN",
    );
    await expect(viewer.as.query(api.admin.content.programs, {})).resolves.toHaveLength(2);
    await rejects(support.as.query(api.admin.content.programs, {}), "FORBIDDEN");
    await rejects(author.as.mutation(api.admin.content.importStaticCurriculum, { reason: REASON }), "FORBIDDEN");
  });

  it("archives instead of deleting: archived programs stay readable for learners with progress", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const { author, reviewer, programId, moduleId, lessonId, publishItem } = await buildLive(t);
    for (const id of [programId, moduleId, lessonId]) await publishItem(id);
    await rejects(author.as.mutation(api.admin.content.archive, { itemId: programId, reason: "x" }), "REASON_REQUIRED");
    await reviewer.as.mutation(api.admin.content.archive, { itemId: programId, reason: "Superseded by 2026 edition" });
    const r = await learner.as.query(api.content.publishedPrograms, {});
    expect(r.programs).toHaveLength(0);
    expect(r.archivedPrograms.map((p) => p.id)).toEqual(["numeracy"]); // still resolvable
    expect(r.managedKeys).toEqual(["numeracy"]); // static copy must not reappear
    const items = await t.run(async (ctx) => ctx.db.query("cmsItems").collect());
    expect(items).toHaveLength(3); // nothing was deleted
    await rejects(
      author.as.mutation(api.admin.content.saveDraft, { itemId: programId, data: programData() }),
      "Unarchive",
    );
    await reviewer.as.mutation(api.admin.content.unarchive, { itemId: programId, reason: "Reinstated" });
    expect((await learner.as.query(api.content.publishedPrograms, {})).programs).toHaveLength(1);
  });

  it("imports the static curriculum losslessly, preserving ids, and is idempotent", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const admin = await makeStaff(t, "super_admin");
    const first = await admin.as.mutation(api.admin.content.importStaticCurriculum, { reason: REASON });
    expect(first.created).toBeGreaterThan(100);
    const again = await admin.as.mutation(api.admin.content.importStaticCurriculum, { reason: REASON });
    expect(again).toMatchObject({ created: 0, skipped: PROGRAMS.length });

    const { programs } = await learner.as.query(api.content.publishedPrograms, {});
    expect(programs).toHaveLength(PROGRAMS.length);
    for (const original of PROGRAMS) {
      const copy = programs.find((p) => p.id === original.id)!;
      expect(copy.modules.map((m) => [m.id, m.lessons.map((l) => l.id)])).toEqual(
        original.modules.map((m) => [m.id, m.lessons.map((l) => l.id)]),
      );
      expect(copy.available).toBe(original.available);
      expect(copy.launchingSoon ?? false).toBe(original.launchingSoon ?? false);
      if (original.modules.length)
        expect(copy.modules[0].lessons[0].reading).toBe(original.modules[0].lessons[0].reading);
      expect(copy.postAssessment).toEqual(original.postAssessment);
      expect(copy.lessons).toBe(original.modules.reduce((n, m) => n + m.lessons.length, 0));
    }
  });
});

describe("learner progress against CMS content", () => {
  it("keeps completions of archived lessons and computes eligibility from the live definition", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const admin = await makeStaff(t, "super_admin");
    await admin.as.mutation(api.admin.content.importStaticCurriculum, { reason: REASON });
    const program = PROGRAMS[0];
    const keys = program.modules.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`));
    const reflections = Object.fromEntries(keys.slice(0, 6).map((k) => [k, "I will try this in class."]));
    const answers = STATIC_PROGRAMS[0].postAssessment.map((q) => q.correct);
    await learner.as.mutation(api.learningProgress.save, { programId: program.id, progress: { completedLessons: keys, reflections } });
    // Assessments are marked on the server; a client-sent score is ignored.
    await learner.as.mutation(api.learningProgress.save, { programId: program.id, progress: { completedLessons: keys, reflections, postAssessment: { score: 99, total: 99, date: "d", answers: [] } } });
    expect((await learner.as.query(api.learningProgress.mine, {}))[0].postAssessment).toBeUndefined();
    const marked = await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers });
    expect(marked).toMatchObject({ score: answers.length, total: answers.length, passed: true });
    await learner.as.mutation(api.learningProgress.save, {
      programId: program.id,
      progress: { completedLessons: keys, reflections, certificateSerial: "MW-ABCDE-FGHJK", certificateEarnedAt: "1/1/2026" },
    });
    const [row] = await learner.as.query(api.learningProgress.mine, {});
    expect(row.certificateSerial).toBe("MW-ABCDE-FGHJK"); // genuinely eligible: server recomputed the score from answers
    expect(row.postAssessment).toMatchObject({
      score: program.postAssessment.length,
      total: program.postAssessment.length,
    });
    await expect(
      learner.as.mutation(api.certificates.upsertMine, {
        serial: "MW-ABCDE-FGHJK",
        programId: program.id,
        teacherName: "T",
        programTitle: "ignored",
      }),
    ).resolves.toBeTruthy();
    const cert = (await learner.as.query(api.certificates.mine, {}))[0];
    expect(cert.programTitle).toBe(program.title);
    // clients cannot revoke or delete it
    await learner.as.mutation(api.certificates.removeMine, { programId: program.id });
    expect((await learner.as.query(api.certificates.mine, {}))[0].revokedAt).toBeUndefined();
  });
});
