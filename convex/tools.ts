import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { boundedLimit, requireNonEmpty } from "./lib/validation";

const usedDoc = v.object({
  _id: v.id("toolsUsed"), _creationTime: v.number(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  toolId: v.string(), firstUsedAt: v.number(), lastUsedAt: v.number(), useCount: v.number(),
});
const historyDoc = v.object({
  _id: v.id("toolHistory"), _creationTime: v.number(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  clientId: v.string(), toolId: v.string(), title: v.string(), input: v.any(), output: v.string(),
  promptPreview: v.optional(v.string()), createdAt: v.number(),
});

export const listUsed = query({
  args: {}, returns: v.array(usedDoc),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("toolsUsed").withIndex("by_user_and_last_used_at", (q) => q.eq("userId", profile._id)).order("desc").take(250);
  },
});

export const recordUsed = mutation({
  args: { toolId: v.string(), usedAt: v.optional(v.number()) }, returns: v.id("toolsUsed"),
  handler: async (ctx, { toolId, usedAt }) => {
    const profile = await requireCurrentProfile(ctx); const normalized = requireNonEmpty(toolId, "toolId", 100); const now = usedAt ?? Date.now();
    const existing = await ctx.db.query("toolsUsed").withIndex("by_user_and_tool", (q) => q.eq("userId", profile._id).eq("toolId", normalized)).unique();
    if (existing) { await ctx.db.patch(existing._id, { lastUsedAt: now, useCount: existing.useCount + 1 }); return existing._id; }
    return await ctx.db.insert("toolsUsed", { userId: profile._id, toolId: normalized, firstUsedAt: now, lastUsedAt: now, useCount: 1 });
  },
});

export const listHistory = query({
  args: { toolId: v.optional(v.string()), limit: v.optional(v.number()) }, returns: v.array(historyDoc),
  handler: async (ctx, { toolId, limit }) => {
    const profile = await requireCurrentProfile(ctx); const count = boundedLimit(limit, 50, 200);
    return toolId
      ? await ctx.db.query("toolHistory").withIndex("by_user_tool_and_created_at", (q) => q.eq("userId", profile._id).eq("toolId", toolId)).order("desc").take(count)
      : await ctx.db.query("toolHistory").withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id)).order("desc").take(count);
  },
});

export const saveOutput = mutation({
  args: { clientId: v.string(), toolId: v.string(), title: v.string(), input: v.any(), output: v.string(), promptPreview: v.optional(v.string()) },
  returns: v.id("toolHistory"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx); const clientId = requireNonEmpty(args.clientId, "clientId", 100);
    const existing = await ctx.db.query("toolHistory").withIndex("by_user_and_client_id", (q) => q.eq("userId", profile._id).eq("clientId", clientId)).unique();
    if (existing) return existing._id;
    return await ctx.db.insert("toolHistory", {
      userId: profile._id, clientId, toolId: requireNonEmpty(args.toolId, "toolId", 100),
      title: requireNonEmpty(args.title, "title", 500), input: args.input,
      output: requireNonEmpty(args.output, "output", 500_000),
      ...(args.promptPreview ? { promptPreview: args.promptPreview.slice(0, 2_000) } : {}), createdAt: Date.now(),
    });
  },
});

export const deleteOutput = mutation({
  args: { historyId: v.id("toolHistory") }, returns: v.null(),
  handler: async (ctx, { historyId }) => {
    const profile = await requireCurrentProfile(ctx); const item = await ctx.db.get(historyId);
    if (!item || item.userId !== profile._id) throw new ConvexError({ code: "NOT_FOUND", message: "Tool output not found" });
    await ctx.db.delete(historyId); return null;
  },
});

export const create = saveOutput;
export const listMine = listHistory;
export const removeMine = mutation({
  args: { clientId: v.string() }, returns: v.null(),
  handler: async (ctx, { clientId }) => {
    const profile = await requireCurrentProfile(ctx);
    const item = await ctx.db.query("toolHistory").withIndex("by_user_and_client_id", (q) => q.eq("userId", profile._id).eq("clientId", clientId)).unique();
    if (item) await ctx.db.delete(item._id);
    return null;
  },
});
