import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { boundedLimit, requireNonEmpty } from "./lib/validation";

const discussionDoc = v.object({
  _id: v.id("lessonDiscussions"), _creationTime: v.number(), userId: v.optional(v.id("profiles")),
  legacyId: v.optional(v.string()), clientId: v.optional(v.string()), programId: v.string(), moduleId: v.string(),
  lessonId: v.string(), author: v.string(), content: v.string(), isSeed: v.boolean(), createdAt: v.number(), updatedAt: v.optional(v.number()),
});

export const listForLesson = query({
  args: { programId: v.string(), moduleId: v.string(), lessonId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(discussionDoc),
  handler: async (ctx, args) => {
    await requireCurrentProfile(ctx);
    return await ctx.db.query("lessonDiscussions").withIndex("by_lesson_and_created_at", (q) =>
      q.eq("programId", args.programId).eq("moduleId", args.moduleId).eq("lessonId", args.lessonId))
      .order("asc").take(boundedLimit(args.limit, 100, 250));
  },
});

export const create = mutation({
  args: { programId: v.string(), moduleId: v.string(), lessonId: v.string(), content: v.string(), author: v.optional(v.string()), clientId: v.optional(v.string()) },
  returns: v.id("lessonDiscussions"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    if (args.clientId) {
      const existing = await ctx.db.query("lessonDiscussions").withIndex("by_user_and_client_id", (q) =>
        q.eq("userId", profile._id).eq("clientId", args.clientId)).unique();
      if (existing) return existing._id;
    }
    const now = Date.now();
    return await ctx.db.insert("lessonDiscussions", {
      userId: profile._id, programId: requireNonEmpty(args.programId, "programId", 100),
      moduleId: requireNonEmpty(args.moduleId, "moduleId", 100), lessonId: requireNonEmpty(args.lessonId, "lessonId", 100),
      author: profile.name ?? "Teacher", content: requireNonEmpty(args.content, "content", 10_000), isSeed: false, createdAt: now,
      ...(args.clientId ? { clientId: requireNonEmpty(args.clientId, "clientId", 100) } : {}),
    });
  },
});

export const update = mutation({
  args: { discussionId: v.id("lessonDiscussions"), content: v.string() }, returns: v.null(),
  handler: async (ctx, { discussionId, content }) => {
    const profile = await requireCurrentProfile(ctx); const post = await ctx.db.get(discussionId);
    if (!post || post.userId !== profile._id || post.isSeed) throw new ConvexError({ code: "NOT_FOUND", message: "Discussion post not found" });
    await ctx.db.patch(discussionId, { content: requireNonEmpty(content, "content", 10_000), updatedAt: Date.now() }); return null;
  },
});

export const remove = mutation({
  args: { discussionId: v.id("lessonDiscussions") }, returns: v.null(),
  handler: async (ctx, { discussionId }) => {
    const profile = await requireCurrentProfile(ctx); const post = await ctx.db.get(discussionId);
    if (!post || post.userId !== profile._id || post.isSeed) throw new ConvexError({ code: "NOT_FOUND", message: "Discussion post not found" });
    await ctx.db.delete(discussionId); return null;
  },
});
