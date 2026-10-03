import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { staffQuery } from "../lib/staff";
import { roleHasPermission } from "../lib/permissions";
import { auditHashInput, GENESIS_HASH, sha256Hex } from "../lib/audit";

/**
 * Filters pick the narrowest index. Staff without audit.read_all only ever see their own
 * actions (enforced here, not in the UI). `from`/`to` are createdAt bounds in ms.
 */
export const list = staffQuery({
  permission: "audit.read",
  args: {
    paginationOpts: paginationOptsValidator,
    action: v.optional(v.string()),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args, { staff }) => {
    const sees = roleHasPermission(staff.role, "audit.read_all") ? "everyone" : "own";
    const from = args.from ?? 0,
      to = args.to ?? Number.MAX_SAFE_INTEGER;
    const log = ctx.db.query("auditLog");
    const { targetType, targetId, action } = args;

    if (targetType && targetId) {
      const rows = log
        .withIndex("by_target", (q) =>
          q.eq("targetType", targetType).eq("targetId", targetId).gte("createdAt", from).lt("createdAt", to),
        )
        .order("desc");
      return await (sees === "own" ? rows.filter((q) => q.eq(q.field("actorStaffId"), staff._id)) : rows).paginate(
        args.paginationOpts,
      );
    }
    if (sees === "own") {
      const rows = log
        .withIndex("by_actor", (q) => q.eq("actorStaffId", staff._id).gte("createdAt", from).lt("createdAt", to))
        .order("desc");
      return await (action ? rows.filter((q) => q.eq(q.field("action"), action)) : rows).paginate(args.paginationOpts);
    }
    if (action) {
      return await log
        .withIndex("by_action", (q) => q.eq("action", action).gte("createdAt", from).lt("createdAt", to))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await log
      .withIndex("by_created_at", (q) => q.gte("createdAt", from).lt("createdAt", to))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Re-derives hashes for one page of the chain; the UI walks pages (via cursor) until `isDone`. */
export const verifyChain = staffQuery({
  permission: "audit.read_all",
  args: { paginationOpts: paginationOptsValidator, expectedPrevHash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("auditLog")
      .withIndex("by_created_at")
      .order("asc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 300),
      });
    let prev = args.expectedPrevHash ?? GENESIS_HASH;
    for (const row of page.page) {
      const expected = await sha256Hex(auditHashInput(prev, row));
      if (row.prevHash !== prev || row.hash !== expected) {
        return {
          ok: false as const,
          brokenAtId: row._id,
          checked: 0,
          isDone: true,
          continueCursor: page.continueCursor,
          lastHash: prev,
        };
      }
      prev = row.hash;
    }
    return {
      ok: true as const,
      checked: page.page.length,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
      lastHash: prev,
    };
  },
});
