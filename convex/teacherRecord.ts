import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentProfile } from "./lib/auth";
import { fail, notFound } from "./lib/errors";
import { notify } from "./lib/notices";
import { audit, displayStatus, membersInScope, requireManager, requirePrincipal, schoolOf } from "./lib/schoolAccess";
import { getProgramDef } from "./lib/contentRead";
import { MAX_MEMBERS } from "./schools";
import { STATIC_PROGRAMS as PROGRAMS } from "./lib/staticCurriculum";

/**
 * Portable teacher records. The record is built from the teacher's own account (certificates, learning, assessed
 * school work), so it moves with them between schools. A school sees a summary by default; the teacher may share
 * the full record. Every view by leadership is logged and visible to the teacher.
 */

type Level = "summary" | "full";
const levelV = v.union(v.literal("summary"), v.literal("full"));
const nameOf = (p: Doc<"profiles"> | null) => p?.name?.trim() || p?.email || "Teacher";

async function buildRecord(ctx: QueryCtx, p: Doc<"profiles">, level: Level) {
  const [progress, certs, targets, activity] = await Promise.all([
    ctx.db.query("learningProgress").withIndex("by_user", (q) => q.eq("userId", p._id)).take(50),
    ctx.db.query("certificates").withIndex("by_user", (q) => q.eq("userId", p._id)).take(50),
    ctx.db.query("assignmentTargets").withIndex("by_profile", (q) => q.eq("profileId", p._id)).take(300),
    ctx.db.query("activityLog").withIndex("by_user_and_date", (q) => q.eq("userId", p._id)).order("desc").take(400),
  ]);
  const programs = [];
  for (const r of progress) {
    const def = await getProgramDef(ctx, r.programId);
    programs.push({
      programId: r.programId, title: certs.find((c) => c.programId === r.programId)?.programTitle ?? PROGRAMS.find((x) => x.id === r.programId)?.title ?? r.programId, lessons: r.completedLessons.length, totalLessons: def ? def.activeLessonKeys.size : null,
      completedAt: r.certificateEarnedAt ?? null,
      ...(level === "full" ? { pre: r.preAssessment ? Math.round((r.preAssessment.score / r.preAssessment.total) * 100) : null, post: r.postAssessment ? Math.round((r.postAssessment.score / r.postAssessment.total) * 100) : null } : {}),
    });
  }
  const now = Date.now();
  const schoolNames = new Map<Id<"schools">, string>();
  const work = [];
  for (const t of targets) {
    const a = await ctx.db.get(t.assignmentId);
    if (!a) continue;
    const status = displayStatus(a, t, now);
    if (level === "summary" && status !== "reviewed" && status !== "submitted" && status !== "late") continue;
    if (!schoolNames.has(a.schoolId)) schoolNames.set(a.schoolId, (await ctx.db.get(a.schoolId))?.name ?? "School");
    let feedback: string | null = null;
    if (level === "full" && a.kind === "task") {
      const sub = await ctx.db.query("taskSubmissions").withIndex("by_target", (q) => q.eq("targetId", t._id)).order("desc").first();
      feedback = sub?.review?.feedback ?? null;
    }
    work.push({ title: a.title, kind: a.kind, skillArea: a.skillArea, school: schoolNames.get(a.schoolId)!, dueAt: a.dueAt, status, submittedAt: t.submittedAt ?? null, score: t.score ?? null, rating: t.rating ?? null, ...(level === "full" ? { feedback } : {}) });
  }
  const real = activity.filter((x) => x.source !== "restored").map((x) => x.date);
  return {
    level,
    name: nameOf(p),
    subjects: p.subjects ?? [],
    grades: p.grades ?? [],
    certificates: certs.filter((c) => c.revokedAt === undefined).map((c) => ({ serial: c.serial, title: c.programTitle, earnedAt: c.earnedAt })).sort((a, b) => b.earnedAt - a.earnedAt),
    programs,
    lessonsCompleted: progress.reduce((n, r) => n + r.completedLessons.length, 0),
    activeDays: new Set(real).size,
    lastActive: real[0] ?? null,
    skills: [...new Set(work.filter((w) => w.status === "reviewed" || w.status === "submitted" || w.status === "late").map((w) => w.skillArea))].sort(),
    work: work.sort((a, b) => b.dueAt - a.dueAt),
  };
}

