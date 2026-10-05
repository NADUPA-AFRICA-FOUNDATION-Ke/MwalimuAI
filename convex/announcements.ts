import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";

/**
 * Staff announcements that match this learner (everyone, their county, or a level they teach). One shared row per
 * announcement, so a message to every learner costs the same as one to a single county. Read/dismissed state
 * lives in the learner's own notification state, keyed `ann:<id>`.
 */
export const listMine = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("announcements"), title: v.string(), body: v.string(), link: v.optional(v.string()), startsAt: v.number() })),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const now = Date.now();
    const rows = await ctx.db.query("announcements").withIndex("by_start", (q) => q.lte("startsAt", now)).order("desc").take(40);
    const county = (profile.county ?? "").trim().toLowerCase();
    return rows
      .filter((a) => a.cancelledAt === undefined && (a.endsAt === undefined || a.endsAt > now))
      .filter((a) => a.audience.all || a.audience.counties.some((c) => c.toLowerCase() === county) || profile.grades.some((g) => a.audience.levels.includes(g)))
      .slice(0, 15)
      .map((a) => ({ _id: a._id, title: a.title, body: a.body, link: a.link, startsAt: a.startsAt }));
  },
});
