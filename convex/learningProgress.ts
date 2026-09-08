import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("learningProgress").withIndex("by_user", (q) => q.eq("userId", profile._id)).collect();
  },
});

export const save = mutation({
  args: { programId: v.string(), progress: v.any() },
  handler: async (ctx, { programId, progress }) => {
    const profile = await requireCurrentProfile(ctx);
    const existing = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", programId)).unique();
    const value = {
      userId: profile._id, programId,
      completedLessons: progress.completedLessons ?? [], reflections: progress.reflections ?? {},
      ...(progress.preAssessment ? { preAssessment: progress.preAssessment } : {}),
      ...(progress.postAssessment ? { postAssessment: progress.postAssessment } : {}),
      ...(progress.assignment ? { assignment: progress.assignment } : {}),
      ...(progress.certificateEarnedAt ? { certificateEarnedAt: progress.certificateEarnedAt } : {}),
      ...(progress.certificateSerial ? { certificateSerial: progress.certificateSerial } : {}),
      cohortJoined: progress.cohortJoined ?? false, updatedAt: Date.now(),
    };
    if (existing) { await ctx.db.patch(existing._id, value); return existing._id; }
    return await ctx.db.insert("learningProgress", value);
  },
});
