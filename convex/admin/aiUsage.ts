import { v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { readCounters } from "../lib/analytics";
import { addDays, eatDateKey } from "../lib/streakMath";
import { DEFAULT_AI_SETTINGS, readAiSettings } from "../lib/settings";
import { fail } from "../lib/errors";

const TOOLS = ["chat", "tools", "assignment-review", "rehearsal", "detect-ai", "other"];

/** AI requests per day and tool, today's heaviest users, and the current limits. */
export const overview = staffQuery({
  permission: "analytics.read",
  args: {},
  handler: async (ctx) => {
    const today = eatDateKey(Date.now());
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, -(13 - i)));
    const counters = await readCounters(ctx, days.flatMap((d) => [`ai:${d}:total`, ...TOOLS.map((t) => `ai:${d}:${t}`)]));
    const heavy = await ctx.db.query("aiUsage").withIndex("by_day_and_count", (q) => q.eq("day", today)).order("desc").take(10);
    const users = [];
    for (const u of heavy) {
      const p = await ctx.db.get(u.profileId);
      users.push({ profileId: u.profileId, name: p?.name || p?.email || "Unknown", count: u.count });
    }
    return {
      settings: await readAiSettings(ctx),
      defaults: DEFAULT_AI_SETTINGS,
      days: days.map((d) => ({ date: d, total: counters.get(`ai:${d}:total`) ?? 0, byTool: Object.fromEntries(TOOLS.map((t) => [t, counters.get(`ai:${d}:${t}`) ?? 0])) })),
      heaviestToday: users,
    };
  },
});

export const setLimits = staffMutation({
  permission: "staff.manage",
  requireReason: true,
  args: { dailyFree: v.number(), dailyPaid: v.number(), dailyGlobal: v.number(), paused: v.boolean(), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    for (const [k, n] of [["free limit", args.dailyFree], ["paid limit", args.dailyPaid], ["platform limit", args.dailyGlobal]] as const)
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw fail("INVALID_ARGUMENT", `The ${k} must be a whole number from 0 to 1,000,000`);
    const before = await readAiSettings(ctx);
    const value = { dailyFree: args.dailyFree, dailyPaid: args.dailyPaid, dailyGlobal: args.dailyGlobal, paused: args.paused };
    const row = await ctx.db.query("appSettings").withIndex("by_key", (q) => q.eq("key", "ai")).unique();
    if (row) await ctx.db.patch(row._id, { value, updatedAt: Date.now() });
    else await ctx.db.insert("appSettings", { key: "ai", value, updatedAt: Date.now() });
    await log({ action: "settings.ai_limits", targetType: "settings", targetId: "ai", before, after: value });
    return null;
  },
});
