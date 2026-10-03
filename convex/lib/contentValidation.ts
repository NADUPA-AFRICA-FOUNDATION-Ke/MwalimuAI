/**
 * Content validation: what a lesson, module, quiz or program must look like to be saved (lenient)
 * or to go live (`assertPublishable`). No database access here; see contentRead.ts for reading.
 */
import { canonicalCounty, canonicalLevel, canonicalSubject } from "./taxonomy";
import { fail } from "./errors";

export type ContentKind = "program" | "module" | "lesson" | "quiz";
export type Tags = { cbcLevels: string[]; subjects: string[]; counties: string[] };

export type QuizQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
};
export type Track = "core" | "stem" | "languages" | "humanities" | "leadership" | "wellbeing";

// The shape stored in cmsVersions.data for each kind (validated on every write).
type Common = { orderIndex: number; tags: Tags };
export type LessonData = Common & {
  title: string;
  duration: string;
  videoTitle: string;
  videoPoints: string[];
  reading: string;
  reflectionPrompt: string;
  reflectionPlaceholder: string;
};
export type ModuleData = Common & { title: string; description: string };
export type QuizData = Common & { kind: "pre" | "post"; questions: QuizQuestion[] };
export type ProgramData = Common & {
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  track: Track;
  kicdAlignment: string;
  hours: number;
  accent: "primary" | "accent";
  available: boolean;
  launchingSoon: boolean;
  assignment: { title: string; context: string; task: string; hints: string[]; rubric: string[] };
  certificate: { subtitle: string; skills: string[] };
};
export type ItemData = { lesson: LessonData; module: ModuleData; quiz: QuizData; program: ProgramData };

const bad = (message: string) => fail("INVALID_CONTENT", message);
const str = (v: unknown, field: string, max: number, allowEmpty = false) => {
  if (typeof v !== "string" || (!allowEmpty && v.trim().length === 0) || v.length > max)
    throw bad(`${field} must be ${allowEmpty ? "" : "non-empty "}text up to ${max} characters`);
  return v;
};
const strList = (v: unknown, field: string, maxItems: number, maxLen: number) => {
  if (!Array.isArray(v) || v.length > maxItems) throw bad(`${field} must be a list of at most ${maxItems} items`);
  return v.map((x, i) => str(x, `${field}[${i + 1}]`, maxLen));
};
const order = (v: unknown) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 10_000)
    throw bad("orderIndex must be a whole number");
  return v;
};

export function normalizeTags(raw: unknown): Tags {
  const t = (raw ?? {}) as Partial<Tags>;
  const clean = (vals: unknown, f: (s: string) => string | undefined, label: string) => [
    ...new Set(
      (Array.isArray(vals) ? vals : []).map((x) => {
        const c = typeof x === "string" ? f(x) : undefined;
        if (!c) throw bad(`Unknown ${label}: ${String(x)}`);
        return c;
      }),
    ),
  ];
  return {
    cbcLevels: clean(t.cbcLevels, canonicalLevel, "CBC level"),
    subjects: clean(t.subjects, canonicalSubject, "subject"),
    counties: clean(t.counties, canonicalCounty, "county"),
  };
}

function questions(v: unknown, field: string): QuizQuestion[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > 50) throw bad(`${field} needs between 1 and 50 questions`);
  const ids = new Set<string>();
  return v.map((q, i) => {
    const at = `${field} question ${i + 1}`;
    const id = str(q?.id, `${at} id`, 40);
    if (ids.has(id)) throw bad(`${at} reuses id ${id}`);
    ids.add(id);
    const options = strList(q?.options, `${at} options`, 4, 500);
    if (options.length !== 4) throw bad(`${at} needs exactly 4 options`);
    if (![0, 1, 2, 3].includes(q?.correct)) throw bad(`${at} needs a correct answer (0-3)`);
    return {
      id,
      question: str(q.question, `${at} text`, 1000),
      options: options as QuizQuestion["options"],
      correct: q.correct,
      explanation: str(q.explanation, `${at} explanation`, 2000, true),
    };
  });
}

