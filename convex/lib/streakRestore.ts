import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { fail } from "./errors";
import { MAX_RESTORE_LOOKBACK_DAYS } from "./permissions";
import { addDays, dateRange, daysBetween } from "./streakMath";
import { requireDateKey } from "./validation";
import { describeDates, notify } from "./notices";

const HISTORY_DAYS = 400;
const OVERRIDE_MAX_DAYS = 365;

/** The user's activity rows over the last ~400 days (enough to compute any streak). */
export async function loadActivity(ctx: QueryCtx | MutationCtx, profileId: Id<"profiles">, today: string) {
  return await ctx.db
    .query("activityLog")
    .withIndex("by_user_and_date", (q) => q.eq("userId", profileId).gte("date", addDays(today, -HISTORY_DAYS)))
    .take(5000);
}

/** Days in [from,to] with no activity row. */
export function missingDays(rows: Doc<"activityLog">[], fromDate: string, toDate: string) {
  const have = new Set(rows.map((r) => r.date));
  const missing = dateRange(fromDate, toDate).filter((d) => !have.has(d));
  return { have, missing };
}

/** Throws unless [fromDate,toDate] is a past EAT range within the allowed look-back. */
export function validateRestoreWindow(fromDate: string, toDate: string, today: string, override: boolean) {
  const from = requireDateKey(fromDate, "fromDate"),
    to = requireDateKey(toDate, "toDate");
  const maxDays = override ? OVERRIDE_MAX_DAYS : MAX_RESTORE_LOOKBACK_DAYS;
  if (from > to) throw fail("INVALID_ARGUMENT", "Start date must be on or before end date");
  if (to >= today) throw fail("INVALID_ARGUMENT", "Only past days can be restored (today is still in progress)");
  if (daysBetween(from, today) > maxDays) {
    throw fail("LOOKBACK_EXCEEDED", `Streaks can only be restored up to ${maxDays} days back`);
  }
  return { from, to };
}

/** Inserts flagged `restored` activity rows plus the adjustment record that explains them. */
export async function restoreDays(
  ctx: MutationCtx,
  args: {
    profileId: Id<"profiles">;
    dates: string[];
    staffId: Id<"staff">;
    reason: string;
    ticketRef?: string;
    incidentId?: Id<"incidents">;
  },
) {
  const adjustmentId = await ctx.db.insert("streakAdjustments", {
    profileId: args.profileId,
    dates: args.dates,
    reason: args.reason,
    staffId: args.staffId,
    createdAt: Date.now(),
    ...(args.ticketRef ? { ticketRef: args.ticketRef } : {}),
    ...(args.incidentId ? { incidentId: args.incidentId } : {}),
  });
  for (const date of args.dates) {
    await ctx.db.insert("activityLog", {
      userId: args.profileId,
      date,
      type: "login",
      source: "restored",
      adjustmentId,
      createdAt: Date.now(),
      metadata: { restored: true },
    });
  }
  await notify(ctx, args.profileId, {
    title: "Your streak was restored",
    body: `Support restored ${describeDates(args.dates)} on your streak${args.ticketRef ? ` (ticket ${args.ticketRef})` : ""}.`,
    link: "/dashboard",
  });
  return adjustmentId;
}
