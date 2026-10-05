import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentProfile } from "./lib/auth";
import { fail } from "./lib/errors";
import { requireNonEmpty } from "./lib/validation";
import { addDays, computeStreak, eatDateKey } from "./lib/streakMath";

const MAX_MEMBERS = 200;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L: easy to read out in a staff room

export async function newSchoolCode(ctx: Pick<MutationCtx, "db">) {
  for (let i = 0; i < 20; i++) {
    const code = Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    if (!(await ctx.db.query("schools").withIndex("by_code", (q) => q.eq("code", code)).first())) return code;
  }
  throw fail("TRY_AGAIN", "Could not create a join code. Please try again.");
}

async function membership(ctx: QueryCtx, profileId: Id<"profiles">) {
  const m = await ctx.db.query("schoolMembers").withIndex("by_profile", (q) => q.eq("profileId", profileId).eq("status", "active")).first();
  const school = m ? await ctx.db.get(m.schoolId) : null;
  return m && school && school.archivedAt === undefined ? { m, school } : null;
}

async function requireHead(ctx: QueryCtx) {
  const profile = await requireCurrentProfile(ctx);
  const mem = await membership(ctx, profile._id);
  if (!mem || mem.m.role !== "head") throw fail("FORBIDDEN", "Only the school's head teacher can do this");
  return { profile, school: mem.school };
}

/** What the learner's relationship to a school is, and what the head can see of them. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const mem = await membership(ctx, profile._id);
    const sub = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).first();
    const canCreate = Boolean(sub && sub.plan === "school" && (sub.status === "active" || sub.status === "trialing"));
    if (!mem) return { state: "none" as const, canCreate };
    const head = mem.m.role === "head";
    return {
      state: head ? ("head" as const) : ("teacher" as const),
      canCreate,
      school: { _id: mem.school._id, name: mem.school.name, county: mem.school.county ?? null, ...(head ? { code: mem.school.code } : {}) },
    };
  },
});

export const create = mutation({
  args: { name: v.string(), county: v.optional(v.string()) },
  returns: v.id("schools"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    if (await membership(ctx, profile._id)) throw fail("ALREADY_IN_SCHOOL", "Leave your current school first");
    const sub = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).first();
    if (!(sub && sub.plan === "school" && (sub.status === "active" || sub.status === "trialing")))
      throw fail("PLAN_REQUIRED", "Creating a school needs the School plan. Contact us if your school would like to start.");
    const name = requireNonEmpty(args.name, "School name", 120);
    const now = Date.now();
    const id = await ctx.db.insert("schools", { name, ...(args.county?.trim() ? { county: args.county.trim().slice(0, 60) } : {}), code: await newSchoolCode(ctx), headId: profile._id, createdAt: now });
    await ctx.db.insert("schoolMembers", { schoolId: id, profileId: profile._id, role: "head", status: "active", joinedAt: now });
    return id;
  },
});

/** Join a school with its code. Joining means the head can see your learning progress (not your journal or AI chats). */
export const join = mutation({
  args: { code: v.string() },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, { code }) => {
    const profile = await requireCurrentProfile(ctx);
    const norm = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const school = norm.length === 8 ? await ctx.db.query("schools").withIndex("by_code", (q) => q.eq("code", norm)).unique() : null;
    if (!school || school.archivedAt !== undefined) throw fail("NOT_FOUND", "That code did not match a school. Check it with your head teacher.");
    if (await membership(ctx, profile._id)) throw fail("ALREADY_IN_SCHOOL", "You are already in a school. Leave it first to join another.");
    const members = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", school._id).eq("status", "active")).take(MAX_MEMBERS + 1);
    if (members.length > MAX_MEMBERS) throw fail("SCHOOL_FULL", "This school has reached its limit. Ask your head teacher.");
    await ctx.db.insert("schoolMembers", { schoolId: school._id, profileId: profile._id, role: "teacher", status: "active", joinedAt: Date.now() });
    return { name: school.name };
  },
});

export const leave = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const mem = await membership(ctx, profile._id);
    if (!mem) return null;
    if (mem.m.role === "head") throw fail("HEAD_CANNOT_LEAVE", "A head teacher cannot leave. Contact support to hand the school over.");
    await ctx.db.patch(mem.m._id, { status: "left", leftAt: Date.now() });
    return null;
  },
});

