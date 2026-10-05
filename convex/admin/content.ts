import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { staffMutation, staffQuery } from "../lib/staff";
import { assertPublishable, normalizeTags, titleOf, validateContent, type ContentKind } from "../lib/contentValidation";
import { assembleProgram } from "../lib/contentRead";
import { CBC_LEVELS, COUNTIES, SUBJECTS } from "../lib/taxonomy";
import { PROGRAMS } from "../../lib/learning-paths-data";
import { fail } from "../lib/errors";
import { insertItem, insertPublishedItem, publishDraft, readinessProblem } from "../lib/contentWrite";
import { FAQS } from "../../lib/faq-data";
import { RESOURCES } from "../../lib/resources-data";
import { blogPosts } from "../../lib/blog-data";
import { modulesData } from "../../lib/modules-data";
import { NEEDS_FALLBACK, NEEDS_QUESTIONS, NEEDS_RULES, NEEDS_SECTIONS } from "../../lib/needs-assessment-data";

const kindV = v.union(v.literal("program"), v.literal("module"), v.literal("lesson"), v.literal("quiz"), v.literal("assessment"), v.literal("resources"), v.literal("faq"), v.literal("post"));
const ROOT_KINDS = ["program", "assessment", "resources", "faq", "post"] as const;
const KEY = /^[a-z0-9][a-z0-9-]{0,59}$/;

const label = (i: Doc<"cmsItems">) => `${i.kind}:${i.programKey}/${i.key}`;

async function item(ctx: { db: MutationCtx["db"] }, id: Id<"cmsItems">) {
  const doc = await ctx.db.get(id);
  if (!doc) throw fail("NOT_FOUND", "Content item not found");
  return doc;
}

const summarize = (v: Doc<"cmsVersions"> | null) =>
  v && { _id: v._id, version: v.version, status: v.status, createdAt: v.createdAt, publishedAt: v.publishedAt };

export const taxonomy = staffQuery({
  permission: "content.read",
  args: {},
  handler: async () => ({ cbcLevels: [...CBC_LEVELS], counties: [...COUNTIES], subjects: [...SUBJECTS] }),
});

export const programs = staffQuery({
  permission: "content.read",
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("cmsItems")
      .withIndex("by_kind_and_program", (q) => q.eq("kind", "program"))
      .take(200);
    const reviewing = await ctx.db
      .query("cmsVersions")
      .withIndex("by_status", (q) => q.eq("status", "in_review"))
      .take(500);
    const inReview = new Set(reviewing.map((r) => r.itemId));
    return await Promise.all(
      items.map(async (i) => ({
        _id: i._id,
        key: i.key,
        title: i.title,
        archived: i.archivedAt !== undefined,
        published: i.publishedVersionId !== undefined,
        hasDraft: i.draftVersionId !== undefined,
        inReview: inReview.has(i._id),
        cbcLevels: i.cbcLevels,
        subjects: i.subjects,
        counties: i.counties,
        updatedAt: i.updatedAt,
      })),
    );
  },
});

export const itemsForProgram = staffQuery({
  permission: "content.read",
  args: { programKey: v.string() },
  handler: async (ctx, { programKey }) => {
    const items = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) => q.eq("programKey", programKey))
      .take(500);
    return await Promise.all(
      items.map(async (i) => {
        const [draft, published] = await Promise.all([
          i.draftVersionId ? ctx.db.get(i.draftVersionId) : null,
          i.publishedVersionId ? ctx.db.get(i.publishedVersionId) : null,
        ]);
        return {
          _id: i._id,
          kind: i.kind,
          key: i.key,
          parentId: i.parentId,
          title: i.title,
          orderIndex: i.orderIndex,
          archived: i.archivedAt !== undefined,
          draft: summarize(draft),
          published: summarize(published),
          // Why the working copy (draft, else live) cannot be submitted or published yet.
          problem: i.archivedAt !== undefined ? null : readinessProblem(i.kind, (draft ?? published)?.data),
          cbcLevels: i.cbcLevels,
          subjects: i.subjects,
          counties: i.counties,
        };
      }),
    );
  },
});