async function sharingFor(ctx: QueryCtx, profileId: Id<"profiles">, schoolId: Id<"schools">): Promise<Level> {
  const row = await ctx.db.query("recordSharing").withIndex("by_profile_and_school", (q) => q.eq("profileId", profileId).eq("schoolId", schoolId)).unique();
  return row?.level ?? "summary";
}

/** The teacher's own record (always full), who has looked at it, and their transfer requests. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const s = await schoolOf(ctx);
    const views = await ctx.db.query("recordViews").withIndex("by_owner", (q) => q.eq("ownerId", profile._id)).order("desc").take(50);
    const viewRows = [];
    for (const r of views) viewRows.push({ _id: r._id, at: r.at, level: r.level, viewer: nameOf(await ctx.db.get(r.viewerId)), school: (await ctx.db.get(r.schoolId))?.name ?? "School" });
    const transfers = [];
    for (const status of ["pending", "accepted", "declined"] as const) {
      for (const t of await ctx.db.query("transferRequests").withIndex("by_profile", (q) => q.eq("profileId", profile._id).eq("status", status)).take(10))
        transfers.push({ _id: t._id, status: t.status, createdAt: t.createdAt, decidedAt: t.decidedAt ?? null, to: (await ctx.db.get(t.toSchoolId))?.name ?? "School" });
    }
    return {
      record: await buildRecord(ctx, profile, "full"),
      school: s ? { name: s.school.name, sharing: await sharingFor(ctx, profile._id, s.school._id), isHead: s.member.role === "head" } : null,
      views: viewRows,
      transfers: transfers.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

export const setSharing = mutation({
  args: { level: levelV },
  returns: v.null(),
  handler: async (ctx, { level }) => {
    const s = await schoolOf(ctx);
    if (!s) throw fail("FORBIDDEN", "You are not in a school.");
    const row = await ctx.db.query("recordSharing").withIndex("by_profile_and_school", (q) => q.eq("profileId", s.profile._id).eq("schoolId", s.school._id)).unique();
    if (row) await ctx.db.patch(row._id, { level, updatedAt: Date.now() });
    else await ctx.db.insert("recordSharing", { profileId: s.profile._id, schoolId: s.school._id, level, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Leadership opens a teacher's record. A mutation, not a query, so the view is always logged:
 * the record is returned only after the log row is written.
 */
export const openTeacher = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const scope = await requireManager(ctx);
    if (!(await membersInScope(ctx, scope)).some((m) => m.profileId === profileId)) throw fail("FORBIDDEN", "You do not manage this teacher.");
    const p = await ctx.db.get(profileId);
    if (!p) throw notFound("Teacher");
    const level = await sharingFor(ctx, profileId, scope.school._id);
    if (profileId !== scope.profile._id) await ctx.db.insert("recordViews", { ownerId: profileId, viewerId: scope.profile._id, schoolId: scope.school._id, level, at: Date.now() });
    return await buildRecord(ctx, p, level);
  },
});

