import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { requireArrayLimit, requireNonEmpty } from "./lib/validation";

const category = v.union(v.literal("assessment"), v.literal("pedagogy"), v.literal("digital"), v.literal("community"), v.literal("wellbeing"), v.literal("other"));
const milestone = v.object({ id: v.string(), text: v.string(), completed: v.boolean(), completedAt: v.optional(v.string()) });
const goalDoc = v.object({
  _id: v.id("goals"), _creationTime: v.number(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  clientId: v.optional(v.string()), title: v.string(), category, milestones: v.array(milestone),
  createdAt: v.number(), updatedAt: v.number(),
});

function normalizedMilestones(items: Array<{ id: string; text: string; completed: boolean; completedAt?: string }>) {
  requireArrayLimit(items, "milestones", 50);
  return items.map((item) => ({
    id: requireNonEmpty(item.id, "milestone id", 100), text: requireNonEmpty(item.text, "milestone text", 500),
    completed: item.completed, ...(item.completedAt ? { completedAt: item.completedAt.slice(0, 100) } : {}),
  }));
}

export const listMine = query({
  args: {}, returns: v.array(goalDoc),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("goals").withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id)).order("asc").take(100);
  },
});

export const create = mutation({
  args: { title: v.string(), category, milestones: v.array(milestone), clientId: v.optional(v.string()) },
  returns: v.id("goals"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    if (args.clientId) {
      const existing = await ctx.db.query("goals").withIndex("by_user_and_client_id", (q) =>
        q.eq("userId", profile._id).eq("clientId", args.clientId)).unique();
      if (existing) return existing._id;
    }
    const now = Date.now();
    return await ctx.db.insert("goals", {
      userId: profile._id, title: requireNonEmpty(args.title, "title", 300), category: args.category,
      milestones: normalizedMilestones(args.milestones), createdAt: now, updatedAt: now,
      ...(args.clientId ? { clientId: requireNonEmpty(args.clientId, "clientId", 100) } : {}),
    });
  },
});

export const update = mutation({
  args: { goalId: v.id("goals"), title: v.optional(v.string()), category: v.optional(category), milestones: v.optional(v.array(milestone)) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx); const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== profile._id) throw new ConvexError({ code: "NOT_FOUND", message: "Goal not found" });
    await ctx.db.patch(args.goalId, {
      ...(args.title !== undefined ? { title: requireNonEmpty(args.title, "title", 300) } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.milestones !== undefined ? { milestones: normalizedMilestones(args.milestones) } : {}),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") }, returns: v.null(),
  handler: async (ctx, { goalId }) => {
    const profile = await requireCurrentProfile(ctx); const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== profile._id) throw new ConvexError({ code: "NOT_FOUND", message: "Goal not found" });
    await ctx.db.delete(goalId); return null;
  },
});
