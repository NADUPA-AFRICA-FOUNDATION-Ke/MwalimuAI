import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeStaff, newTest, type T } from "./helpers";

const REASON = "Checked against the KICD design, good to go";

async function scaffold(t: T) {
  const author = await makeStaff(t, "content_manager");
  const reviewer = await makeStaff(t, "super_admin");
  const { programKey, programId } = await author.as.mutation(api.admin.contentBuilder.createProgramFromTemplate, {
    title: "Inclusive Classrooms",
    track: "core",
    description: "How to teach every learner",
    moduleCount: 2,
    lessonsPerModule: 2,
    includeQuizzes: true,
  });
  return { author, reviewer, programKey, programId };
}

/** Replaces the starter text everywhere so the path is genuinely ready to release. */
async function fillIn(t: T, author: Awaited<ReturnType<typeof makeStaff>>, programKey: string) {
  const items = await author.as.query(api.admin.content.itemsForProgram, { programKey });
  for (const i of items) {
    const d = await author.as.query(api.admin.content.getItem, { itemId: i._id });
    const data = { ...(d.draft!.data as Record<string, any>) };
    if (i.kind === "lesson") data.reading = `## ${data.title}\nReal lesson text.`;
    if (i.kind === "quiz")
      data.questions = [{ id: "q1", question: "Which is right?", options: ["a", "b", "c", "d"], correct: 1, explanation: "b" }];
    if (i.kind === "program") {
      data.assignment = { title: "Plan a lesson", context: "", task: "Write a plan", hints: [], rubric: [] };
      data.certificate = { subtitle: "Completed the path", skills: ["Inclusion"] };
    }
    await author.as.mutation(api.admin.content.saveDraft, { itemId: i._id, data });
  }
}

describe("learning path builder", () => {
  it("scaffolds a whole path in one step with automatic keys, and flags placeholders", async () => {
    const t = newTest();
    const { author, programKey } = await scaffold(t);
    expect(programKey).toBe("inclusive-classrooms");
    const items = await author.as.query(api.admin.content.itemsForProgram, { programKey });
    // program + pre + post + 2 modules + 4 lessons
    expect(items).toHaveLength(9);
    expect(items.filter((i) => i.kind === "module").map((i) => i.key).sort()).toEqual(["m1", "m2"]);
    expect(items.filter((i) => i.kind === "lesson").map((i) => i.key).sort()).toEqual(["l1", "l1", "l2", "l2"]);
    expect(items.every((i) => i.draft?.status === "draft")).toBe(true);
    // Placeholder lessons and quizzes are reported, not silently releasable.
    expect(items.find((i) => i.kind === "lesson")!.problem).toMatch(/Write the lesson here/);
    expect(items.find((i) => i.kind === "quiz")!.problem).toMatch(/placeholder/i);

    // Same title again gets its own key.
    const again = await author.as.mutation(api.admin.contentBuilder.createProgramFromTemplate, {
      title: "Inclusive Classrooms", track: "core", moduleCount: 1, lessonsPerModule: 1, includeQuizzes: false,
    });
    expect(again.programKey).toBe("inclusive-classrooms-2");
  });

  it("adds, duplicates and reorders without hand-typed keys", async () => {
    const t = newTest();
    const { author, programKey, programId } = await scaffold(t);
    const items = await author.as.query(api.admin.content.itemsForProgram, { programKey });
    const m1 = items.find((i) => i.kind === "module" && i.key === "m1")!;

    await author.as.mutation(api.admin.contentBuilder.addChild, { parentId: m1._id, kind: "lesson", title: "Extra" });
    await author.as.mutation(api.admin.contentBuilder.addChild, { parentId: programId, kind: "module" });
    const dup = await author.as.mutation(api.admin.contentBuilder.duplicate, { itemId: m1._id });
    expect(dup.items).toBe(1 + 3); // module + its three lessons

    const after = await author.as.query(api.admin.content.itemsForProgram, { programKey });
    const modules = after.filter((i) => i.kind === "module").sort((a, b) => a.orderIndex - b.orderIndex);
    expect(modules.map((m) => m.key)).toEqual(["m1", "m2", "m3", "m4"]);
    expect(modules[3].title).toMatch(/\(copy\)/);

    await author.as.mutation(api.admin.contentBuilder.reorder, { parentId: programId, orderedIds: [modules[3]._id, modules[0]._id, modules[1]._id, modules[2]._id] });
    const reordered = (await author.as.query(api.admin.content.itemsForProgram, { programKey }))
      .filter((i) => i.kind === "module").sort((a, b) => a.orderIndex - b.orderIndex);
    expect(reordered.map((m) => m.key)).toEqual(["m4", "m1", "m2", "m3"]);

    await expect(author.as.mutation(api.admin.contentBuilder.addChild, { parentId: programId, kind: "quiz", quizKind: "pre" })).rejects.toThrow(/already has/);
  });

  it("releases a path as a unit: submit all, review all (never your own), publish all", async () => {
    const t = newTest();
    const { author, reviewer, programKey } = await scaffold(t);

    // Not ready: placeholders block submission and say why.
    const early = await author.as.mutation(api.admin.contentBuilder.submitProgram, { programKey });
    expect(early.submitted).toBe(0);
    expect(early.skipped.length).toBeGreaterThan(0);
    // Nothing is half locked: the unfinished lessons can still be edited.
    const check = await author.as.query(api.admin.content.itemsForProgram, { programKey });
    expect(check.every((i) => i.draft?.status === "draft")).toBe(true);

    await fillIn(t, author, programKey);
    const sent = await author.as.mutation(api.admin.contentBuilder.submitProgram, { programKey });
    expect(sent).toMatchObject({ submitted: 9, skipped: [] });

    // Four-eyes: the author cannot approve their own submission, even in bulk.
    const own = await author.as.mutation(api.admin.contentBuilder.reviewProgram, { programKey, decision: "approve", reason: REASON });
    expect(own).toEqual({ reviewed: 0, ownWork: 9 });

    const done = await reviewer.as.mutation(api.admin.contentBuilder.reviewProgram, { programKey, decision: "approve", reason: REASON });
    expect(done.reviewed).toBe(9);

    const live = await reviewer.as.mutation(api.admin.contentBuilder.publishProgram, { programKey, reason: REASON });
    expect(live).toMatchObject({ published: 9, skipped: [] });

    const catalogue = await t.query(api.content.publishedPrograms, {});
    const p = catalogue.programs.find((x) => x.id === programKey)!;
    expect(p.modules).toHaveLength(2);
    expect(p.modules[0].lessons).toHaveLength(2);
    expect(p.preAssessment).toHaveLength(1);
    expect(p.lessons).toBe(4);
  });
});

