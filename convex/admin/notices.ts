import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireStaff, staffQuery } from "../lib/staff";

/** The latest support alerts for this staff member, and how many arrived since they last looked. */
export const mine = staffQuery({
  permission: "tickets.read",
  args: {},
  handler: async (ctx, _a, { staff }) => {
    const rows = await ctx.db.query("staffNotices").withIndex("by_created").order("desc").take(30);
    const seen = staff.noticesSeenAt ?? 0;
    return {
      unread: rows.filter((r) => r.createdAt > seen).length,
      latestAt: rows[0]?.createdAt ?? 0,
      items: rows.map((r) => ({ _id: r._id, kind: r.kind, title: r.title, body: r.body, link: r.link, createdAt: r.createdAt, unread: r.createdAt > seen })),
    };
  },
});

/** Reading alerts changes nothing important, so it is not audited. */
export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { staff } = await requireStaff(ctx, "tickets.read");
    await ctx.db.patch(staff._id, { noticesSeenAt: Date.now() });
    return null;
  },
});
