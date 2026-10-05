import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { assertPublishable, assessmentProblem, titleOf, validateContent, type AssessmentData, type ContentKind, type ItemData } from "./contentValidation";
import { fail } from "./errors";

/** Shared write helpers for the content builder: creating items, starter content, and going live. */

export const LESSON_PLACEHOLDER = "Write the lesson here.";
export const QUESTION_PLACEHOLDER = "Question text";

export const emptyTags = { cbcLevels: [], subjects: [], counties: [] };

export const starter = {
  lesson: (title: string, orderIndex: number) => ({
    title,
    duration: "10 min",
    videoTitle: "",
    videoPoints: [],
    reading: `## ${title}\n\n${LESSON_PLACEHOLDER}`,
    reflectionPrompt: "",
    reflectionPlaceholder: "",
    orderIndex,
    tags: emptyTags,
  }),
  module: (title: string, orderIndex: number) => ({ title, description: "", orderIndex, tags: emptyTags }),
  quiz: (kind: "pre" | "post", orderIndex: number) => ({
    kind,
    orderIndex,
    tags: emptyTags,
    questions: [
      {
        id: "q1",
        question: QUESTION_PLACEHOLDER,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct: 0,
        explanation: "",
      },
    ],
  }),
  program: (title: string, track: string, description: string, orderIndex: number) => ({
    title,
    shortTitle: title.slice(0, 60),
    tagline: "",
    description,
    track,
    kicdAlignment: "",
    hours: 1,
    accent: "primary",
    available: true,
    launchingSoon: false,
    orderIndex,
    assignment: { title: "", context: "", task: "", hints: [], rubric: [] },
    certificate: { subtitle: "", skills: [] },
    tags: emptyTags,
  }),
};

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "program";

export async function uniqueProgramKey(ctx: Pick<MutationCtx, "db">, wanted: string) {
  const taken = async (key: string) =>
    Boolean(
      await ctx.db
        .query("cmsItems")
        .withIndex("by_program_and_key", (q) => q.eq("programKey", key).eq("kind", "program").eq("key", key))
        .first(),
    );
  let key = wanted,
    n = 1;
  while (await taken(key)) key = `${wanted.slice(0, 46)}-${++n}`;
  return key;
}

/** m1, m2… for modules and l1, l2… for lessons: the next free key under a parent. */
export async function nextChildKey(ctx: Pick<MutationCtx, "db">, parentId: Id<"cmsItems">, kind: "module" | "lesson") {
  const prefix = kind === "module" ? "m" : "l";
  const siblings = await ctx.db
    .query("cmsItems")
    .withIndex("by_parent", (q) => q.eq("parentId", parentId))
    .take(300);
  let max = 0;
  for (const s of siblings) {
    const m = s.kind === kind ? /^[a-z]+(\d+)$/.exec(s.key) : null;
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

export async function nextOrderIndex(ctx: Pick<MutationCtx, "db">, parentId: Id<"cmsItems">, kind: ContentKind) {
  const siblings = await ctx.db
    .query("cmsItems")
    .withIndex("by_parent", (q) => q.eq("parentId", parentId))
    .take(300);
  return siblings.filter((s) => s.kind === kind).reduce((n, s) => Math.max(n, s.orderIndex + 1), 0);
}

/** Inserts an item with its first draft version. Does not audit; callers log once for the whole action. */
export async function insertItem(
  ctx: Pick<MutationCtx, "db">,
  staffId: Id<"staff">,
  args: { kind: ContentKind; key: string; parent: Doc<"cmsItems"> | null; data: unknown },
) {
  const data = validateContent(args.kind, args.data, true);
  const now = Date.now();
  const programKey = args.parent ? args.parent.programKey : args.key;
  const itemId = await ctx.db.insert("cmsItems", {
    kind: args.kind,
    key: args.key,
    ...(args.parent ? { parentId: args.parent._id } : {}),
    programKey,
    title: titleOf(data),
    orderIndex: data.orderIndex,
    cbcLevels: data.tags.cbcLevels,
    subjects: data.tags.subjects,
    counties: data.tags.counties,
    updatedAt: now,
  });
  const versionId = await ctx.db.insert("cmsVersions", {
    itemId,
    version: 1,
    status: "draft",
    data,
    authorId: staffId,
    createdAt: now,
  });
  await ctx.db.patch(itemId, { draftVersionId: versionId });
  return itemId;
}

/** Placeholder text left in a body must never reach learners. */
export function placeholderProblem(kind: ContentKind, data: ItemData[ContentKind]): string | null {
  if (kind === "assessment") return assessmentProblem(data as AssessmentData);
  if (kind === "lesson" && (data as ItemData["lesson"]).reading.includes(LESSON_PLACEHOLDER))
    return "The lesson text still says “Write the lesson here.”";
  if (kind === "quiz") {
    const q = (data as ItemData["quiz"]).questions;
    if (q.some((x) => !x.question.trim() || x.options.some((o) => !o.trim())))
      return "A quiz question or option is still blank";
    if (q.some((x) => x.question === QUESTION_PLACEHOLDER || x.options.some((o) => /^Option [A-D]$/.test(o))))
      return "The quiz still has placeholder questions or options";
  }
  return null;
}

/** The first reason this working copy cannot go live, or null when it is ready. */
export function readinessProblem(kind: ContentKind, rawData: unknown): string | null {
  try {
    const data = validateContent(kind, rawData, true);
    assertPublishable(kind, data);
    return placeholderProblem(kind, data);
  } catch (e) {
    const m = (e as { data?: { message?: string } }).data?.message;
    return m ?? "This item is not valid yet";
  }
}

/** Makes an approved draft the live version. Parent must already be live. */
export async function publishDraft(ctx: Pick<MutationCtx, "db">, i: Doc<"cmsItems">) {
  const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
  if (!draft || draft.status !== "approved") throw fail("NOT_APPROVED", "Only approved content can be published");
  if (i.archivedAt !== undefined) throw fail("INVALID_STATE", "Unarchive this item first");
  if (i.parentId) {
    const parent = await ctx.db.get(i.parentId);
    if (!parent || !parent.publishedVersionId || parent.archivedAt !== undefined)
      throw fail("PARENT_NOT_LIVE", "Publish the parent first");
  }
  const data = validateContent(i.kind, draft.data, true);
  assertPublishable(i.kind, data);
  const problem = placeholderProblem(i.kind, data);
  if (problem) throw fail("INVALID_CONTENT", problem);
  const before = i.publishedVersionId ? await ctx.db.get(i.publishedVersionId) : null;
  if (before) await ctx.db.patch(before._id, { status: "superseded" });
  const now = Date.now();
  await ctx.db.patch(draft._id, { status: "published", publishedAt: now });
  await ctx.db.patch(i._id, {
    publishedVersionId: draft._id,
    draftVersionId: undefined,
    title: titleOf(data),
    orderIndex: data.orderIndex,
    cbcLevels: data.tags.cbcLevels,
    subjects: data.tags.subjects,
    counties: data.tags.counties,
    updatedAt: now,
  });
  return { before: before ? { version: before.version } : null, after: { version: draft.version } };
}
