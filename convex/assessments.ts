import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { requireArrayLimit, requireIntegerRange } from "./lib/validation";

const resultDoc = v.object({
  _id: v.id("assessmentResults"), _creationTime: v.number(), userId: v.id("profiles"),
  legacyId: v.optional(v.string()), responses: v.any(), knowledgeScore: v.optional(v.number()),
  recommendedProgramIds: v.optional(v.array(v.string())), completedAt: v.number(), updatedAt: v.number(),
});

export const mine = query({
  args: {}, returns: v.union(v.null(), resultDoc),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("assessmentResults").withIndex("by_user", (q) => q.eq("userId", profile._id)).unique();
  },
});

export const save = mutation({
  args: {
    responses: v.any(), knowledgeScore: v.optional(v.number()),
    recommendedProgramIds: v.optional(v.array(v.string())), completedAt: v.optional(v.number()),
  },
  returns: v.id("assessmentResults"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    if (args.knowledgeScore !== undefined) requireIntegerRange(args.knowledgeScore, "knowledgeScore", 0, 10_000);
    if (args.recommendedProgramIds) requireArrayLimit(args.recommendedProgramIds, "recommendedProgramIds", 50);
    const existing = await ctx.db.query("assessmentResults").withIndex("by_user", (q) => q.eq("userId", profile._id)).unique();
    const value = {
      responses: args.responses, completedAt: args.completedAt ?? Date.now(), updatedAt: Date.now(),
      ...(args.knowledgeScore !== undefined ? { knowledgeScore: args.knowledgeScore } : {}),
      ...(args.recommendedProgramIds !== undefined ? { recommendedProgramIds: args.recommendedProgramIds } : {}),
    };
    if (existing) { await ctx.db.patch(existing._id, value); return existing._id; }
    return await ctx.db.insert("assessmentResults", { ...value, userId: profile._id });
  },
});

export const clear = mutation({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const existing = await ctx.db.query("assessmentResults").withIndex("by_user", (q) => q.eq("userId", profile._id)).unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});
