import { v } from "convex/values";
import { query } from "./_generated/server";
import { assembleProgram, type ProgramShape } from "./lib/contentRead";
import type { AssessmentData, FaqData, PostData, ResourcesData } from "./lib/contentValidation";
import type { QueryCtx } from "./_generated/server";
import { getCurrentProfile } from "./lib/auth";

/**
 * Learner catalogue. `managedKeys` lists every program the CMS controls, so the app
 * knows to stop showing the static copy of a program that staff have since archived
 * or replaced. Archived programs are returned separately so learners who already
 * started them can keep going.
 */
export const publishedPrograms = query({
  args: { lang: v.optional(v.union(v.literal("en"), v.literal("sw"))) },
  handler: async (ctx, { lang }) => {
    const items = await ctx.db
      .query("cmsItems")
      .withIndex("by_kind_and_program", (q) => q.eq("kind", "program"))
      .take(200);
    const programs: ProgramShape[] = [],
      archivedPrograms: ProgramShape[] = [];
    for (const item of items) {
      if (!item.publishedVersionId) continue;
      const assembled = await assembleProgram(ctx, item, "published", item.archivedAt !== undefined, lang ?? "en");
      // "Launching soon" placeholders have no lessons yet but still belong in the catalogue.
      if (!assembled || (assembled.lessons === 0 && !assembled.launchingSoon)) continue;
      (item.archivedAt !== undefined ? archivedPrograms : programs).push(assembled);
    }
    return { programs, archivedPrograms, managedKeys: items.map((i) => i.key) };
  },
});

/** The published needs assessment, or null so the learner app uses its built-in copy. */
export const needsAssessment = query({
  args: {},
  handler: async (ctx) => {
    const item = await ctx.db
      .query("cmsItems")
      .withIndex("by_program_and_key", (q) => q.eq("programKey", "needs-assessment").eq("kind", "assessment").eq("key", "needs-assessment"))
      .first();
    if (!item || !item.publishedVersionId || item.archivedAt !== undefined) return null;
    const version = await ctx.db.get(item.publishedVersionId);
    return version ? (version.data as AssessmentData) : null;
  },
});

async function publishedData<T>(ctx: QueryCtx, kind: "resources" | "faq" | "post", key: string) {
  const item = await ctx.db
    .query("cmsItems")
    .withIndex("by_program_and_key", (q) => q.eq("programKey", key).eq("kind", kind).eq("key", key))
    .first();
  if (!item || !item.publishedVersionId || item.archivedAt !== undefined) return null;
  const version = await ctx.db.get(item.publishedVersionId);
  return version ? (version.data as T) : null;
}

/**
 * The resource library for the signed-in learner, or null so the app shows its built-in list. Downloads that are
 * for paying learners only come back without an address (and `locked: true`) unless the learner is subscribed.
 */
export const resources = query({
  args: {},
  handler: async (ctx) => {
    const data = await publishedData<ResourcesData>(ctx, "resources", "resources");
    if (!data) return null;
    let paid = false;
    try {
      const { profile } = await getCurrentProfile(ctx);
      if (profile) {
        const sub = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).first();
        paid = Boolean(sub && sub.plan !== "free" && (sub.status === "active" || sub.status === "trialing"));
      }
    } catch {
      /* signed out: treated as not subscribed */
    }
    return await Promise.all(
      data.items.map(async (r) => {
        const open = r.free || paid;
        const url = open ? (r.file ? await ctx.storage.getUrl(r.file.storageId as never) : r.url || null) : null;
        return { id: r.id, title: r.title, description: r.description, type: r.type, size: r.size, tags: r.tags, free: r.free, url, locked: !open };
      }),
    );
  },
});

/** The published FAQ for the public page, or null to use the built-in one. */
export const faq = query({
  args: {},
  handler: async (ctx) => {
    const data = await publishedData<FaqData>(ctx, "faq", "faq");
    return data ? data.sections.map((s) => ({ category: s.title, questions: s.items })) : null;
  },
});

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "June 2, 2026" in Kenya time (EAT, UTC+3). */
const dateEat = (ms: number) => {
  const d = new Date(ms + 3 * 3_600_000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

// The date shown is the day the post went live on the platform, taken from the publish record, not typed in by hand,
// so it cannot claim a date that never happened.
const postSummary = (key: string, d: PostData, publishedAt?: number) => ({
  slug: key, title: d.title, excerpt: d.excerpt, author: d.author, authorRole: d.authorRole, category: d.category,
  readTime: d.readTime, date: publishedAt !== undefined ? dateEat(publishedAt) : "", image: d.image, order: d.orderIndex,
});

/** Published blog posts (without the article body). */
export const blogPosts = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", "post")).take(300);
    const out = [];
    for (const i of items) {
      if (!i.publishedVersionId || i.archivedAt !== undefined) continue;
      const ver = await ctx.db.get(i.publishedVersionId);
      if (ver) out.push(postSummary(i.key, ver.data as PostData, ver.publishedAt));
    }
    return out.sort((a, b) => b.order - a.order);
  },
});

export const blogPost = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const item = await ctx.db.query("cmsItems").withIndex("by_program_and_key", (q) => q.eq("programKey", slug).eq("kind", "post").eq("key", slug)).first();
    if (!item || !item.publishedVersionId || item.archivedAt !== undefined) return null;
    const ver = await ctx.db.get(item.publishedVersionId);
    if (!ver) return null;
    const d = ver.data as PostData;
    return { ...postSummary(slug, d, ver.publishedAt), content: d.content };
  },
});
