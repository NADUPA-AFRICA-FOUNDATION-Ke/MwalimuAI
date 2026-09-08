import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { boundedLimit, requireDateKey, requireIntegerRange, requireNonEmpty } from "./lib/validation";

const entryDoc = v.object({
  _id: v.id("journalEntries"), _creationTime: v.number(), userId: v.id("profiles"),
  legacyId: v.optional(v.string()), clientId: v.string(), entryDate: v.string(), title: v.string(),
  content: v.string(), mood: v.number(), createdAt: v.number(), updatedAt: v.number(),
});

export const listMine = query({
  args: { limit: v.optional(v.number()) }, returns: v.array(entryDoc),
  handler: async (ctx, { limit }) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("journalEntries").withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id))
      .order("desc").take(boundedLimit(limit, 100, 250));
  },
});

export const byDate = query({
  args: { entryDate: v.string() }, returns: v.union(v.null(), entryDoc),
  handler: async (ctx, { entryDate }) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("journalEntries").withIndex("by_user_and_entry_date", (q) =>
      q.eq("userId", profile._id).eq("entryDate", requireDateKey(entryDate, "entryDate"))).order("desc").first();
  },
});

export const save = mutation({
  args: { clientId: v.string(), entryDate: v.string(), title: v.string(), content: v.string(), mood: v.number() },
  returns: v.id("journalEntries"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const clientId = requireNonEmpty(args.clientId, "clientId", 100);
    const value = {
      entryDate: requireDateKey(args.entryDate, "entryDate"), title: requireNonEmpty(args.title, "title", 500),
      content: requireNonEmpty(args.content, "content", 100_000), mood: args.mood, updatedAt: Date.now(),
    };
    requireIntegerRange(args.mood, "mood", 1, 5);
    const existing = await ctx.db.query("journalEntries").withIndex("by_user_and_client_id", (q) =>
      q.eq("userId", profile._id).eq("clientId", clientId)).unique();
    if (existing) { await ctx.db.patch(existing._id, value); return existing._id; }
    return await ctx.db.insert("journalEntries", { ...value, userId: profile._id, clientId, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { entryId: v.id("journalEntries") }, returns: v.null(),
  handler: async (ctx, { entryId }) => {
    const profile = await requireCurrentProfile(ctx); const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== profile._id) throw new ConvexError({ code: "NOT_FOUND", message: "Journal entry not found" });
    await ctx.db.delete(entryId); return null;
  },
});
