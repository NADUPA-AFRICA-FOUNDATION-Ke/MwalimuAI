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
