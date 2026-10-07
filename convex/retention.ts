import { v } from "convex/values";
import { notify } from "./lib/notices";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { addDays, eatDateKey } from "./lib/streakMath";

const DAY = 86_400_000;
const BATCH = 200;

/**
 * Keeps operational tables from growing forever. Learner content, certificates, streak history and the staff audit
 * log are NOT touched here (they are kept on purpose: see docs/operations.md). Each run does a batch per table and
 * schedules itself again if there is more.
 */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let more = false;

    // Application errors: nobody needs a stack trace from three months ago.
    const errors = await ctx.db.query("clientErrors").withIndex("by_last_seen", (q) => q.lt("lastSeen", now - 90 * DAY)).take(BATCH);
    for (const e of errors) await ctx.db.delete(e._id);
    more ||= errors.length === BATCH;

    // Daily AI allowance rows: only today matters; keep two months for the usage charts' "heaviest users".
    const cutoff = addDays(eatDateKey(now), -60);
    const usage = await ctx.db.query("aiUsage").withIndex("by_day_and_count", (q) => q.lt("day", cutoff)).take(BATCH);
    for (const u of usage) await ctx.db.delete(u._id);
    more ||= usage.length === BATCH;

    // Resolved tickets with no reply for a week become closed (read-only).
    const quiet = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "resolved").lt("lastMessageAt", now - 7 * DAY)).take(100);
    for (const t of quiet) {
      await ctx.db.patch(t._id, { status: "closed", closedAt: now });
      if (t.profileId) await notify(ctx, t.profileId, { title: `Ticket ${t.number} was closed`, body: "It was resolved a week ago with no further reply. Open a new ticket if you need more help.", link: `/dashboard/support/${t._id}` });
    }

    // Closed support tickets: two years after they were last active.
    const oldClosed = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "closed").lt("lastMessageAt", now - 730 * DAY)).take(20);
    for (const t of oldClosed) {
      for (const m of await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(500)) {
        for (const a of m.attachments ?? []) await ctx.storage.delete(a.storageId).catch(() => {});
        await ctx.db.delete(m._id);
      }
      await ctx.db.delete(t._id);
    }

    // Resolved support tickets: two years after they were resolved.
    const old = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "resolved").lt("lastMessageAt", now - 730 * DAY)).take(20);
    for (const t of old) {
      for (const m of await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(500)) await ctx.db.delete(m._id);
      await ctx.db.delete(t._id);
    }
    more ||= old.length === 20;

    // In-app notifications the learner already read or dismissed, after six months.
    // (Unread ones stay until seen.) The index is per learner, so this goes by creation time in small batches.
    const stale = await ctx.db.query("notifications").order("asc").take(BATCH);
    for (const n of stale) if (n.createdAt < now - 180 * DAY && (n.readAt !== undefined || n.dismissedAt !== undefined)) await ctx.db.delete(n._id);

    if (more) await ctx.scheduler.runAfter(0, internal.retention.sweep, {});
  },
});

/**
 * One-off, for after the move from Supabase is confirmed complete. The raw import rows contain personal data
 * (including old auth payloads) that nothing in the app reads any more. NOT scheduled. Run by hand, then check the
 * learner count: npx convex run retention:purgeMigrationRecords '{"confirm":"DELETE-MIGRATION-RECORDS"}'
 */
export const purgeMigrationRecords = internalMutation({
  args: { confirm: v.string() },
  handler: async (ctx, { confirm }) => {
    if (confirm !== "DELETE-MIGRATION-RECORDS") throw new Error("Pass the confirmation phrase to run this");
    const rows = await ctx.db.query("migrationRecords").take(BATCH);
    for (const r of rows) await ctx.db.delete(r._id);
    if (rows.length === BATCH) await ctx.scheduler.runAfter(0, internal.retention.purgeMigrationRecords, { confirm });
    return { deleted: rows.length, moreToDelete: rows.length === BATCH };
  },
});
