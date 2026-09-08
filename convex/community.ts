import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";

const category = v.union(v.literal("Assessment"), v.literal("Pedagogy"), v.literal("Technology"), v.literal("Inclusion"), v.literal("Wellbeing"), v.literal("Resources"), v.literal("Ask a Question"));

export const listPosts = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    const rows = args.category
      ? await ctx.db.query("communityPosts").withIndex("by_status_category_and_created_at", (q) => q.eq("status", "active").eq("category", args.category!)).order("desc").take(100)
      : await ctx.db.query("communityPosts").withIndex("by_status_and_created_at", (q) => q.eq("status", "active")).order("desc").take(100);
    return rows;
  },
});

export const comments = query({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, { postId }) => await ctx.db.query("communityComments").withIndex("by_post_and_created_at", (q) => q.eq("postId", postId)).order("asc").take(200),
});

export const createPost = mutation({
  args: { title: v.string(), content: v.string(), category },
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const now = Date.now();
    return await ctx.db.insert("communityPosts", { ...args, userId: profile._id, authorName: profile.name ?? "Teacher", county: profile.county ?? "", likesCount: 0, commentsCount: 0, isPinned: false, status: "active", createdAt: now, updatedAt: now });
  },
});

export const addComment = mutation({
  args: { postId: v.id("communityPosts"), body: v.string() },
  handler: async (ctx, { postId, body }) => {
    const profile = await requireCurrentProfile(ctx);
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "active") throw new Error("Post not found");
    const now = Date.now();
    const id = await ctx.db.insert("communityComments", { postId, userId: profile._id, authorName: profile.name ?? "Teacher", body, createdAt: now, updatedAt: now });
    await ctx.db.patch(postId, { commentsCount: post.commentsCount + 1, updatedAt: now });
    return id;
  },
});
