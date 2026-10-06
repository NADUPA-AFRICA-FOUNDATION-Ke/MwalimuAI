import { PROGRAMS, type Program } from "../../lib/learning-paths-data";
import { ANSWER_KEY } from "../../lib/learning-paths-answers";

/**
 * The bundled curriculum as the SERVER sees it: the browser-safe programs with the answer key merged back in.
 * Only convex/ code may use this; the learner app imports PROGRAMS, which has no correct answers or explanations.
 */
const merge = (programId: string, kind: "pre" | "post", qs: Program["preAssessment"]) =>
  qs.map((q) => {
    const k = ANSWER_KEY[programId]?.[kind]?.find((a) => a.id === q.id);
    if (!k) throw new Error(`No answer key for ${programId} ${kind} ${q.id}`);
    return { ...q, correct: k.correct, explanation: k.explanation };
  });

export type ServerQuestion = Program["preAssessment"][number] & { correct: 0 | 1 | 2 | 3; explanation: string };
export type ServerProgram = Omit<Program, "preAssessment" | "postAssessment"> & { preAssessment: ServerQuestion[]; postAssessment: ServerQuestion[] };

export const STATIC_PROGRAMS: ServerProgram[] = PROGRAMS.map((p) => ({
  ...p,
  preAssessment: merge(p.id, "pre", p.preAssessment),
  postAssessment: merge(p.id, "post", p.postAssessment),
})) as ServerProgram[];
