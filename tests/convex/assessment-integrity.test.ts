import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";
import { PROGRAMS } from "../../lib/learning-paths-data";
import { STATIC_PROGRAMS } from "../../convex/lib/staticCurriculum";

const program = STATIC_PROGRAMS.find((p) => p.id === "cbc-foundations")!;
const right = program.postAssessment.map((q) => q.correct);
const wrong = right.map((c) => (c + 1) % 4);

describe("answers never reach the browser", () => {
  it("ships no correct answers or explanations in the learner curriculum", () => {
    for (const p of PROGRAMS) for (const q of [...p.preAssessment, ...p.postAssessment]) {
      expect(q).not.toHaveProperty("correct");
      expect(q).not.toHaveProperty("explanation");
    }
  });

  it("serves published quizzes without answers", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    await admin.as.mutation(api.admin.content.importStaticCurriculum, { reason: "Bring the curriculum under management" });
    const { programs } = await t.query(api.content.publishedPrograms, {});
    for (const p of programs) for (const q of [...p.preAssessment, ...p.postAssessment]) expect(Object.keys(q).sort()).toEqual(["id", "options", "question"]);
  });
});

describe("server marking", () => {
  it("marks on the server and only explains answers once passed", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const failed = await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: wrong });
    expect(failed).toMatchObject({ score: 0, passed: false, review: null });
    const passed = await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: right });
    expect(passed.passed).toBe(true);
    expect(passed.review?.[0]).toMatchObject({ correct: right[0], chosen: right[0], explanation: expect.any(String) });
    // The pre-assessment has no pass mark, so it always explains.
    const pre = await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "pre", answers: program.preAssessment.map(() => 0) });
    expect(pre.review).toHaveLength(program.preAssessment.length);
  });

  it("limits post-assessment attempts per day and rejects malformed answers", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    await expect(learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: [0] })).rejects.toThrow(/Answer every question/);
    for (let i = 0; i < 3; i++) await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: wrong });
    await expect(learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: right })).rejects.toThrow(/several times today/);
  });

  it("ignores assessment scores sent through the general progress save", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    await learner.as.mutation(api.learningProgress.save, { programId: program.id, progress: { completedLessons: [], reflections: {}, postAssessment: { score: 6, total: 6, date: "x", answers: right } } });
    expect((await learner.as.query(api.learningProgress.mine, {}))[0].postAssessment).toBeUndefined();
  });
});

describe("integrity log", () => {
  it("records a sitting, its events and assistive input, without touching the score", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const other = await makeLearner(t);
    const attemptId = await learner.as.mutation(api.assessmentIntegrity.startAttempt, { programId: program.id, kind: "post", assistive: false });
    await learner.as.mutation(api.assessmentIntegrity.logEvents, { attemptId, events: [{ type: "paste", at: Date.now() }, { type: "window_blur", at: Date.now() }, { type: "made_up", at: Date.now() }] });
    await learner.as.mutation(api.assessmentIntegrity.setAssistive, { attemptId });
    await expect(other.as.mutation(api.assessmentIntegrity.logEvents, { attemptId, events: [{ type: "paste", at: Date.now() }] })).rejects.toThrow();
    await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: right, attemptId });
    const [a] = await t.run((ctx) => ctx.db.query("assessmentAttempts").collect());
    expect(a.events.map((e) => e.type)).toEqual(["paste", "window_blur", "assistive_on"]);
    expect(a).toMatchObject({ assistive: true, score: right.length, total: right.length });
  });

  it("shows staff the sittings and their flags", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");
    const attemptId = await learner.as.mutation(api.assessmentIntegrity.startAttempt, { programId: program.id, kind: "post", assistive: false });
    await learner.as.mutation(api.assessmentIntegrity.logEvents, { attemptId, events: [{ type: "devtools_open", at: Date.now() }] });
    const rows = await agent.as.query(api.admin.assessmentIntegrity.forUser, { profileId: learner.profileId });
    expect(rows[0]).toMatchObject({ programId: program.id, kind: "post", flags: { devtools_open: 1 } });
    await expect(learner.as.query(api.admin.assessmentIntegrity.forUser, { profileId: learner.profileId })).rejects.toThrow();
  });
});

describe("console-wide view", () => {
  it("lists flagged sittings from every guarded page and counts them for the dashboard", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");
    const needs = await learner.as.mutation(api.assessmentIntegrity.startAttempt, { programId: "needs-assessment", kind: "needs", assistive: false });
    await learner.as.mutation(api.assessmentIntegrity.logEvents, { attemptId: needs, events: [{ type: "screenshot_key", at: Date.now() }] });
    await learner.as.mutation(api.assessmentIntegrity.startAttempt, { programId: "cbc-foundations", kind: "assignment", assistive: false });
    const flagged = await agent.as.query(api.admin.assessmentIntegrity.recent, { flaggedOnly: true });
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toMatchObject({ kind: "needs", serious: ["screenshot_key"] });
    expect(await agent.as.query(api.admin.assessmentIntegrity.recent, { flaggedOnly: false })).toHaveLength(2);
    expect(await agent.as.query(api.admin.assessmentIntegrity.flaggedCount, {})).toBe(1);
    await expect(learner.as.query(api.admin.assessmentIntegrity.recent, { flaggedOnly: true })).rejects.toThrow();
  });
});
