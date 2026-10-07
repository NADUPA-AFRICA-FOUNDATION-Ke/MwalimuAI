import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireCurrentProfile } from "./lib/auth";
import { fuzzyScore } from "./lib/fuzzy";
import { schoolOf } from "./lib/schoolAccess";

/**
 * The server half of in-app search: things that are private or change often. Each group only ever contains what
 * this person may open: active community posts, and their own journal, tickets and school work (plus, for school
 * leadership, their school's assignments). Learning content and help articles are searched in the browser.
 */
const LIMIT = 6;
const snippet = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

type Hit = { id: string; title: string; detail: string; href: string; score: number };
const top = (hits: Hit[]) => hits.filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, LIMIT).map(({ score: _s, ...h }) => h);

export const global = query({
  args: { q: v.string() },
  handler: async (ctx, { q: raw }) => {
    const profile = await requireCurrentProfile(ctx);
    const q = raw.trim().slice(0, 100);
    if (q.length < 2) return { community: [], journal: [], tickets: [], work: [] };
    const score = (title: string, body = "") => fuzzyScore(q, title) * 2 + fuzzyScore(q, body);

    // Community: full-text index first, then a typo-tolerant pass over recent posts.
    const posts = new Map<string, Doc<"communityPosts">>();
    for (const p of await ctx.db.query("communityPosts").withSearchIndex("search_title", (s) => s.search("title", q).eq("status", "active")).take(20)) posts.set(p._id, p);
    for (const p of await ctx.db.query("communityPosts").withSearchIndex("search_content", (s) => s.search("content", q).eq("status", "active")).take(20)) posts.set(p._id, p);
    for (const p of await ctx.db.query("communityPosts").withIndex("by_status_and_created_at", (i) => i.eq("status", "active")).order("desc").take(200)) posts.set(p._id, p);
    const community = top([...posts.values()].map((p) => ({ id: p._id, title: p.title, detail: `${p.category} · ${p.authorName}`, href: `/dashboard/community#${p._id}`, score: score(p.title, p.content) })));

    const entries = await ctx.db.query("journalEntries").withIndex("by_user_and_created_at", (i) => i.eq("userId", profile._id)).order("desc").take(300);
    const journal = top(entries.map((e) => ({ id: e._id, title: e.title || e.entryDate, detail: snippet(e.content), href: "/dashboard/journal", score: score(e.title, e.content) })));

    const mine = await ctx.db.query("tickets").withIndex("by_profile", (i) => i.eq("profileId", profile._id)).order("desc").take(100);
    const tickets = top(mine.map((t) => ({ id: t._id, title: t.subject, detail: t.number, href: `/dashboard/support/${t._id}`, score: score(`${t.number} ${t.subject}`) })));

    const work: Hit[] = [];
    const targets = await ctx.db.query("assignmentTargets").withIndex("by_profile", (i) => i.eq("profileId", profile._id)).take(200);
    for (const t of targets) {
      const a = await ctx.db.get(t.assignmentId);
      if (a && !a.archivedAt) work.push({ id: t._id, title: a.title, detail: `My work · ${a.skillArea}`, href: `/dashboard/school/work/${t._id}`, score: score(a.title, a.description) });
    }
    const s = await schoolOf(ctx);
    if (s && (s.member.role === "head" || ((s.member.role === "deputy" || s.member.role === "hod") && s.member.canAssign))) {
      for (const a of await ctx.db.query("schoolAssignments").withIndex("by_school", (i) => i.eq("schoolId", s.school._id)).order("desc").take(200)) {
        if (!a.archivedAt) work.push({ id: a._id, title: a.title, detail: `School assignment · ${a.skillArea}`, href: `/dashboard/school/assignments/${a._id}`, score: score(a.title, a.description) });
      }
    }
    return { community, journal, tickets, work: top(work) };
  },
});
