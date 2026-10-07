import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { fail } from "./lib/errors";
import { requireNonEmpty } from "./lib/validation";
import { internal } from "./_generated/api";
import { checkImages, imagesInput, shownImages } from "./communityImages";

const category = v.union(v.literal("Assessment"), v.literal("Pedagogy"), v.literal("Technology"), v.literal("Inclusion"), v.literal("Wellbeing"), v.literal("Resources"), v.literal("Ask a Question"));
const reportReason = v.union(v.literal("spam"), v.literal("abusive"), v.literal("misleading"), v.literal("personal_info"), v.literal("other"));

const HOURLY_LIMIT = 20; // posts + replies per learner per hour
const DAILY_REPORTS = 15;

/** Posts staff have hidden are not in the "active" index, so they never reach learners. Signed-in learners only. */
export const listPosts = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    const me = await requireCurrentProfile(ctx);
    const rows = args.category
      ? await ctx.db.query("communityPosts").withIndex("by_status_category_and_created_at", (q) => q.eq("status", "active").eq("category", args.category!)).order("desc").take(100)
      : await ctx.db.query("communityPosts").withIndex("by_status_and_created_at", (q) => q.eq("status", "active")).order("desc").take(100);
    const out = [];
    for (const { images, ...p } of rows) out.push({ ...p, images: await shownImages(ctx, images, p.userId === me._id) });
    return out;
  },
});

export const comments = query({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, { postId }) => {
    const me = await requireCurrentProfile(ctx);
    const rows = await ctx.db.query("communityComments").withIndex("by_post_and_created_at", (q) => q.eq("postId", postId)).order("asc").take(200);
    const out = [];
    for (const { images, ...c } of rows.filter((c) => c.hiddenAt === undefined)) out.push({ ...c, images: await shownImages(ctx, images, c.userId === me._id) });
    return out;
  },
});

async function assertNotFlooding(ctx: { db: import("./_generated/server").MutationCtx["db"] }, userId: import("./_generated/dataModel").Id<"profiles">) {
  const since = Date.now() - 60 * 60 * 1000;
  const posts = await ctx.db.query("communityPosts").withIndex("by_user_and_created_at", (q) => q.eq("userId", userId).gte("createdAt", since)).take(HOURLY_LIMIT + 1);
  const replies = await ctx.db.query("communityComments").withIndex("by_user_and_created_at", (q) => q.eq("userId", userId).gte("createdAt", since)).take(HOURLY_LIMIT + 1);
  if (posts.length + replies.length >= HOURLY_LIMIT) throw fail("RATE_LIMITED", "You are posting very quickly. Please wait a little and try again.");
}

export const createPost = mutation({
  args: { title: v.string(), content: v.string(), category, images: v.optional(imagesInput) },
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const title = requireNonEmpty(args.title, "Title", 150);
    const content = requireNonEmpty(args.content, "Post", 5000);
    await assertNotFlooding(ctx, profile._id);
    const images = await checkImages(ctx, args.images, 4);
    const now = Date.now();
    const id = await ctx.db.insert("communityPosts", { title, content, category: args.category, userId: profile._id, authorName: profile.name ?? "Teacher", county: profile.county ?? "", likesCount: 0, commentsCount: 0, isPinned: false, status: "active", createdAt: now, updatedAt: now, ...(images.length ? { images } : {}) });
    if (images.length) await ctx.scheduler.runAfter(0, internal.communityImages.sanitize, { target: { kind: "post", id } });
    return id;
  },
});

export const addComment = mutation({
  args: { postId: v.id("communityPosts"), body: v.string(), images: v.optional(imagesInput) },
  handler: async (ctx, { postId, body, images: input }) => {
    const profile = await requireCurrentProfile(ctx);
    const text = requireNonEmpty(body, "Reply", 2000);
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") throw fail("NOT_FOUND", "That post is no longer available");
    await assertNotFlooding(ctx, profile._id);
    const now = Date.now();
    const images = await checkImages(ctx, input, 2);
    const id = await ctx.db.insert("communityComments", { postId, userId: profile._id, authorName: profile.name ?? "Teacher", body: text, createdAt: now, updatedAt: now, ...(images.length ? { images } : {}) });
    if (images.length) await ctx.scheduler.runAfter(0, internal.communityImages.sanitize, { target: { kind: "comment", id } });
    await ctx.db.patch(postId, { commentsCount: post.commentsCount + 1, updatedAt: now });
    return id;
  },
});

/** A learner flags a post or reply for staff. One report per person per item; staff decide, nothing is hidden automatically. */
export const report = mutation({
  args: { postId: v.id("communityPosts"), commentId: v.optional(v.id("communityComments")), reason: reportReason, note: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "active") throw fail("NOT_FOUND", "That post is no longer available");
    if (args.commentId) {
      const c = await ctx.db.get(args.commentId);
      if (!c || c.postId !== post._id) throw fail("NOT_FOUND", "That reply is no longer available");
    }
    const own = args.commentId ? (await ctx.db.get(args.commentId))?.userId === profile._id : post.userId === profile._id;
    if (own) throw fail("INVALID_ARGUMENT", "You can't report your own post");
    const mine = await ctx.db.query("communityReports").withIndex("by_reporter_and_created_at", (q) => q.eq("reporterId", profile._id).gte("createdAt", Date.now() - 24 * 3600_000)).take(DAILY_REPORTS + 1);
    if (mine.length >= DAILY_REPORTS) throw fail("RATE_LIMITED", "You have sent many reports today. Thank you. Please try again tomorrow.");
    if (mine.some((r) => r.postId === post._id && r.commentId === args.commentId)) return null; // already reported: treat as success
    await ctx.db.insert("communityReports", {
      postId: post._id,
      ...(args.commentId ? { commentId: args.commentId } : {}),
      reporterId: profile._id,
      reason: args.reason,
      ...(args.note?.trim() ? { note: args.note.trim().slice(0, 500) } : {}),
      status: "open",
      createdAt: Date.now(),
    });
    return null;
  },
});
