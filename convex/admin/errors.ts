import { v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { notFound } from "../lib/errors";

/** Open (unresolved) errors, most recently seen first. */
export const list = staffQuery({
  permission: "audit.read_all",
  args: { includeResolved: v.optional(v.boolean()) },
  handler: async (ctx, { includeResolved }) => {
    const rows = await ctx.db.query("clientErrors").withIndex("by_last_seen").order("desc").take(200);
    return rows
      .filter((r) => includeResolved || r.resolvedAt === undefined)
      .map((r) => ({ _id: r._id, source: r.source, message: r.message, stack: r.stack ?? null, route: r.route ?? null, count: r.count, firstSeen: r.firstSeen, lastSeen: r.lastSeen, resolved: r.resolvedAt !== undefined }));
  },
});

export const summary = staffQuery({
  permission: "audit.read_all",
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - 24 * 3600_000;
    const rows = await ctx.db.query("clientErrors").withIndex("by_last_seen", (q) => q.gte("lastSeen", since)).take(200);
    const open = rows.filter((r) => r.resolvedAt === undefined);
    return { openLast24h: open.length, occurrencesLast24h: open.reduce((n, r) => n + r.count, 0) };
  },
});

export const resolve = staffMutation({
  permission: "staff.manage",
  args: { errorId: v.id("clientErrors") },
  handler: async (ctx, args, { staff }, log) => {
    const e = await ctx.db.get(args.errorId);
    if (!e) throw notFound("Error");
    await ctx.db.patch(e._id, { resolvedAt: Date.now(), resolvedBy: staff._id });
    await log({ action: "ops.resolve_error", targetType: "client_error", targetId: e._id, targetLabel: e.message.slice(0, 80) });
    return null;
  },
});
