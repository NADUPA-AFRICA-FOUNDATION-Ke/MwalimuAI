import { v } from "convex/values";
import { query } from "./_generated/server";

export const listPublished = query({
  args: { programId: v.optional(v.string()) },
  handler: async (ctx, { programId }) => {
    const rows = programId
      ? await ctx.db.query("modules").withIndex("by_program_published_and_order", (q) => q.eq("programId", programId).eq("isPublished", true)).collect()
      : await ctx.db.query("modules").withIndex("by_published_and_order", (q) => q.eq("isPublished", true)).collect();
    return rows;
  },
});

export const lessons = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, { moduleId }) => await ctx.db.query("lessons").withIndex("by_module_and_order", (q) => q.eq("moduleId", moduleId)).collect(),
});
