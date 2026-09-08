import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { boundedLimit } from "./lib/validation";

const notificationType = v.union(v.literal("course"), v.literal("achievement"), v.literal("community"), v.literal("announcement"));
const notificationDoc = v.object({
  _id: v.id("notifications"), _creationTime: v.number(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  dedupeKey: v.optional(v.string()), type: notificationType, title: v.string(), message: v.string(), link: v.optional(v.string()),
  createdAt: v.number(), readAt: v.optional(v.number()), dismissedAt: v.optional(v.number()), expiresAt: v.optional(v.number()),
});

export const listMine = query({
  args: { includeDismissed: v.optional(v.boolean()), limit: v.optional(v.number()) }, returns: v.array(notificationDoc),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx); const now = Date.now();
    const rows = await ctx.db.query("notifications").withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id))
      .order("desc").take(boundedLimit(args.limit, 50, 200));
    return rows.filter((row) => (args.includeDismissed || row.dismissedAt === undefined) && (row.expiresAt === undefined || row.expiresAt > now));
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications"), read: v.optional(v.boolean()) }, returns: v.null(),
  handler: async (ctx, { notificationId, read }) => {
    const profile = await requireCurrentProfile(ctx); const notification = await ctx.db.get(notificationId);
    if (!notification || notification.userId !== profile._id) throw new ConvexError({ code: "NOT_FOUND", message: "Notification not found" });
    await ctx.db.patch(notificationId, { readAt: read === false ? undefined : Date.now() }); return null;
  },
});

export const markAllRead = mutation({
  args: {}, returns: v.number(),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx); const rows = await ctx.db.query("notifications")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id)).order("desc").take(500);
    const now = Date.now(); let changed = 0;
    for (const row of rows) if (row.readAt === undefined && row.dismissedAt === undefined) { await ctx.db.patch(row._id, { readAt: now }); changed++; }
    return changed;
  },
});

export const dismiss = mutation({
  args: { notificationId: v.id("notifications") }, returns: v.null(),
  handler: async (ctx, { notificationId }) => {
    const profile = await requireCurrentProfile(ctx); const notification = await ctx.db.get(notificationId);
    if (!notification || notification.userId !== profile._id) throw new ConvexError({ code: "NOT_FOUND", message: "Notification not found" });
    await ctx.db.patch(notificationId, { dismissedAt: Date.now() }); return null;
  },
});

export const dismissAll = mutation({
  args: {}, returns: v.number(),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx); const rows = await ctx.db.query("notifications")
      .withIndex("by_user_and_created_at", (q) => q.eq("userId", profile._id)).order("desc").take(500);
    const now = Date.now(); let changed = 0;
    for (const row of rows) if (row.dismissedAt === undefined) { await ctx.db.patch(row._id, { dismissedAt: now }); changed++; }
    return changed;
  },
});