// ── Transfers ──────────────────────────────────────────────────────────────────────────────────────────────
export const requestTransfer = mutation({
  args: { code: v.string(), message: v.optional(v.string()) },
  returns: v.object({ school: v.string() }),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const current = await schoolOf(ctx);
    if (current?.member.role === "head") throw fail("FORBIDDEN", "A principal cannot transfer. Contact support to hand the school over first.");
    const norm = args.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const school = norm.length === 8 ? await ctx.db.query("schools").withIndex("by_code", (q) => q.eq("code", norm)).unique() : null;
    if (!school || school.archivedAt !== undefined) throw fail("NOT_FOUND", "That code did not match a school. Ask the new school’s principal for it.");
    if (current && current.school._id === school._id) throw fail("INVALID_ARGUMENT", "You are already in that school.");
    if (await ctx.db.query("transferRequests").withIndex("by_profile", (q) => q.eq("profileId", profile._id).eq("status", "pending")).first())
      throw fail("ALREADY_PENDING", "You already have a transfer request waiting. Cancel it first.");
    await ctx.db.insert("transferRequests", {
      profileId: profile._id, toSchoolId: school._id, status: "pending", createdAt: Date.now(),
      ...(current ? { fromSchoolId: current.school._id } : {}), ...(args.message?.trim() ? { message: args.message.trim().slice(0, 500) } : {}),
    });
    await notify(ctx, school.headId, { title: "Transfer request", body: `${nameOf(profile)} asks to join ${school.name}.`, link: "/dashboard/school?tab=staff" });
    return { school: school.name };
  },
});

export const cancelTransfer = mutation({
  args: { id: v.id("transferRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const profile = await requireCurrentProfile(ctx);
    const t = await ctx.db.get(id);
    if (!t || t.profileId !== profile._id) throw notFound("Transfer request");
    if (t.status === "pending") await ctx.db.patch(id, { status: "cancelled", decidedAt: Date.now() });
    return null;
  },
});

/** Pending requests to join the principal's school, with the summary record of each teacher. */
export const transferInbox = query({
  args: {},
  handler: async (ctx) => {
    const scope = await requirePrincipal(ctx);
    const rows = await ctx.db.query("transferRequests").withIndex("by_to_school", (q) => q.eq("toSchoolId", scope.school._id).eq("status", "pending")).take(50);
    const out = [];
    for (const t of rows) {
      const p = await ctx.db.get(t.profileId);
      if (!p) continue;
      out.push({ _id: t._id, createdAt: t.createdAt, message: t.message ?? null, from: t.fromSchoolId ? (await ctx.db.get(t.fromSchoolId))?.name ?? null : null, record: await buildRecord(ctx, p, "summary") });
    }
    return out;
  },
});

export const decideTransfer = mutation({
  args: { id: v.id("transferRequests"), accept: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { id, accept }) => {
    const scope = await requirePrincipal(ctx);
    const t = await ctx.db.get(id);
    if (!t || t.toSchoolId !== scope.school._id) throw notFound("Transfer request");
    if (t.status !== "pending") throw fail("INVALID_STATE", "This request has already been decided.");
    const p = await ctx.db.get(t.profileId);
    const now = Date.now();
    if (accept) {
      const members = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", scope.school._id).eq("status", "active")).take(MAX_MEMBERS + 1);
      if (members.length >= MAX_MEMBERS) throw fail("SCHOOL_FULL", "Your school has reached its member limit.");
      const old = await ctx.db.query("schoolMembers").withIndex("by_profile", (q) => q.eq("profileId", t.profileId).eq("status", "active")).first();
      if (old?.role === "head") throw fail("FORBIDDEN", "This teacher is now a principal elsewhere and cannot transfer.");
      if (old) await ctx.db.patch(old._id, { status: "left", leftAt: now });
      await ctx.db.insert("schoolMembers", { schoolId: scope.school._id, profileId: t.profileId, role: "teacher", status: "active", joinedAt: now });
      if (old) {
        const oldSchool = await ctx.db.get(old.schoolId);
        if (oldSchool) await notify(ctx, oldSchool.headId, { title: "A teacher transferred out", body: `${nameOf(p)} has moved to ${scope.school.name}. Their record moved with them.` });
      }
    }
    await ctx.db.patch(id, { status: accept ? "accepted" : "declined", decidedAt: now, decidedBy: scope.profile._id });
    await audit(ctx, scope.school._id, scope.profile._id, accept ? "transfer.accept" : "transfer.decline", nameOf(p));
    await notify(ctx, t.profileId, { title: accept ? `Welcome to ${scope.school.name}` : "Transfer request declined", body: accept ? "Your transfer was accepted. Your record, certificates and history came with you." : `${scope.school.name} declined your request.`, link: "/dashboard/school" });
    return null;
  },
});
