import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { boundedLimit, requireDateKey } from "./lib/validation";

const activityType = v.union(v.literal("lesson"), v.literal("tool"), v.literal("journal"), v.literal("community"), v.literal("login"), v.literal("assessment"));
const activityDoc = v.object({
  _id: v.id("activityLog"), _creationTime: v.number(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  date: v.string(), type: activityType, metadata: v.optional(v.any()), createdAt: v.number(),
});

export const listMine = query({
  args: { fromDate: v.optional(v.string()), toDate: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.array(activityDoc),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const from = args.fromDate ? requireDateKey(args.fromDate, "fromDate") : undefined;
    const to = args.toDate ? requireDateKey(args.toDate, "toDate") : undefined;
    return await ctx.db.query("activityLog").withIndex("by_user_and_date", (q) => {
      const byUser = q.eq("userId", profile._id);
      if (from && to) return byUser.gte("date", from).lte("date", to);
      if (from) return byUser.gte("date", from);
      if (to) return byUser.lte("date", to);
      return byUser;
    }).order("desc").take(boundedLimit(args.limit, 366, 1000));
  },
});

export const record = mutation({
  args: { date: v.string(), type: activityType, metadata: v.optional(v.any()) },
  returns: v.id("activityLog"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx); const date = requireDateKey(args.date);
    const existing = await ctx.db.query("activityLog").withIndex("by_user_date_and_type", (q) =>
      q.eq("userId", profile._id).eq("date", date).eq("type", args.type)).unique();
    if (existing) {
      if (args.metadata !== undefined) await ctx.db.patch(existing._id, { metadata: args.metadata });
      return existing._id;
    }
    return await ctx.db.insert("activityLog", { userId: profile._id, date, type: args.type, createdAt: Date.now(), ...(args.metadata !== undefined ? { metadata: args.metadata } : {}) });
  },
});

export const mine = listMine;
export const recordToolUsed = mutation({
  args: { toolId: v.string() },
  handler: async (ctx, { toolId }) => {
    const profile = await requireCurrentProfile(ctx);
    const existing = await ctx.db.query("toolsUsed").withIndex("by_user_and_tool", (q) => q.eq("userId", profile._id).eq("toolId", toolId)).unique();
    const now = Date.now();
    if (existing) { await ctx.db.patch(existing._id, { lastUsedAt: now, useCount: existing.useCount + 1 }); return existing._id; }
    return await ctx.db.insert("toolsUsed", { userId: profile._id, toolId, firstUsedAt: now, lastUsedAt: now, useCount: 1 });
  },
});
export const toolsUsed = query({
  args: {}, handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return (await ctx.db.query("toolsUsed").withIndex("by_user_and_last_used_at", (q) => q.eq("userId", profile._id)).collect()).map((row) => row.toolId);
  },
});
export const communityPostCount = query({
  args: {}, handler: async (ctx) => { const profile = await requireCurrentProfile(ctx); return (await ctx.db.query("communityPosts").withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id)).collect()).length; },
});