describe("needs assessment in the CMS", () => {
  it("copies the built-in questionnaire, lets staff edit it, and serves the published copy to learners", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const reviewer = await makeStaff(t, "super_admin");

    // Nothing published: learners fall back to the built-in questionnaire.
    expect(await t.query(api.content.needsAssessment, {})).toBeNull();

    const id = await author.as.mutation(api.admin.content.importNeedsAssessment, {});
    await expect(author.as.mutation(api.admin.content.importNeedsAssessment, {})).rejects.toThrow(/already/);
    const detail = await author.as.query(api.admin.content.getItem, { itemId: id });
    const data = detail.draft!.data as any;
    expect(data.questions).toHaveLength(15);
    expect(data.sections).toHaveLength(5);
    expect(data.rules.length).toBeGreaterThan(0);

    // A half-typed draft saves; it just cannot be submitted.
    const draft = { ...data, questions: [...data.questions, { id: "q_new", section: 0, type: "radio", question: "", subtext: "", options: ["", ""], correctIndex: 0, explanation: "", minLabel: "", maxLabel: "", maxSelect: 0 }] };
    await author.as.mutation(api.admin.content.saveDraft, { itemId: id, data: draft });
    await expect(author.as.mutation(api.admin.content.submitForReview, { itemId: id })).rejects.toThrow(/Question 16 has no text/);

    // A rule must point at a real question.
    await expect(
      author.as.mutation(api.admin.content.saveDraft, { itemId: id, data: { ...data, rules: [{ programId: "x", when: [{ questionId: "nope", answers: ["a"] }] }] } }),
    ).rejects.toThrow(/does not exist/);

    // Finish it, release it, and learners now get the edited copy.
    const edited = { ...data, title: "Start here", questions: data.questions.map((q: any, i: number) => (i === 0 ? { ...q, question: "Which level do you teach most?" } : q)) };
    await author.as.mutation(api.admin.content.saveDraft, { itemId: id, data: edited });
    await author.as.mutation(api.admin.content.submitForReview, { itemId: id });
    await reviewer.as.mutation(api.admin.content.review, { itemId: id, decision: "approve", reason: REASON });
    await reviewer.as.mutation(api.admin.content.publish, { itemId: id, reason: REASON });
    const live = await t.query(api.content.needsAssessment, {});
    expect(live?.title).toBe("Start here");
    expect(live?.questions[0].question).toBe("Which level do you teach most?");
  });
});

