import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { staffMutation } from "../lib/staff";
import { roleHasPermission } from "../lib/permissions";
import { fail } from "../lib/errors";
import {
  insertItem,
  nextChildKey,
  nextOrderIndex,
  publishDraft,
  readinessProblem,
  slugify,
  starter,
  uniqueProgramKey,
} from "../lib/contentWrite";

/**
 * Authoring helpers on top of the item model: scaffold a whole learning path in one step, add children
 * without inventing keys, reorder, duplicate, and move a program through review and release as a unit.
 * The four-eyes rule is unchanged; these only save clicks.
 */

const label = (i: Doc<"cmsItems">) => `${i.kind}:${i.programKey}/${i.key}`;
const TRACKS = ["core", "stem", "languages", "humanities", "leadership", "wellbeing"];

async function mustGet(ctx: Pick<MutationCtx, "db">, id: Id<"cmsItems">) {
  const doc = await ctx.db.get(id);
  if (!doc) throw fail("NOT_FOUND", "Content item not found");
  return doc;
}

async function programItems(ctx: Pick<MutationCtx, "db">, programKey: string) {
  const items = await ctx.db
    .query("cmsItems")
    .withIndex("by_program_and_key", (q) => q.eq("programKey", programKey))
    .take(500);
  if (!items.some((i) => i.kind === "program" || i.kind === "assessment")) throw fail("NOT_FOUND", "Program not found");
  const depth = { program: 0, assessment: 0, module: 1, quiz: 1, lesson: 2 } as const;
  // Parents first, then in reading order, so release steps always see a live parent.
  return items.sort((a, b) => depth[a.kind] - depth[b.kind] || a.orderIndex - b.orderIndex);
}

/** A whole learning path in one step: the program, optional pre/post tests, and modules each with starter lessons. */
export const createProgramFromTemplate = staffMutation({
  permission: "content.edit",
  args: {
    title: v.string(),
    track: v.string(),
    description: v.optional(v.string()),
    moduleCount: v.number(),
    lessonsPerModule: v.number(),
    includeQuizzes: v.boolean(),
  },
  handler: async (ctx, args, { staff }, log) => {
    const title = args.title.trim();
    if (title.length < 3 || title.length > 200) throw fail("INVALID_CONTENT", "Give the path a title of 3–200 characters");
    if (!TRACKS.includes(args.track)) throw fail("INVALID_CONTENT", "Unknown track");
    const modules = Math.floor(args.moduleCount),
      perModule = Math.floor(args.lessonsPerModule);
    if (modules < 1 || modules > 12 || perModule < 1 || perModule > 10)
      throw fail("INVALID_CONTENT", "Use 1–12 modules and 1–10 lessons in each");
    const siblings = await ctx.db
      .query("cmsItems")
      .withIndex("by_kind_and_program", (q) => q.eq("kind", "program"))
      .take(300);
    const key = await uniqueProgramKey(ctx, slugify(title));
    const programId = await insertItem(ctx, staff._id, {
      kind: "program",
      key,
      parent: null,
      data: starter.program(title, args.track, args.description?.trim() ?? "", siblings.length),
    });
    const program = await mustGet(ctx, programId);
    let items = 1;
    if (args.includeQuizzes) {
      await insertItem(ctx, staff._id, { kind: "quiz", key: "pre", parent: program, data: starter.quiz("pre", 0) });
      await insertItem(ctx, staff._id, { kind: "quiz", key: "post", parent: program, data: starter.quiz("post", 1) });
      items += 2;
    }
    for (let m = 0; m < modules; m++) {
      const moduleId = await insertItem(ctx, staff._id, {
        kind: "module",
        key: `m${m + 1}`,
        parent: program,
        data: starter.module(`Module ${m + 1}`, m),
      });
      const parent = await mustGet(ctx, moduleId);
      items++;
      for (let l = 0; l < perModule; l++) {
        await insertItem(ctx, staff._id, {
          kind: "lesson",
          key: `l${l + 1}`,
          parent,
          data: starter.lesson(`Lesson ${m + 1}.${l + 1}`, l),
        });
        items++;
      }
    }
    await log({
      action: "content.create_program",
      targetType: "content",
      targetId: programId,
      targetLabel: `program:${key}`,
      after: { title, track: args.track, modules, lessonsPerModule: perModule, includeQuizzes: args.includeQuizzes, items },
    });
    return { programKey: key, programId };
  },
});

