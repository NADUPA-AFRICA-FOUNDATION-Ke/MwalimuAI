import { v } from "convex/values";
import { staffQuery } from "../lib/staff";
import { notFound } from "../lib/errors";
import { addDays, eatDateKey } from "../lib/streakMath";

/**
 * What a learner has actually done, for support to see. Counts and timestamps only:
 * journal text, AI chats and tool outputs are deliberately not exposed.
 */
export const overview = staffQuery({
  permission: "users.read",
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const p = await ctx.db.get(profileId);
    if (!p) throw notFound("User");
    const today = eatDateKey(Date.now());
    const since = addDays(today, -59);
    const rows = await ctx.db
      .query("activityLog")
      .withIndex("by_user_and_date", (q) => q.eq("userId", profileId).gte("date", since))
      .take(1500);

    const byDay = new Map<string, { types: Set<string>; restored: boolean; last: number }>();
    for (const r of rows) {
      const d = byDay.get(r.date) ?? { types: new Set<string>(), restored: true, last: 0 };
      d.types.add(r.type);
      if (r.source !== "restored") d.restored = false;
      d.last = Math.max(d.last, r.createdAt);
      byDay.set(r.date, d);
    }
    const days = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, d]) => ({ date, types: [...d.types].sort(), restored: d.restored }));

    const since30 = addDays(today, -29);
    const totals: Record<string, number> = {};
    for (const r of rows) if (r.date >= since30 && r.source !== "restored") totals[r.type] = (totals[r.type] ?? 0) + 1;

    const real = rows.filter((r) => r.source !== "restored");
    const lastActiveAt = real.reduce((m, r) => Math.max(m, r.createdAt), 0) || null;

    const [tools, journal, posts, progress, results, tickets] = await Promise.all([
      ctx.db.query("toolsUsed").withIndex("by_user_and_last_used_at", (q) => q.eq("userId", profileId)).order("desc").take(20),
      ctx.db.query("journalEntries").withIndex("by_user_and_created_at", (q) => q.eq("userId", profileId)).take(500),
      ctx.db.query("communityPosts").withIndex("by_user_and_created_at", (q) => q.eq("userId", profileId)).take(500),
      ctx.db.query("learningProgress").withIndex("by_user", (q) => q.eq("userId", profileId)).take(50),
      ctx.db.query("assessmentResults").withIndex("by_user", (q) => q.eq("userId", profileId)).order("desc").take(5),
      ctx.db.query("tickets").withIndex("by_profile", (q) => q.eq("profileId", profileId)).order("desc").take(10),
    ]);

    return {
      today,
      lastActiveAt,
      activeDays30: new Set(real.filter((r) => r.date >= since30).map((r) => r.date)).size,
      totals,
      days: days.slice(0, 45),
      tools: tools.map((t) => ({ toolId: t.toolId, useCount: t.useCount, lastUsedAt: t.lastUsedAt })),
      counts: { journalEntries: journal.length, communityPosts: posts.length },
      programs: progress.map((r) => ({
        programId: r.programId,
        lessonsCompleted: r.completedLessons.length,
        lastLesson: r.completedLessons[r.completedLessons.length - 1] ?? null,
        updatedAt: r.updatedAt,
        certificateSerial: r.certificateSerial ?? null,
      })),
      assessments: results.map((a) => ({ _id: a._id, completedAt: a.completedAt, knowledgeScore: a.knowledgeScore ?? null })),
      tickets: tickets.map((t) => ({ _id: t._id, number: t.number, subject: t.subject, status: t.status, lastMessageAt: t.lastMessageAt })),
    };
  },
});
