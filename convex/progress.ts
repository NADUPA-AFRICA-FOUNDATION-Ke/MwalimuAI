import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("userProgress").withIndex("by_user", (q) => q.eq("userId", profile._id)).collect();
  },
});

export const save = mutation({
  args: {
    moduleId: v.id("modules"), lessonId: v.optional(v.id("lessons")),
    status: v.union(v.literal("not_started"), v.literal("in_progress"), v.literal("completed")),
    completionPercentage: v.number(), timeSpentMinutes: v.number(), quizScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const existing = await ctx.db.query("userProgress").withIndex("by_user_and_module", (q) => q.eq("userId", profile._id).eq("moduleId", args.moduleId)).first();
    const now = Date.now();
    const patch = { ...args, userId: profile._id, lastAccessedAt: now, updatedAt: now, ...(args.status !== "not_started" ? { startedAt: existing?.startedAt ?? now } : {}), ...(args.status === "completed" ? { completedAt: now } : {}) };
    if (existing) { await ctx.db.patch(existing._id, patch); return existing._id; }
    return await ctx.db.insert("userProgress", patch);
  },
});