/** Adds a module, lesson or quiz with an automatic key and the next position. */
export const addChild = staffMutation({
  permission: "content.edit",
  args: {
    parentId: v.id("cmsItems"),
    kind: v.union(v.literal("module"), v.literal("lesson"), v.literal("quiz")),
    title: v.optional(v.string()),
    quizKind: v.optional(v.union(v.literal("pre"), v.literal("post"))),
  },
  handler: async (ctx, args, { staff }, log) => {
    const parent = await mustGet(ctx, args.parentId);
    const expected = { module: "program", lesson: "module", quiz: "program" } as const;
    if (parent.kind !== expected[args.kind]) throw fail("INVALID_CONTENT", `A ${args.kind} belongs under a ${expected[args.kind]}`);
    if (parent.archivedAt !== undefined) throw fail("INVALID_CONTENT", "The parent is archived");
    const order = await nextOrderIndex(ctx, parent._id, args.kind);
    let key: string, data: unknown;
    if (args.kind === "quiz") {
      const kind = args.quizKind ?? "pre";
      const exists = (await ctx.db.query("cmsItems").withIndex("by_parent", (q) => q.eq("parentId", parent._id)).take(300)).some(
        (s) => s.kind === "quiz" && s.key === kind,
      );
      if (exists) throw fail("ALREADY_EXISTS", `This path already has a ${kind === "pre" ? "pre" : "post"}-assessment`);
      key = kind;
      data = starter.quiz(kind, order);
    } else {
      key = await nextChildKey(ctx, parent._id, args.kind);
      const fallback = args.kind === "module" ? `Module ${order + 1}` : `Lesson ${order + 1}`;
      const title = args.title?.trim() || fallback;
      data = args.kind === "module" ? starter.module(title, order) : starter.lesson(title, order);
    }
    const id = await insertItem(ctx, staff._id, { kind: args.kind, key, parent, data });
    await log({
      action: "content.create",
      targetType: "content",
      targetId: id,
      targetLabel: `${args.kind}:${parent.programKey}/${key}`,
      after: data,
    });
    return id;
  },
});

/** Sets the order of a parent's children. Changing the order of live content needs publish rights. */
export const reorder = staffMutation({
  permission: "content.edit",
  args: { parentId: v.id("cmsItems"), orderedIds: v.array(v.id("cmsItems")) },
  handler: async (ctx, args, { staff }, log) => {
    const parent = await mustGet(ctx, args.parentId);
    const items = await Promise.all(args.orderedIds.map((id) => mustGet(ctx, id)));
    if (items.length === 0) throw fail("NO_CHANGES", "Nothing to reorder");
    const kind = items[0].kind;
    if (items.some((i) => i.parentId !== parent._id || i.kind !== kind)) throw fail("INVALID_CONTENT", "Items must share one parent");
    const live = items.some((i) => i.publishedVersionId !== undefined);
    if (live && !roleHasPermission(staff.role, "content.publish"))
      throw fail("FORBIDDEN", "Reordering live content needs publish rights");
    const before = items.map((i) => ({ key: i.key, order: i.orderIndex }));
    for (const [index, i] of items.entries()) {
      await ctx.db.patch(i._id, { orderIndex: index, updatedAt: Date.now() });
      // Keep versions in step so a later publish does not undo the new order.
      for (const vid of [i.draftVersionId, i.publishedVersionId]) {
        const ver = vid ? await ctx.db.get(vid) : null;
        if (ver) await ctx.db.patch(ver._id, { data: { ...(ver.data as object), orderIndex: index } });
      }
    }
    await log({
      action: "content.reorder",
      targetType: "content",
      targetId: parent._id,
      targetLabel: label(parent),
      before,
      after: items.map((i, index) => ({ key: i.key, order: index })),
    });
    return null;
  },
});

