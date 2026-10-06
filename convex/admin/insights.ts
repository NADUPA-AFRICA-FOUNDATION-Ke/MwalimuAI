import { v } from "convex/values";
import { staffQuery } from "../lib/staff";
import { readCounters } from "../lib/analytics";
import { assembleProgram } from "../lib/contentRead";
import { NEEDS_QUESTIONS } from "../../lib/needs-assessment-data";
import type { AssessmentData } from "../lib/contentValidation";
import { STATIC_PROGRAMS as PROGRAMS } from "../lib/staticCurriculum";

/** Below this many learners a percentage is noise, so nothing is flagged. */
const MIN_SAMPLE = 20;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * What learners' behaviour says about a path: where they drop off, and how each quiz question performs
 * (difficulty and which wrong answers attract people: classical item analysis). Counters only, never a scan.
 */
export const forProgram = staffQuery({
  permission: "analytics.read",
  args: { programKey: v.string() },
  handler: async (ctx, { programKey }) => {
    const item = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) => q.eq("programKey", programKey).eq("kind", "program").eq("key", programKey))
      .first();
    const live = item?.publishedVersionId ? await assembleProgram(ctx, item, "published", true) : null;
    const program = live ?? (PROGRAMS.find((p) => p.id === programKey) as unknown as typeof live) ?? null;
    if (!program) return { live: false as const, minSample: MIN_SAMPLE };

    const base = (s: string) => `p:${programKey}:${s}`;
    const lessonKeys = program.modules.flatMap((m) => m.lessons.map((l) => ({ key: `${m.id}/${l.id}`, title: l.title, module: m.title })));
    const quizIdx = (kind: "pre" | "post", n: number) => Array.from({ length: n }, (_, i) => [0, 1, 2, 3].map((a) => base(`qa:${kind}:${i}:${a}`))).flat();
    const counters = await readCounters(ctx, [
      base("enrolled"), base("pre"), base("post"),
      ...lessonKeys.map((l) => base(`l:${l.key}`)),
      ...quizIdx("pre", program.preAssessment.length),
      ...quizIdx("post", program.postAssessment.length),
    ]);
    const get = (k: string) => counters.get(k) ?? 0;
    const enrolled = get(base("enrolled"));

    const pcts = lessonKeys.map((l) => (enrolled > 0 ? (get(base(`l:${l.key}`)) / enrolled) * 100 : 0));
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    const lessons = lessonKeys.map((l, i) => {
      const flags: string[] = [];
      if (enrolled >= MIN_SAMPLE) {
        if (pcts[i] < avg * 0.7) flags.push("low_completion");
        if (i > 0 && pcts[i - 1] - pcts[i] >= 20) flags.push("big_drop");
      }
      return { ...l, completions: get(base(`l:${l.key}`)), pct: round1(pcts[i]), flags };
    });

    const quiz = (kind: "pre" | "post") =>
      (kind === "pre" ? program.preAssessment : program.postAssessment).map((q, i) => {
        const counts = [0, 1, 2, 3].map((a) => get(base(`qa:${kind}:${i}:${a}`)));
        const taken = counts.reduce((a, b) => a + b, 0);
        const correct = counts[q.correct] ?? 0;
        const pctCorrect = taken > 0 ? (correct / taken) * 100 : 0;
        const flags: string[] = [];
        if (taken >= MIN_SAMPLE) {
          if (pctCorrect >= 95) flags.push("too_easy");
          if (pctCorrect <= 30) flags.push("too_hard");
          const topWrong = Math.max(...counts.filter((_, a) => a !== q.correct));
          if (topWrong > correct) flags.push("wrong_option_popular");
        }
        return {
          index: i,
          question: q.question,
          correct: q.correct,
          taken,
          pctCorrect: round1(pctCorrect),
          share: counts.map((c) => (taken > 0 ? round1((c / taken) * 100) : 0)),
          flags,
        };
      });

    return {
      live: true as const,
      minSample: MIN_SAMPLE,
      enrolled,
      avgLessonCompletion: round1(avg),
      lessons,
      pre: quiz("pre"),
      post: quiz("post"),
    };
  },
});

/** What teachers told the needs assessment they want and struggle with. */
export const demand = staffQuery({
  permission: "analytics.read",
  args: {},
  handler: async (ctx) => {
    const item = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) => q.eq("programKey", "needs-assessment").eq("kind", "assessment").eq("key", "needs-assessment"))
      .first();
    const version = item?.publishedVersionId ? await ctx.db.get(item.publishedVersionId) : null;
    const cms = version ? (version.data as AssessmentData) : null;
    const questions = cms
      ? cms.questions.map((q) => ({ id: q.id, text: q.question, type: q.type, options: q.options }))
      : NEEDS_QUESTIONS.map((q) => ({ id: q.id, text: q.question, type: q.type, options: "options" in q ? q.options : [] }));
    const choice = questions.filter((q) => q.type === "radio" || q.type === "multiple");
    const counters = await readCounters(ctx, ["na:_total", ...choice.flatMap((q) => q.options.map((o) => `na:${q.id}:${o.slice(0, 100)}`))]);
    const total = counters.get("na:_total") ?? 0;
    return {
      total,
      minSample: MIN_SAMPLE,
      questions: choice.map((q) => ({
        id: q.id,
        question: q.text,
        options: q.options
          .map((o) => {
            const n = counters.get(`na:${q.id}:${o.slice(0, 100)}`) ?? 0;
            return { text: o, count: n, pct: total > 0 ? round1((n / total) * 100) : 0 };
          })
          .sort((a, b) => b.count - a.count),
      })),
    };
  },
});
