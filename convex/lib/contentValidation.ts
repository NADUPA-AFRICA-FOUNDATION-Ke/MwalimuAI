/**
 * Content validation: what a lesson, module, quiz or program must look like to be saved (lenient)
 * or to go live (`assertPublishable`). No database access here; see contentRead.ts for reading.
 */
import { canonicalCounty, canonicalLevel, canonicalSubject } from "./taxonomy";
import { fail } from "./errors";

export type ContentKind = "program" | "module" | "lesson" | "quiz" | "assessment" | "resources" | "faq" | "post";
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
/** The needs assessment: sections of questions, plus rules that turn answers into recommended learning paths. */
export type NeedsQuestion = {
  id: string;
  section: number;
  type: "scale" | "radio" | "multiple" | "knowledge";
  question: string;
  subtext: string;
  options: string[];
  correctIndex: number; // knowledge only
  explanation: string; // knowledge only
  minLabel: string; // scale only
  maxLabel: string;
  maxSelect: number; // multiple only; 0 = no limit
};
export type RecommendationRule = { programId: string; when: { questionId: string; answers: string[] }[] };
export type AssessmentData = Common & {
  title: string;
  intro: string;
  sections: { title: string; description: string }[];
  questions: NeedsQuestion[];
  rules: RecommendationRule[];
  fallbackProgramIds: string[];
};
export type ResourceEntry = {
  id: string;
  title: string;
  description: string;
  type: "PDF" | "Video" | "Link" | "Template" | "Audio";
  url: string; // external link; empty when a file is attached or the item is not downloadable yet
  size: string;
  tags: string[];
  free: boolean;
  file?: { storageId: string; name: string };
};
export type ResourcesData = Common & { title: string; items: ResourceEntry[] };
export type FaqData = Common & { title: string; sections: { title: string; items: { q: string; a: string }[] }[] };
export type PostData = Common & {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorRole: string;
  category: string;
  readTime: string;
  date: string;
  image: string;
};
export type ItemData = {
  lesson: LessonData;
  module: ModuleData;
  quiz: QuizData;
  program: ProgramData;
  assessment: AssessmentData;
  resources: ResourcesData;
  faq: FaqData;
  post: PostData;
};

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