async function copyItem(
  ctx: MutationCtx,
  staffId: Id<"staff">,
  source: Doc<"cmsItems">,
  parent: Doc<"cmsItems"> | null,
  key: string,
  order: number,
  titleSuffix: string,
) {
  const ver = await ctx.db.get((source.draftVersionId ?? source.publishedVersionId)!);
  if (!ver) throw fail("INVALID_STATE", "Nothing to copy");
  const data = { ...(ver.data as Record<string, unknown>), orderIndex: order } as Record<string, unknown>;
  if (typeof data.title === "string") data.title = `${data.title}${titleSuffix}`;
  if (typeof data.shortTitle === "string") data.shortTitle = `${data.shortTitle}${titleSuffix}`.slice(0, 100);
  return insertItem(ctx, staffId, { kind: source.kind, key, parent, data });
}

/** Copies a lesson, a module with its lessons, or a whole learning path, as new drafts. */
export const duplicate = staffMutation({
  permission: "content.edit",
  args: { itemId: v.id("cmsItems") },
  handler: async (ctx, args, { staff }, log) => {
    const source = await mustGet(ctx, args.itemId);
    if (source.kind === "quiz") throw fail("INVALID_CONTENT", "Quizzes cannot be duplicated");
    const kids = (id: Id<"cmsItems">) =>
      ctx.db.query("cmsItems").withIndex("by_parent", (q) => q.eq("parentId", id)).take(300);
    let newId: Id<"cmsItems">, count = 1, programKey = source.programKey;

    if (source.kind === "lesson" || source.kind === "module") {
      const parent = await mustGet(ctx, source.parentId!);
      const key = await nextChildKey(ctx, parent._id, source.kind);
      const order = await nextOrderIndex(ctx, parent._id, source.kind);
      newId = await copyItem(ctx, staff._id, source, parent, key, order, " (copy)");
      if (source.kind === "module") {
        const copy = await mustGet(ctx, newId);
        const lessons = (await kids(source._id)).filter((l) => l.kind === "lesson" && l.archivedAt === undefined).sort((a, b) => a.orderIndex - b.orderIndex);
        for (const [n, l] of lessons.entries()) {
          await copyItem(ctx, staff._id, l, copy, l.key, n, "");
          count++;
        }
      }
    } else {
      programKey = await uniqueProgramKey(ctx, `${source.key.slice(0, 44)}-copy`);
      const siblings = await ctx.db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", "program")).take(300);
      newId = await copyItem(ctx, staff._id, source, null, programKey, siblings.length, " (copy)");
      const copy = await mustGet(ctx, newId);
      for (const child of (await kids(source._id)).filter((c) => c.archivedAt === undefined).sort((a, b) => a.orderIndex - b.orderIndex)) {
        const childCopy = await copyItem(ctx, staff._id, child, copy, child.key, child.orderIndex, "");
        count++;
        if (child.kind === "module") {
          const mc = await mustGet(ctx, childCopy);
          for (const l of (await kids(child._id)).filter((x) => x.kind === "lesson" && x.archivedAt === undefined).sort((a, b) => a.orderIndex - b.orderIndex)) {
            await copyItem(ctx, staff._id, l, mc, l.key, l.orderIndex, "");
            count++;
          }
        }
      }
    }
    await log({
      action: "content.duplicate",
      targetType: "content",
      targetId: source._id,
      targetLabel: label(source),
      after: { newItemId: newId, items: count },
    });
    return { itemId: newId, programKey, items: count };
  },
});

type Skipped = { title: string; why: string };

/**
 * Submits every draft in the program. By default nothing is submitted while any draft is unfinished, so the
 * path is never left half locked for review; `partial` submits just the ready ones.
 */