export const getItem = staffQuery({
  permission: "content.read",
  args: { itemId: v.id("cmsItems") },
  handler: async (ctx, { itemId }) => {
    const i = await ctx.db.get(itemId);
    if (!i) throw fail("NOT_FOUND", "Content item not found");
    const [draft, published, history] = await Promise.all([
      i.draftVersionId ? ctx.db.get(i.draftVersionId) : null,
      i.publishedVersionId ? ctx.db.get(i.publishedVersionId) : null,
      ctx.db
        .query("cmsVersions")
        .withIndex("by_item", (q) => q.eq("itemId", itemId))
        .order("desc")
        .take(30),
    ]);
    const emails = new Map<string, string>();
    for (const sid of new Set(
      history.flatMap((h) => [h.authorId, h.submittedBy, h.reviewedBy]).filter(Boolean) as Id<"staff">[],
    )) {
      emails.set(sid, (await ctx.db.get(sid))?.email ?? "unknown");
    }
    const who = (id?: Id<"staff">) => (id ? emails.get(id) : undefined);
    return {
      item: { ...i, archived: i.archivedAt !== undefined },
      draft,
      published,
      history: history.map((h) => ({
        _id: h._id,
        version: h.version,
        status: h.status,
        createdAt: h.createdAt,
        publishedAt: h.publishedAt,
        author: who(h.authorId),
        submittedBy: who(h.submittedBy),
        reviewedBy: who(h.reviewedBy),
        reviewComment: h.reviewComment,
      })),
    };
  },
});

export const pendingReviews = staffQuery({
  permission: "content.read",
  args: {},
  handler: async (ctx) => {
    const versions = await ctx.db
      .query("cmsVersions")
      .withIndex("by_status", (q) => q.eq("status", "in_review"))
      .order("desc")
      .take(100);
    return await Promise.all(
      versions.map(async (ver) => {
        const i = await ctx.db.get(ver.itemId);
        const submitter = ver.submittedBy ? await ctx.db.get(ver.submittedBy) : null;
        return {
          versionId: ver._id,
          itemId: ver.itemId,
          kind: i?.kind,
          key: i?.key,
          programKey: i?.programKey,
          title: (ver.data as { title?: string }).title ?? i?.title,
          version: ver.version,
          submittedBy: submitter?.email,
          submittedById: ver.submittedBy,
          createdAt: ver.createdAt,
        };
      }),
    );
  },
});

/** Renders the program as a learner would see it. mode=draft overlays unpublished drafts on the published tree. */
export const preview = staffQuery({
  permission: "content.read",
  args: { programKey: v.string(), mode: v.union(v.literal("draft"), v.literal("published")) },
  handler: async (ctx, { programKey, mode }) => {
    const p = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) =>
        q.eq("programKey", programKey).eq("kind", "program").eq("key", programKey),
      )
      .first();
    if (!p) throw fail("NOT_FOUND", "Program not found");
    return await assembleProgram(ctx, p, mode, true);
  },
});