function questions(v: unknown, field: string, lenient: boolean): QuizQuestion[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > 50) throw bad(`${field} needs between 1 and 50 questions`);
  const ids = new Set<string>();
  return v.map((q, i) => {
    const at = `${field} question ${i + 1}`;
    const id = str(q?.id, `${at} id`, 40);
    if (ids.has(id)) throw bad(`${at} reuses id ${id}`);
    ids.add(id);
    // Drafts may keep blank text while being typed; the readiness check (and publishing) require it filled in.
    const options = strListLenient(q?.options, `${at} options`, 4, 500, lenient);
    if (options.length !== 4) throw bad(`${at} needs exactly 4 options`);
    if (![0, 1, 2, 3].includes(q?.correct)) throw bad(`${at} needs a correct answer (0-3)`);
    return {
      id,
      question: str(q.question, `${at} text`, 1000, lenient),
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
  if (kind === "assessment") return buildAssessment(raw, tags, lenient);
  if (kind === "resources") return buildResources(raw, tags, lenient);
  if (kind === "faq") return buildFaq(raw, tags, lenient);
  if (kind === "post") return buildPost(raw, tags, lenient);
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
      questions: questions(raw.questions, "Quiz", lenient),
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

const QUESTION_TYPES = ["scale", "radio", "multiple", "knowledge"] as const;

function buildAssessment(raw: Record<string, any>, tags: Tags, lenient: boolean): AssessmentData {
  if (!Array.isArray(raw.sections) || raw.sections.length < 1 || raw.sections.length > 10)
    throw bad("Use between 1 and 10 sections");
  const sections = raw.sections.map((s: any, i: number) => ({
    title: str(s?.title, `Section ${i + 1} title`, 120, lenient),
    description: str(s?.description ?? "", `Section ${i + 1} description`, 500, true),
  }));
  if (!Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 80)
    throw bad("Use between 1 and 80 questions");
  const ids = new Set<string>();
  const questions: NeedsQuestion[] = raw.questions.map((q: any, i: number) => {
    const at = `Question ${i + 1}`;
    const id = str(q?.id, `${at} id`, 40);
    if (ids.has(id)) throw bad(`${at} reuses id ${id}`);
    ids.add(id);
    if (!QUESTION_TYPES.includes(q?.type)) throw bad(`${at} has an unknown type`);
    if (!Number.isInteger(q.section) || q.section < 0 || q.section >= sections.length)
      throw bad(`${at} is not in a section`);
    const choice = q.type !== "scale";
    const options = choice ? strListLenient(q.options ?? [], `${at} options`, 8, 300, lenient) : [];
    if (choice && options.length < 2) throw bad(`${at} needs at least 2 options`);
    if (q.type === "knowledge" && !(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < options.length))
      throw bad(`${at} needs a correct answer`);
    return {
      id,
      section: q.section,
      type: q.type,
      question: str(q.question, `${at} text`, 500, lenient),
      subtext: str(q.subtext ?? "", `${at} help text`, 500, true),
      options,
      correctIndex: q.type === "knowledge" ? q.correctIndex : 0,
      explanation: q.type === "knowledge" ? str(q.explanation ?? "", `${at} explanation`, 2000, true) : "",
      minLabel: q.type === "scale" ? str(q.minLabel ?? "", `${at} low label`, 60, true) : "",
      maxLabel: q.type === "scale" ? str(q.maxLabel ?? "", `${at} high label`, 60, true) : "",
      maxSelect: q.type === "multiple" && Number.isInteger(q.maxSelect) && q.maxSelect >= 0 && q.maxSelect <= 8 ? q.maxSelect : 0,
    };
  });
  const rules: RecommendationRule[] = (Array.isArray(raw.rules) ? raw.rules : []).slice(0, 40).map((r: any, i: number) => ({
    programId: str(r?.programId, `Rule ${i + 1} program`, 60, lenient),
    when: (Array.isArray(r?.when) ? r.when : []).slice(0, 12).map((w: any) => {
      if (!ids.has(w?.questionId)) throw bad(`Rule ${i + 1} refers to a question that does not exist`);
      return { questionId: w.questionId, answers: strListLenient(w.answers ?? [], `Rule ${i + 1} answers`, 20, 300, lenient) };
    }),
  }));
  return {
    title: str(raw.title, "title", 200),
    intro: str(raw.intro ?? "", "intro", 1000, true),
    sections,
    questions,
    rules,
    fallbackProgramIds: strListLenient(raw.fallbackProgramIds ?? [], "fallback programs", 6, 60, lenient),
    orderIndex: order(raw.orderIndex ?? 0),
    tags,
  };
}

/** Like strList but lets drafts keep blank entries while they are being typed. */
function strListLenient(v: unknown, field: string, maxItems: number, maxLen: number, lenient: boolean) {
  if (!Array.isArray(v) || v.length > maxItems) throw bad(`${field} must be a list of at most ${maxItems} items`);
  return v.map((x, i) => str(x, `${field}[${i + 1}]`, maxLen, lenient));
}

/** What still has to be filled in before a needs assessment can go live. */
export function assessmentProblem(data: AssessmentData): string | null {
  if (data.sections.some((s) => !s.title.trim())) return "Every section needs a title";
  for (const [i, q] of data.questions.entries()) {
    if (!q.question.trim()) return `Question ${i + 1} has no text`;
    if (q.type !== "scale" && q.options.some((o) => !o.trim())) return `Question ${i + 1} has an empty option`;
  }
  if (data.rules.some((r) => !r.programId.trim() || r.when.length === 0 || r.when.some((w) => w.answers.length === 0)))
    return "A recommendation rule is incomplete";
  return null;
}

const RESOURCE_TYPES = ["PDF", "Video", "Link", "Template", "Audio"] as const;
const httpsUrl = (v: unknown, field: string, lenient: boolean) => {
  const u = typeof v === "string" ? v.trim() : "";
  if (u === "") return "";
  if (!/^https:\/\/[^\s]+$/i.test(u) || u.length > 1000) {
    if (lenient && u.length <= 1000) return u; // drafts may hold a half-typed address; readiness rejects it
    throw bad(`${field} must be a web address starting with https://`);
  }
  return u;
};

function buildResources(raw: Record<string, any>, tags: Tags, lenient: boolean): ResourcesData {
  if (!Array.isArray(raw.items) || raw.items.length > 200) throw bad("A resource library holds up to 200 resources");
  const ids = new Set<string>();
  const items: ResourceEntry[] = raw.items.map((r: any, i: number) => {
    const at = `Resource ${i + 1}`;
    const id = str(r?.id, `${at} id`, 40);
    if (ids.has(id)) throw bad(`${at} reuses id ${id}`);
    ids.add(id);
    if (!RESOURCE_TYPES.includes(r?.type)) throw bad(`${at} has an unknown type`);
    const file = r?.file && typeof r.file.storageId === "string" ? { storageId: r.file.storageId.slice(0, 100), name: str(r.file.name ?? "file", `${at} file name`, 200, true) } : undefined;
    return {
      id,
      title: str(r.title, `${at} title`, 200, lenient),
      description: str(r.description ?? "", `${at} description`, 1000, true),
      type: r.type,
      url: httpsUrl(r.url, `${at} link`, lenient),
      size: str(r.size ?? "", `${at} size`, 40, true),
      tags: strListLenient(r.tags ?? [], `${at} tags`, 8, 40, lenient),
      free: r.free !== false,
      ...(file ? { file } : {}),
    };
  });
  return { title: str(raw.title ?? "Resource library", "title", 200), items, orderIndex: order(raw.orderIndex ?? 0), tags };
}

function buildFaq(raw: Record<string, any>, tags: Tags, lenient: boolean): FaqData {
  if (!Array.isArray(raw.sections) || raw.sections.length < 1 || raw.sections.length > 20) throw bad("Use 1 to 20 FAQ sections");
  const sections = raw.sections.map((s: any, i: number) => ({
    title: str(s?.title, `Section ${i + 1} title`, 120, lenient),
    items: (Array.isArray(s?.items) ? s.items : []).slice(0, 60).map((x: any, n: number) => ({
      q: str(x?.q, `Section ${i + 1} question ${n + 1}`, 300, lenient),
      a: str(x?.a, `Section ${i + 1} answer ${n + 1}`, 4000, lenient),
    })),
  }));
  return { title: str(raw.title ?? "FAQ", "title", 200), sections, orderIndex: order(raw.orderIndex ?? 0), tags };
}

function buildPost(raw: Record<string, any>, tags: Tags, lenient: boolean): PostData {
  const image = typeof raw.image === "string" ? raw.image.trim() : "";
  if (image && !/^(\/[\w./-]+|https:\/\/images\.unsplash\.com\/[^\s]+)$/.test(image))
    throw bad("Image must be one of the site pictures or an images.unsplash.com address");
  return {
    title: str(raw.title, "title", 200),
    excerpt: str(raw.excerpt ?? "", "excerpt", 500, true),
    content: str(raw.content ?? "", "content", 100_000, true),
    author: str(raw.author ?? "", "author", 100, true),
    authorRole: str(raw.authorRole ?? "", "author role", 100, true),
    category: str(raw.category ?? "", "category", 60, true),
    readTime: str(raw.readTime ?? "", "read time", 30, true),
    date: str(raw.date ?? "", "date", 40, true),
    image,
    orderIndex: order(raw.orderIndex ?? 0),
    tags,
  };
}

/** What still has to be filled in before these can go live. */
export function resourcesProblem(d: ResourcesData): string | null {
  for (const [i, r] of d.items.entries()) {
    if (!r.title.trim()) return `Resource ${i + 1} has no title`;
    if (r.url && !/^https:\/\/\S+$/i.test(r.url)) return `Resource ${i + 1} has a link that does not start with https://`;
    if (r.free && !r.url && !r.file) return `Resource ${i + 1} is free but has no link or file`;
  }
  return null;
}
export function faqProblem(d: FaqData): string | null {
  if (d.sections.some((s) => !s.title.trim())) return "Every FAQ section needs a title";
  if (d.sections.every((s) => s.items.length === 0)) return "Add at least one question";
  if (d.sections.some((s) => s.items.some((x) => !x.q.trim() || !x.a.trim()))) return "A question or answer is blank";
  return null;
}
export function postProblem(d: PostData): string | null {
  if (!d.excerpt.trim()) return "Write a short summary (excerpt)";
  if (d.content.trim().length < 200) return "The article is too short";
  if (!d.author.trim()) return "Add an author";
  if (!d.category.trim()) return "Choose a category";
  return null;
}