export const submitProgram = staffMutation({
  permission: "content.edit",
  args: { programKey: v.string(), comment: v.optional(v.string()), partial: v.optional(v.boolean()) },
  handler: async (ctx, args, { staff }, log) => {
    const ready: Doc<"cmsVersions">[] = [];
    const skipped: Skipped[] = [];
    for (const i of await programItems(ctx, args.programKey)) {
      if (i.archivedAt !== undefined || !i.draftVersionId) continue;
      const draft = await ctx.db.get(i.draftVersionId);
      if (!draft || draft.status !== "draft") continue;
      const problem = readinessProblem(i.kind, draft.data);
      if (problem) skipped.push({ title: i.title, why: problem });
      else ready.push(draft);
    }
    const go = skipped.length === 0 || args.partial === true;
    if (go)
      for (const draft of ready)
        await ctx.db.patch(draft._id, { status: "in_review", submittedBy: staff._id, reviewComment: args.comment?.trim() || undefined });
    const submitted = go ? ready.length : 0;
    await log({ action: "content.submit_program", targetType: "content", targetId: args.programKey, targetLabel: `program:${args.programKey}`, after: { submitted, skipped: skipped.length } });
    return { submitted, skipped };
  },
});

/** Approves or rejects everything in review that you did not submit yourself. */
export const reviewProgram = staffMutation({
  permission: "content.review",
  requireReason: true,
  args: { programKey: v.string(), decision: v.union(v.literal("approve"), v.literal("reject")), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    let reviewed = 0,
      ownWork = 0;
    for (const i of await programItems(ctx, args.programKey)) {
      if (!i.draftVersionId) continue;
      const draft = await ctx.db.get(i.draftVersionId);
      if (!draft || draft.status !== "in_review") continue;
      if (draft.submittedBy === staff._id) {
        ownWork++; // four-eyes: never your own submission
        continue;
      }
      await ctx.db.patch(draft._id, { status: args.decision === "approve" ? "approved" : "rejected", reviewedBy: staff._id, reviewComment: args.reason.trim() });
      reviewed++;
    }
    await log({ action: args.decision === "approve" ? "content.approve_program" : "content.reject_program", targetType: "content", targetId: args.programKey, targetLabel: `program:${args.programKey}`, after: { reviewed, skippedOwnWork: ownWork } });
    return { reviewed, ownWork };
  },
});

/** Publishes every approved item, parents first. */
export const publishProgram = staffMutation({
  permission: "content.publish",
  requireReason: true,
  args: { programKey: v.string(), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    let published = 0;
    const skipped: Skipped[] = [];
    for (const i of await programItems(ctx, args.programKey)) {
      if (i.archivedAt !== undefined || !i.draftVersionId) continue;
      const draft = await ctx.db.get(i.draftVersionId);
      if (!draft || draft.status !== "approved") continue;
      try {
        const { before, after } = await publishDraft(ctx, i);
        published++;
        await log({ action: "content.publish", targetType: "content", targetId: i._id, targetLabel: label(i), before, after });
      } catch (e) {
        skipped.push({ title: i.title, why: (e as { data?: { message?: string } }).data?.message ?? "Could not publish" });
      }
    }
    if (published === 0)
      await log({ action: "content.publish_program", targetType: "content", targetId: args.programKey, targetLabel: `program:${args.programKey}`, after: { published, skipped: skipped.length } });
    return { published, skipped };
  },
});

/** Audit trail for AI assistance: who used which AI task, and on what. (The AI itself runs in the Next.js route.) */
export const logAiUse = staffMutation({
  permission: "content.edit",
  args: { task: v.string(), subject: v.optional(v.string()) },
  handler: async (_ctx, args, _staff, log) => {
    await log({
      action: "content.ai_assist",
      targetType: "content",
      targetId: args.task.slice(0, 40),
      targetLabel: args.subject?.slice(0, 120),
      after: { task: args.task.slice(0, 40) },
    });
    return null;
  },
});

