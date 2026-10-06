import { v } from "convex/values";
import { staffQuery } from "../lib/staff";

/** A learner's assessment sittings with counts of each integrity event, newest first. Evidence for staff, not a verdict. */
export const forUser = staffQuery({
  permission: "users.read",
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const rows = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_profile_and_program", (q) => q.eq("profileId", profileId))
      .take(200);
    return rows
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 50)
      .map((a) => {
        const flags: Record<string, number> = {};
        for (const e of a.events) flags[e.type] = (flags[e.type] ?? 0) + 1;
        return { _id: a._id, programId: a.programId, kind: a.kind, startedAt: a.startedAt, submittedAt: a.submittedAt ?? null, score: a.score ?? null, total: a.total ?? null, assistive: a.assistive, flags, events: a.events.slice(-40) };
      });
  },
});

const SERIOUS = ["devtools_open", "screenshot_key", "paste", "large_insert", "second_tab", "print"];

/** Every learner's recent sittings, newest first, with who sat them. `flaggedOnly` keeps those with a serious event. */
export const recent = staffQuery({
  permission: "users.read",
  args: { flaggedOnly: v.boolean() },
  handler: async (ctx, { flaggedOnly }) => {
    const rows = await ctx.db.query("assessmentAttempts").withIndex("by_started").order("desc").take(300);
    const out = [];
    for (const a of rows) {
      const flags: Record<string, number> = {};
      for (const e of a.events) flags[e.type] = (flags[e.type] ?? 0) + 1;
      const serious = SERIOUS.filter((k) => flags[k]);
      if (flaggedOnly && serious.length === 0) continue;
      const p = await ctx.db.get(a.profileId);
      out.push({ _id: a._id, profileId: a.profileId, learner: p?.name || p?.email || "Learner", programId: a.programId, kind: a.kind, startedAt: a.startedAt, submittedAt: a.submittedAt ?? null, score: a.score ?? null, total: a.total ?? null, assistive: a.assistive, flags, serious });
      if (out.length >= 100) break;
    }
    return out;
  },
});

/** Sittings with a serious event in the last 7 days, for the dashboard. */
export const flaggedCount = staffQuery({
  permission: "users.read",
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - 7 * 86_400_000;
    const rows = await ctx.db.query("assessmentAttempts").withIndex("by_started", (q) => q.gt("startedAt", since)).take(1000);
    return rows.filter((a) => a.events.some((e) => SERIOUS.includes(e.type))).length;
  },
});
