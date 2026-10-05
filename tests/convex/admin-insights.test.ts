import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";
import { PROGRAMS } from "../../lib/learning-paths-data";

const program = PROGRAMS.find((p) => p.id === "cbc-foundations")!;

describe("author insights", () => {
  it("flags lesson drop-off and poorly performing quiz questions once there is enough data", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const wrongAnswers = program.preAssessment.map((q) => (q.correct + 1) % 4);

    for (let n = 0; n < 22; n++) {
      const learner = await makeLearner(t);
      await learner.as.mutation(api.learningProgress.save, {
        programId: "cbc-foundations",
        progress: {
          completedLessons: n < 5 ? ["m1/l1", "m1/l2"] : ["m1/l1"],
          reflections: {},
          cohortJoined: false,
          preAssessment: { score: 0, total: wrongAnswers.length, date: "2026-10-01", answers: wrongAnswers },
        },
      });
    }

    const i = await author.as.query(api.admin.insights.forProgram, { programKey: "cbc-foundations" });
    if (!i.live) throw new Error("expected a live program");
    expect(i.enrolled).toBe(22);
    const l1 = i.lessons.find((l) => l.key === "m1/l1")!;
    const l2 = i.lessons.find((l) => l.key === "m1/l2")!;
    expect(l1.pct).toBe(100);
    expect(l2.pct).toBeCloseTo(22.7, 0);
    expect(l2.flags).toContain("big_drop");

    const q = i.pre[0];
    expect(q.taken).toBe(22);
    expect(q.pctCorrect).toBe(0);
    expect(q.flags).toEqual(expect.arrayContaining(["too_hard", "wrong_option_popular"]));
    expect(q.share[wrongAnswers[0]]).toBe(100);
  });

  it("does not flag anything on a small sample", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    const learner = await makeLearner(t);
    await learner.as.mutation(api.learningProgress.save, { programId: "cbc-foundations", progress: { completedLessons: ["m1/l1"], reflections: {}, cohortJoined: false } });
    const i = await author.as.query(api.admin.insights.forProgram, { programKey: "cbc-foundations" });
    if (!i.live) throw new Error("expected live");
    expect(i.lessons.every((l) => l.flags.length === 0)).toBe(true);
  });

  it("summarises what teachers say they need, from the needs assessment", async () => {
    const t = newTest();
    const author = await makeStaff(t, "content_manager");
    for (const goals of [["Integrating technology in CBC teaching"], ["Integrating technology in CBC teaching", "Conducting and recording CBA accurately"]]) {
      const learner = await makeLearner(t);
      await learner.as.mutation(api.assessments.save, { responses: { development_goals: goals, teaching_level: "Multiple levels" } });
    }
    const d = await author.as.query(api.admin.insights.demand, {});
    expect(d.total).toBe(2);
    const goals = d.questions.find((q) => q.id === "development_goals")!;
    expect(goals.options[0]).toMatchObject({ text: "Integrating technology in CBC teaching", count: 2, pct: 100 });
  });
});