export const regenerateCode = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { school } = await requireHead(ctx);
    const code = await newSchoolCode(ctx);
    await ctx.db.patch(school._id, { code });
    return code;
  },
});

export const removeMember = mutation({
  args: { profileId: v.id("profiles") },
  returns: v.null(),
  handler: async (ctx, { profileId }) => {
    const { school } = await requireHead(ctx);
    const m = await ctx.db.query("schoolMembers").withIndex("by_profile", (q) => q.eq("profileId", profileId).eq("status", "active")).first();
    if (!m || m.schoolId !== school._id || m.role === "head") throw fail("NOT_FOUND", "That teacher is not in your school");
    await ctx.db.patch(m._id, { status: "removed", leftAt: Date.now() });
    return null;
  },
});

/** Progress facts for one teacher. Deliberately limited to learning progress: no journal, AI chats, tickets or contact details. */
async function teacherProgress(ctx: QueryCtx, p: Doc<"profiles">, today: string) {
  const [progress, certs, activity] = await Promise.all([
    ctx.db.query("learningProgress").withIndex("by_user", (q) => q.eq("userId", p._id)).take(30),
    ctx.db.query("certificates").withIndex("by_user", (q) => q.eq("userId", p._id)).take(30),
    ctx.db.query("activityLog").withIndex("by_user_and_date", (q) => q.eq("userId", p._id).gte("date", addDays(today, -60))).take(400),
  ]);
  const real = activity.filter((a) => a.source !== "restored");
  const dates = real.map((a) => a.date);
  const last = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  return {
    profileId: p._id,
    name: p.name || "Teacher",
    subjects: p.subjects,
    programsStarted: progress.length,
    programsCompleted: progress.filter((r) => r.certificateSerial).length,
    lessonsCompleted: progress.reduce((n, r) => n + r.completedLessons.length, 0),
    certificates: certs.filter((c) => c.revokedAt === undefined).length,
    lastActiveDate: last,
    activeDays30: new Set(dates.filter((d) => d >= addDays(today, -29))).size,
    streak: computeStreak(activity.map((a) => a.date), today).current,
    programs: progress.map((r) => ({ programId: r.programId, lessons: r.completedLessons.length, certificate: Boolean(r.certificateSerial) })),
  };
}

export const roster = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { school } = await requireHead(ctx);
    const today = eatDateKey(Date.now());
    const page = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", school._id).eq("status", "active")).paginate(args.paginationOpts);
    const rows = [];
    for (const m of page.page) {
      const p = await ctx.db.get(m.profileId);
      if (!p) continue;
      rows.push({ ...(await teacherProgress(ctx, p, today)), role: m.role, joinedAt: m.joinedAt });
    }
    return { ...page, page: rows };
  },
});

/** School-wide numbers for the head's overview. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const { school } = await requireHead(ctx);
    const today = eatDateKey(Date.now());
    const members = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", school._id).eq("status", "active")).take(MAX_MEMBERS);
    const byProgram = new Map<string, { started: number; completed: number; lessons: number }>();
    let active7 = 0, lessons = 0, certificates = 0, teachers = 0;
    for (const m of members) {
      const p = await ctx.db.get(m.profileId);
      if (!p) continue;
      if (m.role === "teacher") teachers++;
      const t = await teacherProgress(ctx, p, today);
      lessons += t.lessonsCompleted;
      certificates += t.certificates;
      if (t.lastActiveDate && t.lastActiveDate >= addDays(today, -6)) active7++;
      for (const pr of t.programs) {
        const e = byProgram.get(pr.programId) ?? { started: 0, completed: 0, lessons: 0 };
        e.started++; e.lessons += pr.lessons; if (pr.certificate) e.completed++;
        byProgram.set(pr.programId, e);
      }
    }
    return {
      school: { name: school.name, county: school.county ?? null },
      members: members.length,
      teachers,
      activeLast7Days: active7,
      lessonsCompleted: lessons,
      certificates,
      programs: [...byProgram.entries()].map(([programId, e]) => ({ programId, ...e })).sort((a, b) => b.started - a.started),
    };
  },
});