/**
 * Validates and normalises version data for a kind. Throws INVALID_CONTENT with a readable message.
 * `lenient` lets drafts and imported placeholders be incomplete; publishing re-checks via assertPublishable.
 */
export function validateContent<K extends ContentKind>(kind: K, input: unknown, lenient = false): ItemData[K] {
  return build(kind, input as Record<string, any>, lenient) as ItemData[K];
}

function build(kind: ContentKind, raw: Record<string, any>, lenient: boolean): ItemData[ContentKind] {
  if (!raw || typeof raw !== "object") throw bad("Content is required");
  const tags = normalizeTags(raw.tags);
  if (kind === "lesson") {
    return {
      title: str(raw.title, "title", 200),
      duration: str(raw.duration, "duration", 40),
      videoTitle: str(raw.videoTitle, "videoTitle", 300, true),
      videoPoints: strList(raw.videoPoints ?? [], "videoPoints", 20, 500),
      reading: str(raw.reading, "reading", 60_000),
      reflectionPrompt: str(raw.reflectionPrompt, "reflectionPrompt", 1000, true),
      reflectionPlaceholder: str(raw.reflectionPlaceholder ?? "", "reflectionPlaceholder", 500, true),
      orderIndex: order(raw.orderIndex),
      tags,
    };
  }
  if (kind === "module")
    return {
      title: str(raw.title, "title", 200),
      description: str(raw.description, "description", 2000, true),
      orderIndex: order(raw.orderIndex),
      tags,
    };
  if (kind === "quiz") {
    if (raw.kind !== "pre" && raw.kind !== "post") throw bad("Quiz kind must be pre or post");
    return {
      kind: raw.kind,
      questions: questions(raw.questions, "Quiz"),
      orderIndex: order(raw.orderIndex ?? 0),
      tags,
    };
  }
  const tracks = ["core", "stem", "languages", "humanities", "leadership", "wellbeing"];
  if (!tracks.includes(raw.track)) throw bad("Unknown track");
  const a = raw.assignment ?? {},
    c = raw.certificate ?? {};
  return {
    title: str(raw.title, "title", 200),
    shortTitle: str(raw.shortTitle, "shortTitle", 100),
    tagline: str(raw.tagline, "tagline", 300, true),
    description: str(raw.description, "description", 3000, true),
    track: raw.track,
    kicdAlignment: str(raw.kicdAlignment ?? "", "kicdAlignment", 500, true),
    hours:
      typeof raw.hours === "number" && raw.hours >= 0 && raw.hours <= 500
        ? raw.hours
        : (() => {
            throw bad("hours must be a number");
          })(),
    accent: raw.accent === "accent" ? "accent" : "primary",
    available: raw.available !== false,
    launchingSoon: raw.launchingSoon === true,
    assignment: {
      title: str(a.title, "assignment title", 300, lenient),
      context: str(a.context, "assignment context", 5000, true),
      task: str(a.task, "assignment task", 5000, lenient),
      hints: strList(a.hints ?? [], "assignment hints", 20, 500),
      rubric: strList(a.rubric ?? [], "assignment rubric", 20, 500),
    },
    certificate: {
      subtitle: str(c.subtitle, "certificate subtitle", 300, lenient),
      skills: strList(c.skills ?? [], "certificate skills", 12, 200),
    },
    orderIndex: order(raw.orderIndex),
    tags,
  };
}

/** Display title for any kind (quizzes have none of their own). */
export const titleOf = (data: ItemData[ContentKind]) => ("title" in data ? data.title : `${data.kind} quiz`);

/** Extra rules that only apply when content goes live. */
export function assertPublishable(kind: ContentKind, data: ItemData[ContentKind]) {
  if (kind !== "program") return;
  const p = data as ProgramData;
  if (p.available && !p.launchingSoon) {
    if (!p.assignment.title.trim() || !p.assignment.task.trim())
      throw bad("Add the assignment before publishing an available program");
    if (!p.certificate.subtitle.trim())
      throw bad("Add the certificate subtitle before publishing an available program");
  }
}