export const createItem = staffMutation({
  permission: "content.edit",
  args: {
    kind: kindV,
    key: v.string(),
    parentId: v.optional(v.id("cmsItems")),
    data: v.any(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args, { staff }, log) => {
    const key = args.key.trim().toLowerCase();
    if (!KEY.test(key)) throw fail("INVALID_CONTENT", "Key must be lowercase letters, numbers and dashes");
    let programKey = key,
      parent: Doc<"cmsItems"> | null = null;
    if ((ROOT_KINDS as readonly string[]).includes(args.kind)) {
      const rootKind = args.kind as (typeof ROOT_KINDS)[number];
      if (args.parentId) throw fail("INVALID_CONTENT", `A ${rootKind} has no parent`);
      if (
        await ctx.db
          .query("cmsItems")
          .withIndex("by_program_and_key", (q) => q.eq("programKey", key).eq("kind", rootKind).eq("key", key))
          .first()
      )
        throw fail("ALREADY_EXISTS", `A ${rootKind} with that key already exists`);
    } else {
      if (!args.parentId) throw fail("INVALID_CONTENT", "Choose a parent");
      parent = await item(ctx, args.parentId);
      const expected: Partial<Record<ContentKind, ContentKind>> = { module: "program", lesson: "module", quiz: "program" };
      if (parent.kind !== expected[args.kind])
        throw fail("INVALID_CONTENT", `A ${args.kind} belongs under a ${expected[args.kind]}`);
      if (parent.archivedAt !== undefined) throw fail("INVALID_CONTENT", "The parent is archived");
      programKey = parent.programKey;
      const siblings = await ctx.db
        .query("cmsItems")
        .withIndex("by_parent", (q) => q.eq("parentId", parent!._id))
        .take(300);
      if (siblings.some((s) => s.kind === args.kind && s.key === key))
        throw fail("ALREADY_EXISTS", "That key is already used here");
    }
    // Drafts may be incomplete; completeness is enforced on submit and publish.
    const data = validateContent(args.kind, args.data, true);
    const now = Date.now();
    const itemId = await ctx.db.insert("cmsItems", {
      kind: args.kind,
      key,
      ...(parent ? { parentId: parent._id } : {}),
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
      authorId: staff._id,
      createdAt: now,
    });
    await ctx.db.patch(itemId, { draftVersionId: versionId });
    await log({
      action: "content.create",
      targetType: "content",
      targetId: itemId,
      targetLabel: `${args.kind}:${programKey}/${key}`,
      after: data,
    });
    return itemId;
  },
});

export const saveDraft = staffMutation({
  permission: "content.edit",
  args: {
    itemId: v.id("cmsItems"),
    data: v.any(),
    baseVersionId: v.optional(v.id("cmsVersions")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args, { staff }, log) => {
    const i = await item(ctx, args.itemId);
    if (i.archivedAt !== undefined) throw fail("INVALID_STATE", "Unarchive this item before editing it");
    const data = validateContent(i.kind, args.data, true);
    const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
    const now = Date.now();
    if (draft && (draft.status === "in_review" || draft.status === "approved")) {
      throw fail(
        "INVALID_STATE",
        draft.status === "in_review"
          ? "This draft is awaiting review. Withdraw it to keep editing."
          : "This draft is approved. Publish it, or discard it to edit again.",
      );
    }
    if (draft) {
      if (args.baseVersionId && args.baseVersionId !== draft._id)
        throw fail("CONFLICT", "Someone else saved a newer draft. Reload to continue.");
      await ctx.db.patch(draft._id, {
        data,
        status: "draft",
        authorId: staff._id,
        reviewComment: undefined,
        reviewedBy: undefined,
        submittedBy: undefined,
      });
      if (i.publishedVersionId === undefined)
        await ctx.db.patch(i._id, { title: titleOf(data), orderIndex: data.orderIndex, updatedAt: now });
      await log({
        action: "content.edit",
        targetType: "content",
        targetId: i._id,
        targetLabel: label(i),
        before: draft.data,
        after: data,
      });
      return draft._id;
    }
    const published = i.publishedVersionId ? await ctx.db.get(i.publishedVersionId) : null;
    const latest = await ctx.db
      .query("cmsVersions")
      .withIndex("by_item", (q) => q.eq("itemId", i._id))
      .order("desc")
      .first();
    const versionId = await ctx.db.insert("cmsVersions", {
      itemId: i._id,
      version: (latest?.version ?? 0) + 1,
      status: "draft",
      data,
      authorId: staff._id,
      createdAt: now,
    });
    await ctx.db.patch(i._id, { draftVersionId: versionId, updatedAt: now });
    await log({
      action: "content.edit",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      before: published?.data,
      after: data,
    });
    return versionId;
  },
});

export const submitForReview = staffMutation({
  permission: "content.edit",
  args: { itemId: v.id("cmsItems"), comment: v.optional(v.string()), reason: v.optional(v.string()) },
  handler: async (ctx, args, { staff }, log) => {
    const i = await item(ctx, args.itemId);
    const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
    if (!draft || draft.status !== "draft") throw fail("INVALID_STATE", "There is no draft to submit");
    const problem = readinessProblem(i.kind, draft.data);
    if (problem) throw fail("INVALID_CONTENT", problem);
    await ctx.db.patch(draft._id, {
      status: "in_review",
      submittedBy: staff._id,
      reviewComment: args.comment?.trim() || undefined,
    });
    await log({
      action: "content.submit_review",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      after: { version: draft.version },
    });
    return null;
  },
});

export const withdraw = staffMutation({
  permission: "content.edit",
  args: { itemId: v.id("cmsItems"), reason: v.optional(v.string()) },
  handler: async (ctx, args, { staff }, log) => {
    const i = await item(ctx, args.itemId);
    const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
    if (!draft || draft.status !== "in_review") throw fail("INVALID_STATE", "Nothing is awaiting review");
    if (draft.submittedBy !== staff._id && staff.role !== "super_admin")
      throw fail("FORBIDDEN", "Only the submitter can withdraw this");
    await ctx.db.patch(draft._id, { status: "draft", submittedBy: undefined });
    await log({ action: "content.withdraw", targetType: "content", targetId: i._id, targetLabel: label(i) });
    return null;
  },
});

export const review = staffMutation({
  permission: "content.review",
  requireReason: true,
  args: { itemId: v.id("cmsItems"), decision: v.union(v.literal("approve"), v.literal("reject")), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const i = await item(ctx, args.itemId);
    const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
    if (!draft || draft.status !== "in_review") throw fail("INVALID_STATE", "Nothing is awaiting review");
    // Four-eyes rule: applies to everyone, including Super Admins.
    if (draft.submittedBy === staff._id) throw fail("SELF_REVIEW", "You cannot review content you submitted");
    await ctx.db.patch(draft._id, {
      status: args.decision === "approve" ? "approved" : "rejected",
      reviewedBy: staff._id,
      reviewComment: args.reason.trim(),
    });
    await log({
      action: args.decision === "approve" ? "content.approve" : "content.reject",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      after: { version: draft.version },
    });
    return null;
  },
});

export const publish = staffMutation({
  permission: "content.publish",
  requireReason: true,
  args: { itemId: v.id("cmsItems"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const i = await item(ctx, args.itemId);
    const { before, after } = await publishDraft(ctx, i);
    await log({
      action: "content.publish",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      before,
      after,
    });
    return null;
  },
});

export const discardDraft = staffMutation({
  permission: "content.edit",
  requireReason: true,
  args: { itemId: v.id("cmsItems"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const i = await item(ctx, args.itemId);
    const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
    if (!draft) throw fail("INVALID_STATE", "There is no draft");
    // Drafts are staff-only work product. Published content is never deleted.
    if (!i.publishedVersionId)
      throw fail("INVALID_STATE", "A never-published item can only be archived, not discarded");
    await ctx.db.patch(draft._id, { status: "superseded" });
    await ctx.db.patch(i._id, { draftVersionId: undefined, updatedAt: Date.now() });
    await log({
      action: "content.discard_draft",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      before: { version: draft.version },
    });
    return null;
  },
});

/** Soft removal only. There is intentionally no delete: learners may have started or finished this. */
export const archive = staffMutation({
  permission: "content.publish",
  requireReason: true,
  args: { itemId: v.id("cmsItems"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const i = await item(ctx, args.itemId);
    if (i.archivedAt !== undefined) throw fail("NO_CHANGES", "Already archived");
    await ctx.db.patch(i._id, { archivedAt: Date.now(), updatedAt: Date.now() });
    await log({
      action: "content.archive",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      before: { archived: false },
      after: { archived: true },
    });
    return null;
  },
});

export const unarchive = staffMutation({
  permission: "content.publish",
  requireReason: true,
  args: { itemId: v.id("cmsItems"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const i = await item(ctx, args.itemId);
    if (i.archivedAt === undefined) throw fail("NO_CHANGES", "Not archived");
    await ctx.db.patch(i._id, { archivedAt: undefined, updatedAt: Date.now() });
    await log({
      action: "content.unarchive",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      before: { archived: true },
      after: { archived: false },
    });
    return null;
  },
});

/**
 * One-off baseline: copies the static curriculum into the CMS as published v1 so
 * lesson ids (m1/l1...) are preserved and existing progress stays valid. Idempotent.
 */
export const importStaticCurriculum = staffMutation({
  permission: "content.publish",
  requireReason: true,
  args: { reason: v.string() },
  handler: async (ctx, _args, { staff }, log) => {
    if (staff.role !== "super_admin") throw fail("FORBIDDEN", "Only a Super Admin can import the baseline curriculum");
    const now = Date.now();
    const emptyTags = normalizeTags({});
    let created = 0,
      skipped = 0;
    const add = async (
      kind: ContentKind,
      key: string,
      parentId: Id<"cmsItems"> | undefined,
      programKey: string,
      data: any,
    ) => {
      const checked = validateContent(kind, data, true); // placeholders ("launching soon") are imported as-is
      const itemId = await ctx.db.insert("cmsItems", {
        kind,
        key,
        ...(parentId ? { parentId } : {}),
        programKey,
        title: titleOf(checked),
        orderIndex: checked.orderIndex,
        cbcLevels: [],
        subjects: [],
        counties: [],
        updatedAt: now,
      });
      const versionId = await ctx.db.insert("cmsVersions", {
        itemId,
        version: 1,
        status: "published",
        data: checked,
        authorId: staff._id,
        createdAt: now,
        publishedAt: now,
      });
      await ctx.db.patch(itemId, { publishedVersionId: versionId });
      created++;
      return itemId;
    };
    for (const [pi, p] of PROGRAMS.entries()) {
      const exists = await ctx.db
        .query("cmsItems")
        .withIndex("by_program_and_key", (q) => q.eq("programKey", p.id).eq("kind", "program").eq("key", p.id))
        .first();
      if (exists) {
        skipped++;
        continue;
      }
      const { modules, preAssessment, postAssessment, id, lessons: _l, ...rest } = p;
      const programId = await add("program", id, undefined, id, { ...rest, orderIndex: pi, tags: emptyTags });
      if (preAssessment.length)
        await add("quiz", "pre", programId, id, { kind: "pre", questions: preAssessment, orderIndex: 0 });
      if (postAssessment.length)
        await add("quiz", "post", programId, id, { kind: "post", questions: postAssessment, orderIndex: 1 });
      for (const [mi, m] of modules.entries()) {
        const moduleId = await add("module", m.id, programId, id, {
          title: m.title,
          description: m.description,
          orderIndex: mi,
        });
        for (const [li, l] of m.lessons.entries()) {
          const { id: lessonKey, ...lesson } = l;
          await add("lesson", lessonKey, moduleId, id, { ...lesson, orderIndex: li });
        }
      }
    }
    await log({
      action: "content.import_static",
      targetType: "content",
      targetId: "static-curriculum",
      after: { itemsCreated: created, programsSkipped: skipped },
    });
    return { created, skipped };
  },
});

/** The needs assessment item(s), for the admin list. */
export const assessments = staffQuery({
  permission: "content.read",
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("cmsItems")
      .withIndex("by_kind_and_program", (q) => q.eq("kind", "assessment"))
      .take(20);
    return items.map((i) => ({
      _id: i._id,
      key: i.key,
      title: i.title,
      published: i.publishedVersionId !== undefined,
      hasDraft: i.draftVersionId !== undefined,
      archived: i.archivedAt !== undefined,
      updatedAt: i.updatedAt,
    }));
  },
});

export const NEEDS_KEY = "needs-assessment";

/** Copies the built-in needs assessment into the CMS (as a draft to edit, or live as-is) so it can be managed. */
export const importNeedsAssessment = staffMutation({
  permission: "content.edit",
  args: { reason: v.optional(v.string()) },
  handler: async (ctx, _args, { staff }, log) => {
    const exists = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) => q.eq("programKey", NEEDS_KEY).eq("kind", "assessment").eq("key", NEEDS_KEY))
      .first();
    if (exists) throw fail("ALREADY_EXISTS", "The needs assessment is already in the CMS");
    const data = {
      title: "Needs assessment",
      intro: "A few questions about your classroom so we can recommend where to start.",
      sections: NEEDS_SECTIONS.map((s) => ({ title: s.title, description: s.description })),
      questions: NEEDS_QUESTIONS.map((q) => ({
        id: q.id,
        section: q.sectionIndex,
        type: q.type,
        question: q.question,
        subtext: q.subtext ?? "",
        options: q.type === "scale" ? [] : q.options,
        correctIndex: q.type === "knowledge" ? q.correctIndex : 0,
        explanation: q.type === "knowledge" ? q.explanation : "",
        minLabel: q.type === "scale" ? q.minLabel : "",
        maxLabel: q.type === "scale" ? q.maxLabel : "",
        maxSelect: q.type === "multiple" ? (q.maxSelect ?? 0) : 0,
      })),
      rules: NEEDS_RULES,
      fallbackProgramIds: NEEDS_FALLBACK,
      orderIndex: 0,
      tags: { cbcLevels: [], subjects: [], counties: [] },
    };
    const id = await insertItem(ctx, staff._id, { kind: "assessment", key: NEEDS_KEY, parent: null, data });
    await log({
      action: "content.create",
      targetType: "content",
      targetId: id,
      targetLabel: `assessment:${NEEDS_KEY}`,
      after: { questions: data.questions.length, importedBuiltIn: true },
    });
    return id;
  },
});

/** Resource library, FAQ and blog posts, for the Content studio. */
export const collections = staffQuery({
  permission: "content.read",
  args: {},
  handler: async (ctx) => {
    const out: Record<"resources" | "faq" | "post", { _id: Id<"cmsItems">; key: string; title: string; published: boolean; hasDraft: boolean; archived: boolean; updatedAt: number }[]> = { resources: [], faq: [], post: [] };
    for (const kind of ["resources", "faq", "post"] as const) {
      const items = await ctx.db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", kind)).take(300);
      out[kind] = items.map((i) => ({ _id: i._id, key: i.key, title: i.title, published: i.publishedVersionId !== undefined, hasDraft: i.draftVersionId !== undefined, archived: i.archivedAt !== undefined, updatedAt: i.updatedAt }));
    }
    return out;
  },
});

/** Brings the built-in resource list, FAQ or blog posts under management, live and unchanged. Skips what exists. */
export const importBuiltIn = staffMutation({
  permission: "content.publish",
  args: { what: v.union(v.literal("resources"), v.literal("faq"), v.literal("posts")) },
  handler: async (ctx, args, { staff }, log) => {
    const has = async (kind: "resources" | "faq" | "post", key: string) =>
      Boolean(await ctx.db.query("cmsItems").withIndex("by_program_and_key", (q) => q.eq("programKey", key).eq("kind", kind).eq("key", key)).first());
    const tags = { cbcLevels: [], subjects: [], counties: [] };
    let created = 0;
    if (args.what === "resources") {
      if (await has("resources", "resources")) throw fail("ALREADY_EXISTS", "The resource library is already managed here");
      const types: Record<string, string> = { PDF: "PDF", Video: "Video" };
      await insertPublishedItem(ctx, staff._id, {
        kind: "resources",
        key: "resources",
        data: { title: "Resource library", orderIndex: 0, tags, items: RESOURCES.map((r) => ({ id: String(r.id), title: r.title, description: r.description, type: types[r.type] ?? "Link", url: r.url ?? "", size: r.size, tags: r.tags, free: r.free })) },
      });
      created = RESOURCES.length;
    } else if (args.what === "faq") {
      if (await has("faq", "faq")) throw fail("ALREADY_EXISTS", "The FAQ is already managed here");
      await insertPublishedItem(ctx, staff._id, { kind: "faq", key: "faq", data: { title: "FAQ", orderIndex: 0, tags, sections: FAQS.map((s) => ({ title: s.category, items: s.questions })) } });
      created = FAQS.reduce((n, s) => n + s.questions.length, 0);
    } else {
      for (const p of blogPosts) {
        if (await has("post", p.slug)) continue;
        await insertPublishedItem(ctx, staff._id, {
          kind: "post",
          key: p.slug,
          data: { title: p.title, excerpt: p.excerpt, content: p.content.trim(), author: p.author, authorRole: p.authorRole, category: p.category, readTime: p.readTime, date: p.date, image: p.image, orderIndex: p.id, tags },
        });
        created++;
      }
    }
    await log({ action: "content.import_builtin", targetType: "content", targetId: args.what, after: { created } });
    return { created };
  },
});

/** One-time upload address for attaching a file (PDF, audio…) to a resource. */
export const generateUploadUrl = staffMutation({
  permission: "content.edit",
  args: {},
  handler: async (ctx, _args, _staff, log) => {
    await log({ action: "content.upload_url", targetType: "content", targetId: "resource-file" });
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Brings the older "Learning Modules" library into the CMS as short courses, keeping the ids the learner app and
 * learners' saved progress already use (program `module-N`, module `N`, lessons by their number). Their progress
 * then syncs to the cloud, counts in analytics, and staff manage them like any other learning path.
 */
export const importLegacyModules = staffMutation({
  permission: "content.publish",
  args: {},
  handler: async (ctx, _args, { staff }, log) => {
    const tags = { cbcLevels: [], subjects: [], counties: [] };
    let created = 0, skipped = 0;
    for (const [i, m] of modulesData.entries()) {
      const key = `module-${m.id}`;
      const exists = await ctx.db.query("cmsItems").withIndex("by_program_and_key", (q) => q.eq("programKey", key).eq("kind", "program").eq("key", key)).first();
      if (exists) { skipped++; continue; }
      const goals = m.objectives.length ? `\n\n**You will learn to:**\n${m.objectives.map((o) => `- ${o}`).join("\n")}` : "";
      const needs = m.prerequisites.length ? `\n\n**Before you start:** ${m.prerequisites.join("; ")}` : "";
      const programId = await insertPublishedItem(ctx, staff._id, {
        kind: "program",
        key,
        data: {
          title: m.title, shortTitle: m.title.slice(0, 60), tagline: `${m.difficulty[0].toUpperCase()}${m.difficulty.slice(1)} · ${m.lessons.length} lessons`,
          description: `${m.description}${goals}${needs}`.slice(0, 3000), track: m.category === "technology" ? "stem" : "core", kicdAlignment: "",
          hours: Math.max(0.5, Math.round((m.duration / 60) * 10) / 10), accent: "primary", available: true, launchingSoon: false, shortCourse: true,
          assignment: { title: "", context: "", task: "", hints: [], rubric: [] }, certificate: { subtitle: "", skills: [] }, orderIndex: 100 + i, tags,
        },
      });
      const program = (await ctx.db.get(programId))!;
      const moduleId = await insertPublishedItem(ctx, staff._id, { kind: "module", key: String(m.id), parent: program, data: { title: m.title, description: "", orderIndex: 0, tags } });
      const mod = (await ctx.db.get(moduleId))!;
      for (const [li, l] of m.lessons.entries()) {
        await insertPublishedItem(ctx, staff._id, {
          kind: "lesson", key: String(l.id), parent: mod,
          data: { title: l.title, duration: `${l.duration} min`, videoTitle: l.type === "video" ? l.title : "", videoPoints: [], reading: l.content || l.title, reflectionPrompt: "", reflectionPlaceholder: "", orderIndex: li, tags },
        });
      }
      created++;
    }
    if (created === 0 && skipped > 0) throw fail("ALREADY_EXISTS", "The library modules are already managed here");
    await log({ action: "content.import_legacy_modules", targetType: "content", targetId: "legacy-modules", after: { created, skipped } });
    return { created, skipped };
  },
});

/**
 * Makes an older version the new working draft ("go back to this"). Nothing goes live until it is submitted,
 * reviewed and published like any other edit, so a rollback gets the same second pair of eyes.
 */
export const restoreVersion = staffMutation({
  permission: "content.edit",
  requireReason: true,
  args: { versionId: v.id("cmsVersions"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const ver = await ctx.db.get(args.versionId);
    if (!ver) throw fail("NOT_FOUND", "Version not found");
    const i = await item(ctx, ver.itemId);
    if (i.archivedAt !== undefined) throw fail("INVALID_STATE", "Unarchive this item before restoring a version");
    const draft = i.draftVersionId ? await ctx.db.get(i.draftVersionId) : null;
    if (draft && (draft.status === "in_review" || draft.status === "approved"))
      throw fail("INVALID_STATE", draft.status === "in_review" ? "This item is awaiting review. Withdraw it first." : "This item is approved. Publish it or discard the draft first.");
    if (i.publishedVersionId === ver._id && !draft) throw fail("NO_CHANGES", "That version is already the live one");
    const data = validateContent(i.kind, ver.data, true);
    const now = Date.now();
    if (draft) {
      await ctx.db.patch(draft._id, { data, status: "draft", authorId: staff._id, reviewComment: undefined, reviewedBy: undefined, submittedBy: undefined });
    } else {
      const latest = await ctx.db.query("cmsVersions").withIndex("by_item", (q) => q.eq("itemId", i._id)).order("desc").first();
      const id = await ctx.db.insert("cmsVersions", { itemId: i._id, version: (latest?.version ?? 0) + 1, status: "draft", data, authorId: staff._id, createdAt: now });
      await ctx.db.patch(i._id, { draftVersionId: id, updatedAt: now });
    }
    await log({
      action: "content.restore_version",
      targetType: "content",
      targetId: i._id,
      targetLabel: label(i),
      before: draft?.data ?? null,
      after: { restoredFromVersion: ver.version },
    });
    return null;
  },
});
