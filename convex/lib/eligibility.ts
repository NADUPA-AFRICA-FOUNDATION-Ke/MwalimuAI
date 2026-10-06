import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getProgramDef, type ProgramDef } from "./contentRead";

import { CERTIFICATE_PASS_RATIO, MIN_REFLECTIONS_FOR_CERTIFICATE } from "./certificateRules";
export { CERTIFICATE_PASS_RATIO, MIN_REFLECTIONS_FOR_CERTIFICATE };
export const SERIAL_PATTERN = /^MW-[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/;

type Assessment = { score: number; total: number; date: string; answers: number[] };

/** Recompute an assessment from the submitted answers; the client-claimed score is never trusted. */
export function rescoreAssessment(
  questions: { correct: number }[],
  claimed: Assessment | undefined,
): Assessment | undefined {
  if (!claimed || !Array.isArray(claimed.answers) || claimed.answers.length !== questions.length) return undefined;
  const score = claimed.answers.reduce((sum, answer, i) => sum + (answer === questions[i].correct ? 1 : 0), 0);
  return { score, total: questions.length, date: String(claimed.date ?? ""), answers: claimed.answers };
}

export const loadProgramDef = (ctx: QueryCtx | MutationCtx, programId: string) => getProgramDef(ctx, programId);

/** Server-side mirror of lib/learning-progress.ts isProgramComplete, run on recomputed data. */
export function isProgramCompleteServer(
  def: ProgramDef | null,
  progress: {
    completedLessons: string[];
    reflections: Record<string, string>;
    postAssessment?: Assessment;
  },
) {
  if (!def || def.activeLessonKeys.size === 0) return false;
  const completed = new Set(progress.completedLessons.filter((k) => def.activeLessonKeys.has(k)));
  const reflections = Object.values(progress.reflections).filter((r) => r.trim().length > 0).length;
  const post = progress.postAssessment;
  return (
    completed.size >= def.activeLessonKeys.size &&
    reflections >= MIN_REFLECTIONS_FOR_CERTIFICATE &&
    !!post &&
    post.total > 0 &&
    post.score / post.total >= CERTIFICATE_PASS_RATIO
  );
}
