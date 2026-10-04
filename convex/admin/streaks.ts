import { ConvexError, v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { MAX_RESTORE_LOOKBACK_DAYS } from "../lib/permissions";
import { computeStreak, eatDateKey } from "../lib/streakMath";
import { loadActivity, missingDays, restoreDays, validateRestoreWindow } from "../lib/streakRestore";
import { fail, notFound } from "../lib/errors";
import { describeDates, notify } from "../lib/notices";

export const get = staffQuery({
  permission: "streaks.read",
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const today = eatDateKey(Date.now());
    const rows = await loadActivity(ctx, profileId, today);
    const restoredDates = new Set(rows.filter((r) => r.source === "restored").map((r) => r.date));
    const adjustments = await ctx.db
      .query("streakAdjustments")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .order("desc")
      .take(25);
    const days = [...new Set(rows.map((r) => r.date))]
      .sort()
      .reverse()
      .map((date) => ({
        date,
        restored: restoredDates.has(date) && !rows.some((r) => r.date === date && r.source !== "restored"),
      }));
    return {
      today,
      streak: computeStreak(
        rows.map((r) => r.date),
        today,
      ),
      streakWithoutRestored: computeStreak(
        rows.filter((r) => r.source !== "restored").map((r) => r.date),
        today,
      ),
      days: days.slice(0, 120),
      adjustments: adjustments.map((a) => ({
        _id: a._id,
        dates: a.dates,
        reason: a.reason,
        ticketRef: a.ticketRef,
        incidentId: a.incidentId,
        createdAt: a.createdAt,
        revokedAt: a.revokedAt,
      })),
      maxLookbackDays: MAX_RESTORE_LOOKBACK_DAYS,
    };
  },
});

export const preview = staffQuery({
  permission: "streaks.read",
  args: {
    profileId: v.id("profiles"),
    fromDate: v.string(),
    toDate: v.string(),
    overrideLookback: v.optional(v.boolean()),
  },
  handler: async (ctx, args, { staff }) => {
    const today = eatDateKey(Date.now());
    const override = args.overrideLookback === true && staff.role === "super_admin";
    // Validation problems are returned, not thrown, so a live-updating form never crashes on a half-typed range.
    let window: { from: string; to: string };
    try {
      window = validateRestoreWindow(args.fromDate, args.toDate, today, override);
    } catch (e) {
      if (e instanceof ConvexError) return { ok: false as const, error: (e.data as { message: string }).message };
      throw e;
    }
    const rows = await loadActivity(ctx, args.profileId, today);
    const { missing } = missingDays(rows, window.from, window.to);
    const before = computeStreak(
      rows.map((r) => r.date),
      today,
    );
    const after = computeStreak([...rows.map((r) => r.date), ...missing], today);
    return { ok: true as const, datesToRestore: missing, before, after };
  },
});

export const restore = staffMutation({
  permission: "streaks.restore",
  requireReason: true,
  args: {
    profileId: v.id("profiles"),
    fromDate: v.string(),
    toDate: v.string(),
    reason: v.string(),
    ticketRef: v.optional(v.string()),
    overrideLookback: v.optional(v.boolean()),
  },
  handler: async (ctx, args, { staff }, log) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw notFound("User");
    if (args.overrideLookback && staff.role !== "super_admin") {
      throw fail("FORBIDDEN", "Only a Super Admin can extend the look-back limit");
    }
    const today = eatDateKey(Date.now());
    const { from, to } = validateRestoreWindow(args.fromDate, args.toDate, today, args.overrideLookback === true);
    const rows = await loadActivity(ctx, profile._id, today);
    const { missing } = missingDays(rows, from, to);
    if (missing.length === 0) throw fail("NOTHING_TO_RESTORE", "Every day in that range already has activity");
    const before = computeStreak(
      rows.map((r) => r.date),
      today,
    );
    const adjustmentId = await restoreDays(ctx, {
      profileId: profile._id,
      dates: missing,
      staffId: staff._id,
      reason: args.reason.trim(),
      ticketRef: args.ticketRef?.trim() || undefined,
    });
    const after = computeStreak([...rows.map((r) => r.date), ...missing], today);
    // A ticketRef that matches one of this learner's tickets gets the outcome posted on the thread.
    const ref = args.ticketRef?.trim().toUpperCase();
    if (ref) {
      const ticket = await ctx.db.query("tickets").withIndex("by_number", (q) => q.eq("number", ref)).first();
      if (ticket && ticket.profileId === profile._id) {
        const now = Date.now();
        await ctx.db.insert("ticketMessages", {
          ticketId: ticket._id,
          author: "staff",
          staffId: staff._id,
          authorLabel: "Mwalimu AI Support",
          body: `We restored your streak for ${describeDates(missing)}. Your current streak is now ${after.current} day${after.current === 1 ? "" : "s"}.`,
          internal: false,
          createdAt: now,
        });
        await ctx.db.patch(ticket._id, { status: "pending_user", lastMessageAt: now, lastMessageBy: "staff", assignedTo: ticket.assignedTo ?? staff._id });
      }
    }
    await log({
      action: "streak.restore",
      targetType: "profile",
      targetId: profile._id,
      targetLabel: profile.email ?? profile.name,
      before,
      after: { ...after, datesRestored: missing, adjustmentId, ticketRef: args.ticketRef ?? null },
    });
    return { adjustmentId, datesRestored: missing, before, after };
  },
});

/** Undo a restoration. Only rows this adjustment created are removed; real activity is untouched. */
export const revoke = staffMutation({
  permission: "streaks.restore",
  requireReason: true,
  args: { adjustmentId: v.id("streakAdjustments"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const adj = await ctx.db.get(args.adjustmentId);
    if (!adj) throw notFound("Restoration");
    if (adj.revokedAt !== undefined) throw fail("NO_CHANGES", "Already revoked");
    let removed = 0;
    for (const date of adj.dates) {
      const rows = await ctx.db
        .query("activityLog")
        .withIndex("by_user_and_date", (q) => q.eq("userId", adj.profileId).eq("date", date))
        .take(20);
      for (const row of rows)
        if (row.adjustmentId === adj._id) {
          await ctx.db.delete(row._id);
          removed++;
        }
    }
    await ctx.db.patch(adj._id, { revokedAt: Date.now(), revokedBy: staff._id });
    await notify(ctx, adj.profileId, {
      title: "A streak restoration was reversed",
      body: `Support reversed the restoration for ${describeDates(adj.dates)}. Contact support if you have questions.`,
      link: "/dashboard/support",
    });
    await log({
      action: "streak.revoke_restore",
      targetType: "profile",
      targetId: adj.profileId,
      before: { dates: adj.dates },
      after: { rowsRemoved: removed, adjustmentId: adj._id },
    });
    return { removed };
  },
});
