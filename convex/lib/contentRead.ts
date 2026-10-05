import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { PROGRAMS } from "../../lib/learning-paths-data";
import type { LessonData, ModuleData, ProgramData, QuizData, QuizQuestion } from "./contentValidation";

/**
 * Reading content back: assembling the item tree into the learner's Program shape, and the
 * program definition the server uses to judge certificate eligibility. CMS content wins;
 * programs not yet imported fall back to the bundled curriculum.
 */
type Ctx = QueryCtx | MutationCtx;

type Lesson = Omit<LessonData, "orderIndex" | "tags">;
/** A program as the learner app consumes it (mirrors lib/learning-paths-data.ts `Program`). */
export type ProgramShape = Omit<ProgramData, "orderIndex"> & {
  id: string;
  lessons: number;
  modules: { id: string; title: string; description: string; lessons: ({ id: string } & Lesson)[] }[];
  preAssessment: QuizQuestion[];
  postAssessment: QuizQuestion[];
};

type Mode = "published" | "draft";
async function chosenVersion(ctx: Ctx, item: Doc<"cmsItems">, mode: Mode) {
  const id = mode === "draft" ? (item.draftVersionId ?? item.publishedVersionId) : item.publishedVersionId;
  return id ? await ctx.db.get(id) : null;
}

const byOrder = (a: Doc<"cmsItems">, b: Doc<"cmsItems">) => a.orderIndex - b.orderIndex;
const children = (ctx: Ctx, parent: Doc<"cmsItems">) =>
  ctx.db
    .query("cmsItems")
    .withIndex("by_parent", (q) => q.eq("parentId", parent._id))
    .take(300)
    .then((rows) => rows.sort(byOrder));
const dataOf = <T>(version: Doc<"cmsVersions">) => version.data as T;

/** Item tree + chosen versions (published, or draft over published) → the learner's Program shape. */
/** Use the Kiswahili copy of a field when there is one, otherwise keep the English. */
const pick = <T>(sw: T | undefined, en: T): T => (typeof sw === "string" ? (sw.trim() ? sw : en) : Array.isArray(sw) ? (sw.length ? sw : en) : (sw ?? en));

export async function assembleProgram(
  ctx: Ctx,
  program: Doc<"cmsItems">,
  mode: Mode,
  includeArchived = false,
  lang: "en" | "sw" = "en",
): Promise<ProgramShape | null> {
  const sw = lang === "sw";
  const visible = (item: Doc<"cmsItems">) => item.archivedAt === undefined || includeArchived;
  const programVersion = await chosenVersion(ctx, program, mode);
  if (!programVersion || !visible(program)) return null;

  const modules: ProgramShape["modules"] = [];
  const quizzes: Partial<Record<"pre" | "post", QuizQuestion[]>> = {};
  for (const child of (await children(ctx, program)).filter(visible)) {
    const version = await chosenVersion(ctx, child, mode);
    if (!version) continue;
    if (child.kind === "quiz") {
      const quiz = dataOf<QuizData>(version);
      quizzes[quiz.kind] = sw && quiz.sw
        ? quiz.questions.map((q, i) => {
            const t = quiz.sw!.questions[i];
            return t && t.question.trim() && t.options.every((o) => o.trim()) ? { ...q, question: t.question, options: t.options, explanation: pick(t.explanation, q.explanation) } : q;
          })
        : quiz.questions;
    } else if (child.kind === "module") {
      const { orderIndex: _o, tags: _t, sw: moduleSw, ...moduleEn } = dataOf<ModuleData>(version);
      const localModule = sw && moduleSw ? { ...moduleEn, title: pick(moduleSw.title, moduleEn.title), description: pick(moduleSw.description, moduleEn.description) } : moduleEn;
      const lessons: ProgramShape["modules"][number]["lessons"] = [];
      for (const lessonItem of (await children(ctx, child)).filter((i) => i.kind === "lesson" && visible(i))) {
        const lessonVersion = await chosenVersion(ctx, lessonItem, mode);
        if (!lessonVersion) continue;
        const { orderIndex: _lo, tags: _lt, sw: lessonSw, ...lessonEn } = dataOf<LessonData>(lessonVersion);
        const lesson = sw && lessonSw
          ? {
              ...lessonEn,
              title: pick(lessonSw.title, lessonEn.title),
              videoTitle: pick(lessonSw.videoTitle, lessonEn.videoTitle),
              videoPoints: pick(lessonSw.videoPoints, lessonEn.videoPoints),
              reading: pick(lessonSw.reading, lessonEn.reading),
              reflectionPrompt: pick(lessonSw.reflectionPrompt, lessonEn.reflectionPrompt),
              reflectionPlaceholder: pick(lessonSw.reflectionPlaceholder, lessonEn.reflectionPlaceholder),
            }
          : lessonEn;
        lessons.push({ id: lessonItem.key, ...lesson });
      }
      modules.push({ id: child.key, ...localModule, lessons });
    }
  }
  const { orderIndex: _o, sw: programSw, ...dataEn } = dataOf<ProgramData>(programVersion);
  const data = sw && programSw
    ? {
        ...dataEn,
        title: pick(programSw.title, dataEn.title),
        shortTitle: pick(programSw.shortTitle, dataEn.shortTitle),
        tagline: pick(programSw.tagline, dataEn.tagline),
        description: pick(programSw.description, dataEn.description),
        assignment: programSw.assignment ? { title: pick(programSw.assignment.title, dataEn.assignment.title), context: pick(programSw.assignment.context, dataEn.assignment.context), task: pick(programSw.assignment.task, dataEn.assignment.task), hints: pick(programSw.assignment.hints, dataEn.assignment.hints), rubric: pick(programSw.assignment.rubric, dataEn.assignment.rubric) } : dataEn.assignment,
        certificate: programSw.certificate ? { subtitle: pick(programSw.certificate.subtitle, dataEn.certificate.subtitle), skills: pick(programSw.certificate.skills, dataEn.certificate.skills) } : dataEn.certificate,
      }
    : dataEn;
  return {
    ...data,
    id: program.key,
    modules,
    lessons: modules.reduce((n, m) => n + m.lessons.length, 0),
    preAssessment: quizzes.pre ?? [],
    postAssessment: quizzes.post ?? [],
  };
}