describe("older Learning Modules library", () => {
  it("becomes short courses that keep the ids learners' saved progress already uses", async () => {
    const { modulesData } = await import("../../lib/modules-data");
    const t = newTest();
    const manager = await makeStaff(t, "content_manager");
    const learner = await (await import("./helpers")).makeLearner(t);
    const m = modulesData[0];
    const first = m.lessons[0];

    // Before: progress under module-N cannot sync (unknown program).
    await expect(
      learner.as.mutation(api.learningProgress.save, { programId: `module-${m.id}`, progress: { completedLessons: [`${m.id}/${first.id}`], reflections: {}, cohortJoined: false } }),
    ).rejects.toThrow(/Unknown program/);

    const r = await manager.as.mutation(api.admin.content.importLegacyModules, {});
    expect(r.created).toBe(modulesData.length);
    await expect(manager.as.mutation(api.admin.content.importLegacyModules, {})).rejects.toThrow(/already/);

    // After: the same device progress now saves, and the course is in the catalogue as a short course.
    await learner.as.mutation(api.learningProgress.save, { programId: `module-${m.id}`, progress: { completedLessons: [`${m.id}/${first.id}`], reflections: {}, cohortJoined: false } });
    const rows = await learner.as.query(api.learningProgress.mine, {});
    expect(rows.find((x) => x.programId === `module-${m.id}`)?.completedLessons).toEqual([`${m.id}/${first.id}`]);
    const cat = await t.query(api.content.publishedPrograms, {});
    const course = cat.programs.find((p) => p.id === `module-${m.id}`)!;
    expect(course).toMatchObject({ shortCourse: true, title: m.title });
    expect(course.modules[0].lessons).toHaveLength(m.lessons.length);

    // Staff can still edit and publish a short course without inventing an assignment or certificate.
    const items = await manager.as.query(api.admin.content.itemsForProgram, { programKey: `module-${m.id}` });
    const prog = items.find((i) => i.kind === "program")!;
    const d = await manager.as.query(api.admin.content.getItem, { itemId: prog._id });
    await manager.as.mutation(api.admin.content.saveDraft, { itemId: prog._id, data: { ...(d.published!.data as object), tagline: "Updated" } });
    await manager.as.mutation(api.admin.content.submitForReview, { itemId: prog._id });
  });
});

describe("version rollback", () => {
  it("makes an old version the new draft, only goes live after review, and respects locks", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const reviewer = await makeStaff(t, "super_admin");
    const id = await author.as.mutation(api.admin.content.createItem, {
      kind: "post", key: "rollback-me",
      data: { title: "Version one", excerpt: "e", content: "x".repeat(300), author: "A", authorRole: "r", category: "Pedagogy", readTime: "1 min", date: "", image: "", orderIndex: 1 },
    });
    const release = async () => {
      await author.as.mutation(api.admin.content.submitForReview, { itemId: id });
      await reviewer.as.mutation(api.admin.content.review, { itemId: id, decision: "approve", reason: REASON });
      await reviewer.as.mutation(api.admin.content.publish, { itemId: id, reason: REASON });
    };
    await release();
    const d1 = await author.as.query(api.admin.content.getItem, { itemId: id });
    const v1 = d1.published!;
    await author.as.mutation(api.admin.content.saveDraft, { itemId: id, data: { ...(v1.data as object), title: "Version two" } });
    await release();
    expect((await t.query(api.content.blogPost, { slug: "rollback-me" }))?.title).toBe("Version two");

    await author.as.mutation(api.admin.content.restoreVersion, { versionId: v1._id, reason: REASON });
    // Learners still see v2 until the restored draft is released.
    expect((await t.query(api.content.blogPost, { slug: "rollback-me" }))?.title).toBe("Version two");
    const d3 = await author.as.query(api.admin.content.getItem, { itemId: id });
    expect((d3.draft!.data as { title: string }).title).toBe("Version one");
    await author.as.mutation(api.admin.content.submitForReview, { itemId: id });
    await expect(author.as.mutation(api.admin.content.restoreVersion, { versionId: v1._id, reason: REASON })).rejects.toThrow(/awaiting review/);
    await reviewer.as.mutation(api.admin.content.review, { itemId: id, decision: "approve", reason: REASON });
    await reviewer.as.mutation(api.admin.content.publish, { itemId: id, reason: REASON });
    expect((await t.query(api.content.blogPost, { slug: "rollback-me" }))?.title).toBe("Version one");
  });
});
