import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { fail } from "./lib/errors";
import { bump, readCounters } from "./lib/analytics";
import { eatDateKey } from "./lib/streakMath";
import { readAiSettings } from "./lib/settings";

const TOOLS = ["chat", "tools", "assignment-review", "rehearsal", "detect-ai"];

async function isPaid(ctx: Parameters<typeof requireCurrentProfile>[0], profileId: string) {
  const sub = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profileId as never)).first();
  return Boolean(sub && sub.plan !== "free" && (sub.status === "active" || sub.status === "trialing"));
}

/**
 * Called by every learner AI route before it spends money. Counts one request against the learner's daily
 * allowance and the platform-wide ceiling, or refuses with a message that is safe to show them.
 */
export const consume = mutation({
  args: { tool: v.string() },
  returns: v.object({ remaining: v.number(), limit: v.number() }),
  handler: async (ctx, { tool }) => {
    const profile = await requireCurrentProfile(ctx);
    const settings = await readAiSettings(ctx);
    if (settings.paused) throw fail("AI_PAUSED", "The AI tools are paused for a short while. Please try again later.");
    const day = eatDateKey(Date.now());
    const label = TOOLS.includes(tool) ? tool : "other";
    const totalKey = `ai:${day}:total`;
    const total = (await readCounters(ctx, [totalKey])).get(totalKey) ?? 0;
    if (total >= settings.dailyGlobal) throw fail("AI_BUSY", "The AI tools are very busy today. Please try again tomorrow.");

    const limit = (await isPaid(ctx, profile._id)) ? settings.dailyPaid : settings.dailyFree;
    const row = await ctx.db.query("aiUsage").withIndex("by_profile_and_day", (q) => q.eq("profileId", profile._id).eq("day", day)).unique();
    const used = row?.count ?? 0;
    if (used >= limit) throw fail("AI_LIMIT", `You have used today's AI allowance (${limit} requests). It resets at midnight Kenya time.${limit < settings.dailyPaid ? " A Professional plan raises it." : ""}`);
    if (row) await ctx.db.patch(row._id, { count: used + 1 });
    else await ctx.db.insert("aiUsage", { profileId: profile._id, day, count: 1 });
    await bump(ctx, totalKey);
    await bump(ctx, `ai:${day}:${label}`);
    return { remaining: limit - used - 1, limit };
  },
});

export const mine = query({
  args: {},
  returns: v.object({ used: v.number(), limit: v.number() }),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const settings = await readAiSettings(ctx);
    const day = eatDateKey(Date.now());
    const row = await ctx.db.query("aiUsage").withIndex("by_profile_and_day", (q) => q.eq("profileId", profile._id).eq("day", day)).unique();
    return { used: row?.count ?? 0, limit: (await isPaid(ctx, profile._id)) ? settings.dailyPaid : settings.dailyFree };
  },
});