// ── What the server considers the program definition for certificate eligibility ──

export type ProgramDef = {
  activeLessonKeys: Set<string>; // lessons that count towards completion
  knownLessonKeys: Set<string>; // every lesson ever published, so archived completions are preserved
  preAssessment: { correct: number }[];
  postAssessment: { correct: number }[];
};

function staticProgramDef(programId: string): ProgramDef | null {
  const p = PROGRAMS.find((x) => x.id === programId);
  if (!p) return null;
  const keys = new Set(p.modules.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`)));
  return {
    activeLessonKeys: keys,
    knownLessonKeys: keys,
    preAssessment: p.preAssessment,
    postAssessment: p.postAssessment,
  };
}

/** CMS-managed programs win; anything not yet imported falls back to the static curriculum. */
export async function getProgramDef(ctx: Ctx, programId: string): Promise<ProgramDef | null> {
  const item = await ctx.db
    .query("cmsItems")
    .withIndex("by_program_and_key", (q) => q.eq("programKey", programId).eq("kind", "program").eq("key", programId))
    .first();
  if (!item || !item.publishedVersionId) return staticProgramDef(programId);
  const all = await assembleProgram(ctx, item, "published", true);
  const active = await assembleProgram(ctx, item, "published", false);
  if (!all) return staticProgramDef(programId);
  const keysOf = (p: ProgramShape | null) =>
    new Set(p ? p.modules.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`)) : []);
  return {
    activeLessonKeys: keysOf(active ?? ({ ...all, modules: [] } as ProgramShape)),
    knownLessonKeys: keysOf(all),
    preAssessment: all.preAssessment,
    postAssessment: all.postAssessment,
  };
}

/** Title shown on certificates: CMS published title, else the static curriculum's. */
export async function programTitleFor(ctx: Ctx, programId: string): Promise<string | null> {
  const item = await ctx.db
    .query("cmsItems")
    .withIndex("by_program_and_key", (q) => q.eq("programKey", programId).eq("kind", "program").eq("key", programId))
    .first();
  if (item?.publishedVersionId) {
    const v = await ctx.db.get(item.publishedVersionId);
    if (v) return (v.data as { title: string }).title;
  }
  return PROGRAMS.find((x) => x.id === programId)?.title ?? null;
}