/**
 * Creates a path from an (AI-drafted, human-edited) outline: real module and lesson titles with placeholder
 * bodies the author or the AI assistant then fills in. Returns the item ids so the caller can write each lesson.
 */
export const createProgramFromOutline = staffMutation({
  permission: "content.edit",
  args: { outline: v.any(), includeQuizzes: v.boolean() },
  handler: async (ctx, args, { staff }, log) => {
    const o = args.outline as {
      title?: string; tagline?: string; description?: string; track?: string; hours?: number;
      assignment?: Record<string, unknown>; certificate?: Record<string, unknown>;
      modules?: { title?: string; description?: string; lessons?: { title?: string; duration?: string; objective?: string }[] }[];
    };
    const title = (o.title ?? "").trim();
    const modules = Array.isArray(o.modules) ? o.modules : [];
    if (title.length < 3) throw fail("INVALID_CONTENT", "The outline needs a title");
    if (modules.length < 1 || modules.length > 12) throw fail("INVALID_CONTENT", "Use 1–12 modules");
    if (modules.some((m) => !Array.isArray(m.lessons) || m.lessons.length < 1 || m.lessons.length > 10))
      throw fail("INVALID_CONTENT", "Each module needs 1–10 lessons");
    const siblings = await ctx.db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", "program")).take(300);
    const key = await uniqueProgramKey(ctx, slugify(title));
    const base = starter.program(title, TRACKS.includes(o.track ?? "") ? o.track! : "core", (o.description ?? "").trim().slice(0, 3000), siblings.length);
    const programId = await insertItem(ctx, staff._id, {
      kind: "program",
      key,
      parent: null,
      data: {
        ...base,
        tagline: (o.tagline ?? "").slice(0, 300),
        hours: typeof o.hours === "number" && o.hours > 0 && o.hours <= 500 ? o.hours : 4,
        assignment: { ...base.assignment, ...(o.assignment ?? {}) },
        certificate: { ...base.certificate, ...(o.certificate ?? {}) },
      },
    });
    const program = await mustGet(ctx, programId);
    let preId: Id<"cmsItems"> | null = null, postId: Id<"cmsItems"> | null = null;
    if (args.includeQuizzes) {
      preId = await insertItem(ctx, staff._id, { kind: "quiz", key: "pre", parent: program, data: starter.quiz("pre", 0) });
      postId = await insertItem(ctx, staff._id, { kind: "quiz", key: "post", parent: program, data: starter.quiz("post", 1) });
    }
    const lessons: { itemId: Id<"cmsItems">; module: string; title: string; objective: string; orderIndex: number }[] = [];
    for (const [mi, m] of modules.entries()) {
      const moduleId = await insertItem(ctx, staff._id, {
        kind: "module",
        key: `m${mi + 1}`,
        parent: program,
        data: { ...starter.module((m.title ?? `Module ${mi + 1}`).trim().slice(0, 200) || `Module ${mi + 1}`, mi), description: (m.description ?? "").slice(0, 2000) },
      });
      const parent = await mustGet(ctx, moduleId);
      for (const [li, l] of (m.lessons ?? []).entries()) {
        const lt = (l.title ?? `Lesson ${mi + 1}.${li + 1}`).trim().slice(0, 200) || `Lesson ${mi + 1}.${li + 1}`;
        const base = starter.lesson(lt, li);
        const itemId = await insertItem(ctx, staff._id, {
          kind: "lesson",
          key: `l${li + 1}`,
          parent,
          data: { ...base, duration: (l.duration ?? "10 min").slice(0, 40) || "10 min" },
        });
        lessons.push({ itemId, module: parent.title, title: lt, objective: (l.objective ?? "").slice(0, 500), orderIndex: li });
      }
    }
    await log({
      action: "content.create_program",
      targetType: "content",
      targetId: programId,
      targetLabel: `program:${key}`,
      after: { title, modules: modules.length, lessons: lessons.length, fromOutline: true },
    });
    return { programKey: key, programId, preId, postId, lessons };
  },
});
