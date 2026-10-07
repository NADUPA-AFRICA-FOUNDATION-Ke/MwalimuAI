import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { fail, notFound } from "./lib/errors";
import { notify } from "./lib/notices";
import { getProgramDef } from "./lib/contentRead";
import { checkAttachments, attachmentInput } from "./lib/ticketing";
import { requireCurrentProfile } from "./lib/auth";
import { audit, closesAt, displayStatus, membersInScope, requireManager, requirePrincipal, schoolOf, type ManagerScope } from "./lib/schoolAccess";

/**
 * The My School portal: school leadership assign professional-development work to teachers and track it.
 * Every function checks the caller's school role on the server; the screens only mirror these rules.
 */

const MAX_TARGETS = 300;
const LEVELS = ["Below Expectation", "Approaching Expectation", "Meeting Expectation", "Exceeding Expectation"]; // 1..4
const nameOf = (p: Doc<"profiles"> | null) => p?.name?.trim() || p?.email || "Teacher";

const audienceV = v.object({
  kind: v.union(v.literal("all"), v.literal("department"), v.literal("teachers")),
  departmentId: v.optional(v.id("departments")),
  profileIds: v.optional(v.array(v.id("profiles"))),
});

async function managersToTell(ctx: QueryCtx, a: Doc<"schoolAssignments">) {
  const school = await ctx.db.get(a.schoolId);
  return [...new Set([a.createdBy, school?.headId].filter(Boolean) as Id<"profiles">[])];
}

// ── Module / path completion, read from the teacher's learning progress ───────────────────────────────────
async function lessonKeysFor(ctx: QueryCtx, item: { programId: string; moduleKey?: string }) {
  const def = await getProgramDef(ctx, item.programId);
  if (!def) return [] as string[];
  return [...def.activeLessonKeys].filter((k) => !item.moduleKey || k.startsWith(`${item.moduleKey}/`));
}

async function progressFor(ctx: QueryCtx, profileId: Id<"profiles">, a: Doc<"schoolAssignments">) {
  let done = 0, total = 0;
  for (const item of a.modules) {
    const keys = await lessonKeysFor(ctx, item);
    const row = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", profileId).eq("programId", item.programId)).unique();
    const completed = new Set(row?.completedLessons ?? []);
    total += keys.length;
    done += keys.filter((k) => completed.has(k)).length;
  }
  return { done, total };
}

/**
 * Called when a teacher's learning progress or assessment result changes: marks module/path/assessment assignments
 * as submitted the moment they are complete, and records whether that was after the window closed.
 */
export async function syncAssignmentsFromLearning(ctx: MutationCtx, profileId: Id<"profiles">, programId: string) {
  const open = [
    ...(await ctx.db.query("assignmentTargets").withIndex("by_profile", (q) => q.eq("profileId", profileId).eq("status", "not_started")).take(100)),
    ...(await ctx.db.query("assignmentTargets").withIndex("by_profile", (q) => q.eq("profileId", profileId).eq("status", "in_progress")).take(100)),
  ];
  const now = Date.now();
  for (const t of open) {
    const a = await ctx.db.get(t.assignmentId);
    if (!a || a.archivedAt !== undefined || a.kind === "task" || now < a.opensAt) continue;
    if (!a.modules.some((m) => m.programId === programId)) continue;
    let complete = false, score: number | undefined, passed: boolean | undefined;
    if (a.kind === "assessment") {
      const row = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", profileId).eq("programId", programId)).unique();
      const post = row?.postAssessment;
      if (post && post.total > 0) { complete = true; score = Math.round((post.score / post.total) * 100); passed = score >= 85; }
    } else {
      const { done, total } = await progressFor(ctx, profileId, a);
      complete = total > 0 && done >= total;
      if (!complete && done > 0 && t.status === "not_started") await ctx.db.patch(t._id, { status: "in_progress", updatedAt: now });
    }
    if (!complete) continue;
    const late = now > closesAt(a, t);
    await ctx.db.patch(t._id, { status: "submitted", submittedAt: now, late, ...(score !== undefined ? { score, passed } : {}), updatedAt: now });
    for (const m of await managersToTell(ctx, a)) {
      const teacher = await ctx.db.get(profileId);
      await notify(ctx, m, { title: `${nameOf(teacher)} completed “${a.title}”${late ? " (late)" : ""}`, body: score !== undefined ? `Score ${score}%${passed ? ", passed" : ", not passed"}` : "Module completed", link: `/dashboard/school/assignments/${a._id}` });
    }
  }
}

// ── Leadership: school set-up ──────────────────────────────────────────────────────────────────────────────
export const me = query({
  args: {},
  handler: async (ctx) => {
    const s = await schoolOf(ctx);
    if (!s) return null;
    const { member, school } = s;
    const manager = member.role === "head" || ((member.role === "deputy" || member.role === "hod") && member.canAssign === true);
    const dept = member.departmentId ? await ctx.db.get(member.departmentId) : null;
    return { schoolId: school._id, schoolName: school.name, role: member.role, manager, isPrincipal: member.role === "head", department: dept ? { _id: dept._id, name: dept.name } : null };
  },
});

export const departments = query({
  args: {},
  handler: async (ctx) => {
    const s = await schoolOf(ctx);
    if (!s) return [];
    const rows = await ctx.db.query("departments").withIndex("by_school", (q) => q.eq("schoolId", s.school._id)).take(50);
    return rows.sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ _id: d._id, name: d.name }));
  },
});

export const saveDepartment = mutation({
  args: { id: v.optional(v.id("departments")), name: v.string() },
  returns: v.id("departments"),
  handler: async (ctx, { id, name }) => {
    const scope = await requirePrincipal(ctx);
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 60) throw fail("INVALID_ARGUMENT", "Department names are 2 to 60 characters.");
    if (id) {
      const d = await ctx.db.get(id);
      if (!d || d.schoolId !== scope.school._id) throw notFound("Department");
      await ctx.db.patch(id, { name: clean });
      await audit(ctx, scope.school._id, scope.profile._id, "department.rename", clean);
      return id;
    }
    const newId = await ctx.db.insert("departments", { schoolId: scope.school._id, name: clean, createdAt: Date.now() });
    await audit(ctx, scope.school._id, scope.profile._id, "department.create", clean);
    return newId;
  },
});

export const deleteDepartment = mutation({
  args: { id: v.id("departments") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const scope = await requirePrincipal(ctx);
    const d = await ctx.db.get(id);
    if (!d || d.schoolId !== scope.school._id) throw notFound("Department");
    const members = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", scope.school._id).eq("status", "active")).take(300);
    if (members.some((m) => m.departmentId === id)) throw fail("IN_USE", "Move the teachers in this department to another one first.");
    await ctx.db.delete(id);
    await audit(ctx, scope.school._id, scope.profile._id, "department.delete", d.name);
    return null;
  },
});

/** The staff list for leadership, with each teacher's department, role and workload. */
export const staff = query({
  args: {},
  handler: async (ctx) => {
    const scope = await requireManager(ctx);
    const members = await membersInScope(ctx, scope);
    const depts = new Map((await ctx.db.query("departments").withIndex("by_school", (q) => q.eq("schoolId", scope.school._id)).take(50)).map((d) => [d._id, d.name]));
    const now = Date.now();
    const out = [];
    for (const m of members) {
      const p = await ctx.db.get(m.profileId);
      const targets = await ctx.db.query("assignmentTargets").withIndex("by_profile", (q) => q.eq("profileId", m.profileId)).take(300);
      const mine = targets.filter((t) => t.schoolId === scope.school._id);
      let overdue = 0;
      for (const t of mine) {
        const a = await ctx.db.get(t.assignmentId);
        if (a && !a.archivedAt) { const st = displayStatus(a, t, now); if (st === "overdue" || st === "invalid") overdue++; }
      }
      out.push({
        memberId: m._id, profileId: m.profileId, name: nameOf(p), role: m.role, canAssign: m.canAssign === true,
        department: m.departmentId ? { _id: m.departmentId, name: depts.get(m.departmentId) ?? "" } : null,
        assigned: mine.length, completed: mine.filter((t) => t.status !== "not_started" && t.status !== "in_progress").length, overdue,
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const setMember = mutation({
  args: { memberId: v.id("schoolMembers"), role: v.union(v.literal("deputy"), v.literal("hod"), v.literal("teacher")), departmentId: v.optional(v.union(v.id("departments"), v.null())), canAssign: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scope = await requirePrincipal(ctx);
    const m = await ctx.db.get(args.memberId);
    if (!m || m.schoolId !== scope.school._id || m.status !== "active") throw notFound("Teacher");
    if (m.role === "head") throw fail("FORBIDDEN", "The principal's role cannot be changed here.");
    if (args.departmentId) {
      const d = await ctx.db.get(args.departmentId);
      if (!d || d.schoolId !== scope.school._id) throw notFound("Department");
    }
    if (args.role === "hod" && !args.departmentId) throw fail("INVALID_ARGUMENT", "Choose the department this head of department leads.");
    await ctx.db.patch(m._id, { role: args.role, departmentId: args.departmentId ?? undefined, canAssign: args.role === "teacher" ? false : args.canAssign });
    const p = await ctx.db.get(m.profileId);
    await audit(ctx, scope.school._id, scope.profile._id, "member.role", nameOf(p), `${args.role}${args.canAssign && args.role !== "teacher" ? " (can assign)" : ""}`);
    if (args.role !== m.role || (args.canAssign !== (m.canAssign === true))) {
      await notify(ctx, m.profileId, { title: `Your role in ${scope.school.name} changed`, body: args.role === "teacher" ? "You are a teacher." : `You are a ${args.role === "hod" ? "head of department" : "deputy principal"}${args.canAssign ? " and can assign work" : ""}.`, link: "/dashboard/school" });
    }
    return null;
  },
});

export const settings = query({
  args: {},
  handler: async (ctx) => {
    const s = await schoolOf(ctx);
    if (!s) return null;
    return await ctx.db.query("schoolSettings").withIndex("by_school", (q) => q.eq("schoolId", s.school._id)).first();
  },
});

export const saveTerm = mutation({
  args: { termName: v.string(), termStart: v.number(), termEnd: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scope = await requirePrincipal(ctx);
    if (args.termEnd <= args.termStart) throw fail("INVALID_ARGUMENT", "The term must end after it starts.");
    const name = args.termName.trim().slice(0, 40) || "Term";
    const row = await ctx.db.query("schoolSettings").withIndex("by_school", (q) => q.eq("schoolId", scope.school._id)).first();
    if (row) await ctx.db.patch(row._id, { termName: name, termStart: args.termStart, termEnd: args.termEnd });
    else await ctx.db.insert("schoolSettings", { schoolId: scope.school._id, termName: name, termStart: args.termStart, termEnd: args.termEnd });
    await audit(ctx, scope.school._id, scope.profile._id, "term.set", name);
    return null;
  },
});

// ── School paths (an ordered list of library modules) ─────────────────────────────────────────────────────
export const paths = query({
  args: {},
  handler: async (ctx) => {
    const s = await schoolOf(ctx);
    if (!s) return [];
    return (await ctx.db.query("schoolPaths").withIndex("by_school", (q) => q.eq("schoolId", s.school._id)).take(100)).map((p) => ({ _id: p._id, title: p.title, description: p.description, items: p.items }));
  },
});

export const savePath = mutation({
  args: { id: v.optional(v.id("schoolPaths")), title: v.string(), description: v.string(), items: v.array(v.object({ programId: v.string(), moduleKey: v.string() })) },
  returns: v.id("schoolPaths"),
  handler: async (ctx, args) => {
    const scope = await requireManager(ctx);
    const title = args.title.trim();
    if (title.length < 3 || title.length > 120) throw fail("INVALID_ARGUMENT", "Give the path a title.");
    if (args.items.length < 1 || args.items.length > 30) throw fail("INVALID_ARGUMENT", "A path has 1 to 30 modules.");
    for (const it of args.items) if ((await lessonKeysFor(ctx, it)).length === 0) throw fail("INVALID_ARGUMENT", "One of the modules no longer exists.");
    const data = { title, description: args.description.trim().slice(0, 1000), items: args.items };
    if (args.id) {
      const p = await ctx.db.get(args.id);
      if (!p || p.schoolId !== scope.school._id) throw notFound("Path");
      await ctx.db.patch(args.id, data);
      await audit(ctx, scope.school._id, scope.profile._id, "path.edit", title);
      return args.id;
    }
    const id = await ctx.db.insert("schoolPaths", { schoolId: scope.school._id, ...data, createdBy: scope.profile._id, createdAt: Date.now() });
    await audit(ctx, scope.school._id, scope.profile._id, "path.create", title);
    return id;
  },
});

// ── Assignments ────────────────────────────────────────────────────────────────────────────────────────────
async function resolveAudience(ctx: QueryCtx, scope: ManagerScope, audience: { kind: "all" | "department" | "teachers"; departmentId?: Id<"departments">; profileIds?: Id<"profiles">[] }) {
  const members = (await membersInScope(ctx, scope)).filter((m) => m.profileId !== scope.profile._id || audience.kind === "teachers");
  if (audience.kind === "all") {
    if (scope.departmentOnly) throw fail("FORBIDDEN", "A head of department can assign to their own department only.");
    return members.map((m) => m.profileId);
  }
  if (audience.kind === "department") {
    if (!audience.departmentId) throw fail("INVALID_ARGUMENT", "Choose a department.");
    if (scope.departmentOnly && audience.departmentId !== scope.departmentOnly) throw fail("FORBIDDEN", "A head of department can assign to their own department only.");
    return members.filter((m) => m.departmentId === audience.departmentId).map((m) => m.profileId);
  }
  const allowed = new Set(members.map((m) => m.profileId));
  const ids = audience.profileIds ?? [];
  if (ids.some((id) => !allowed.has(id))) throw fail("FORBIDDEN", "You can only assign to teachers you manage.");
  return [...new Set(ids)];
}

export const createAssignment = mutation({
  args: {
    title: v.string(), description: v.string(), objectives: v.array(v.string()), skillArea: v.string(),
    kind: v.union(v.literal("module"), v.literal("assessment"), v.literal("task"), v.literal("path")),
    modules: v.array(v.object({ programId: v.string(), moduleKey: v.optional(v.string()) })),
    taskInstructions: v.optional(v.string()),
    rubric: v.optional(v.array(v.object({ criterion: v.string(), levels: v.array(v.string()) }))),
    attachments: v.optional(attachmentInput),
    opensAt: v.number(), dueAt: v.number(), mandatory: v.boolean(), graceMinutes: v.number(), allowResubmit: v.boolean(),
    audience: audienceV,
  },
  returns: v.object({ id: v.id("schoolAssignments"), teachers: v.number() }),
  handler: async (ctx, args) => {
    const scope = await requireManager(ctx);
    const title = args.title.trim();
    if (title.length < 3 || title.length > 140) throw fail("INVALID_ARGUMENT", "Give the assignment a title (3 to 140 characters).");
    if (!args.skillArea.trim()) throw fail("INVALID_ARGUMENT", "Choose the skill area it develops.");
    if (args.dueAt <= args.opensAt) throw fail("INVALID_ARGUMENT", "The due date must be after the open date.");
    if (args.dueAt < Date.now()) throw fail("INVALID_ARGUMENT", "The due date is in the past.");
    if (args.graceMinutes < 0 || args.graceMinutes > 7 * 24 * 60) throw fail("INVALID_ARGUMENT", "The grace period is up to 7 days.");
    if (args.kind === "task") {
      if (!args.taskInstructions?.trim()) throw fail("INVALID_ARGUMENT", "Explain what the teacher must submit.");
      const rubric = args.rubric ?? [];
      if (rubric.length < 1 || rubric.length > 10 || rubric.some((r) => !r.criterion.trim() || r.levels.length !== 4)) throw fail("INVALID_ARGUMENT", "A practical task needs a rubric: 1 to 10 criteria, each with the four CBC levels.");
    } else {
      if (args.modules.length < 1) throw fail("INVALID_ARGUMENT", "Choose what to complete from the library.");
      for (const m of args.modules) if ((await lessonKeysFor(ctx, m)).length === 0) throw fail("INVALID_ARGUMENT", "That module is not in the library.");
      if (args.kind === "assessment") {
        const def = await getProgramDef(ctx, args.modules[0].programId);
        if (!def || def.postAssessment.length === 0) throw fail("INVALID_ARGUMENT", "That learning path has no assessment.");
      }
    }
    const teachers = await resolveAudience(ctx, scope, args.audience);
    if (teachers.length === 0) throw fail("INVALID_ARGUMENT", "Nobody is in that group yet.");
    if (teachers.length > MAX_TARGETS) throw fail("INVALID_ARGUMENT", `Assign to at most ${MAX_TARGETS} teachers at once.`);
    const now = Date.now();
    const attachments = args.attachments?.length ? await checkAttachments(ctx, args.attachments) : undefined;
    const id = await ctx.db.insert("schoolAssignments", {
      schoolId: scope.school._id, title, description: args.description.trim().slice(0, 4000),
      objectives: args.objectives.map((o) => o.trim()).filter(Boolean).slice(0, 10), skillArea: args.skillArea.trim().slice(0, 80),
      kind: args.kind, modules: args.kind === "task" ? [] : args.modules,
      ...(args.kind === "task" ? { taskInstructions: args.taskInstructions!.trim().slice(0, 4000), rubric: args.rubric } : {}),
      ...(attachments ? { attachments } : {}),
      opensAt: args.opensAt, dueAt: args.dueAt, mandatory: args.mandatory, graceMinutes: Math.round(args.graceMinutes), allowResubmit: args.allowResubmit,
      audience: args.audience, createdBy: scope.profile._id, createdAt: now,
    });
    for (const profileId of teachers) {
      await ctx.db.insert("assignmentTargets", { assignmentId: id, schoolId: scope.school._id, profileId, status: "not_started", late: false, updatedAt: now });
      await notify(ctx, profileId, { title: `New assignment: ${title}`, body: `Due ${eat(args.dueAt)}${args.mandatory ? " · mandatory" : ""}`, link: "/dashboard/school" });
    }
    await audit(ctx, scope.school._id, scope.profile._id, "assignment.create", title, `${teachers.length} teachers, due ${eat(args.dueAt)}`);
    // Anyone who already finished the work counts as done straight away.
    if (args.kind !== "task") for (const p of teachers) for (const m of args.modules) await syncAssignmentsFromLearning(ctx, p, m.programId);
    return { id, teachers: teachers.length };
  },
});

const eat = (ms: number) => new Date(ms + 3 * 3_600_000).toISOString().replace("T", " ").slice(0, 16) + " EAT";

async function assignmentInScope(ctx: QueryCtx, scope: ManagerScope, id: Id<"schoolAssignments">) {
  const a = await ctx.db.get(id);
  if (!a || a.schoolId !== scope.school._id) throw notFound("Assignment");
  return a;
}

export const archiveAssignment = mutation({
  args: { id: v.id("schoolAssignments") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const scope = await requireManager(ctx);
    const a = await assignmentInScope(ctx, scope, id);
    if (!scope.isPrincipal && a.createdBy !== scope.profile._id) throw fail("FORBIDDEN", "Only the principal or whoever set it can withdraw this assignment.");
    await ctx.db.patch(id, { archivedAt: Date.now() });
    await audit(ctx, scope.school._id, scope.profile._id, "assignment.archive", a.title);
    return null;
  },
});

/** Leadership's list: each assignment with how many teachers are at each stage. HODs see their department's. */
export const assignments = query({
  args: {},
  handler: async (ctx) => {
    const scope = await requireManager(ctx);
    const visible = new Set((await membersInScope(ctx, scope)).map((m) => m.profileId));
    const list = await ctx.db.query("schoolAssignments").withIndex("by_school", (q) => q.eq("schoolId", scope.school._id)).order("desc").take(200);
    const now = Date.now();
    const out = [];
    for (const a of list) {
      if (a.archivedAt) continue;
      const targets = (await ctx.db.query("assignmentTargets").withIndex("by_assignment", (q) => q.eq("assignmentId", a._id)).take(MAX_TARGETS)).filter((t) => visible.has(t.profileId));
      if (targets.length === 0) continue;
      const counts: Record<string, number> = {};
      for (const t of targets) { const st = displayStatus(a, t, now); counts[st] = (counts[st] ?? 0) + 1; }
      out.push({ _id: a._id, title: a.title, kind: a.kind, skillArea: a.skillArea, dueAt: a.dueAt, mandatory: a.mandatory, total: targets.length, counts });
    }
    return out;
  },
});

/** One assignment: who is where, with blocked late attempts and the latest submission for each teacher. */
export const assignmentDetail = query({
  args: { id: v.id("schoolAssignments") },
  handler: async (ctx, { id }) => {
    const scope = await requireManager(ctx);
    const a = await assignmentInScope(ctx, scope, id);
    const visible = new Set((await membersInScope(ctx, scope)).map((m) => m.profileId));
    const now = Date.now();
    const targets = (await ctx.db.query("assignmentTargets").withIndex("by_assignment", (q) => q.eq("assignmentId", id)).take(MAX_TARGETS)).filter((t) => visible.has(t.profileId));
    const rows = [];
    for (const t of targets) {
      const p = await ctx.db.get(t.profileId);
      const subs = await ctx.db.query("taskSubmissions").withIndex("by_target", (q) => q.eq("targetId", t._id)).order("desc").take(5);
      const latest = subs[0];
      const prog = a.kind === "module" || a.kind === "path" ? await progressFor(ctx, t.profileId, a) : null;
      rows.push({
        targetId: t._id, profileId: t.profileId, name: nameOf(p), status: displayStatus(a, t, now), submittedAt: t.submittedAt ?? null,
        extensionUntil: t.extensionUntil ?? null, extensionReason: t.extensionReason ?? null, blockedAttempts: t.blockedAttempts ?? [],
        score: t.score ?? null, passed: t.passed ?? null, rating: t.rating ?? null, progress: prog,
        submission: latest ? { _id: latest._id, text: latest.text, submittedAt: latest.submittedAt, attachments: await urls(ctx, latest.attachments), review: latest.review ?? null } : null,
      });
    }
    return {
      assignment: { ...a, closesAt: closesAt(a), attachments: await urls(ctx, a.attachments), levels: LEVELS },
      rows: rows.sort((x, y) => x.name.localeCompare(y.name)),
    };
  },
});

async function urls(ctx: QueryCtx, files?: { storageId: Id<"_storage">; name: string; type: string; size: number }[]) {
  const out = [];
  for (const f of files ?? []) out.push({ name: f.name, type: f.type, size: f.size, url: await ctx.storage.getUrl(f.storageId) });
  return out;
}

export const grantExtension = mutation({
  args: { targetId: v.id("assignmentTargets"), until: v.number(), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scope = await requireManager(ctx);
    const t = await ctx.db.get(args.targetId);
    if (!t || t.schoolId !== scope.school._id) throw notFound("Teacher's assignment");
    const visible = new Set((await membersInScope(ctx, scope)).map((m) => m.profileId));
    if (!visible.has(t.profileId)) throw fail("FORBIDDEN", "You do not manage this teacher.");
    const a = await ctx.db.get(t.assignmentId);
    if (!a) throw notFound("Assignment");
    if (args.reason.trim().length < 5) throw fail("INVALID_ARGUMENT", "Give a reason for the extension.");
    if (args.until <= Date.now()) throw fail("INVALID_ARGUMENT", "The extension must end in the future.");
    await ctx.db.patch(t._id, { extensionUntil: args.until, extensionReason: args.reason.trim().slice(0, 300), updatedAt: Date.now() });
    const p = await ctx.db.get(t.profileId);
    await audit(ctx, scope.school._id, scope.profile._id, "assignment.extension", `${a.title}: ${nameOf(p)}`, `until ${eat(args.until)}: ${args.reason.trim()}`);
    await notify(ctx, t.profileId, { title: `Extension granted: ${a.title}`, body: `You can now submit until ${eat(args.until)}.`, link: `/dashboard/school/work/${t._id}` });
    return null;
  },
});

export const reviewSubmission = mutation({
  args: { submissionId: v.id("taskSubmissions"), levels: v.array(v.number()), feedback: v.string(), allowResubmit: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const scope = await requireManager(ctx);
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw notFound("Submission");
    const t = await ctx.db.get(sub.targetId);
    if (!t || t.schoolId !== scope.school._id) throw notFound("Submission");
    const visible = new Set((await membersInScope(ctx, scope)).map((m) => m.profileId));
    if (!visible.has(t.profileId)) throw fail("FORBIDDEN", "You do not manage this teacher.");
    const a = await ctx.db.get(t.assignmentId);
    if (!a || !a.rubric) throw notFound("Assignment");
    if (args.levels.length !== a.rubric.length || args.levels.some((l) => !Number.isInteger(l) || l < 1 || l > 4)) throw fail("INVALID_ARGUMENT", "Choose a level for every criterion.");
    if (args.feedback.trim().length < 5) throw fail("INVALID_ARGUMENT", "Write some feedback for the teacher.");
    const now = Date.now();
    const resubmit = args.allowResubmit && now <= closesAt(a, t);
    await ctx.db.patch(sub._id, { review: { levels: args.levels, feedback: args.feedback.trim().slice(0, 4000), reviewedBy: scope.profile._id, reviewedAt: now, allowResubmit: resubmit } });
    const rating = Math.round((args.levels.reduce((x, y) => x + y, 0) / args.levels.length) * 10) / 10;
    await ctx.db.patch(t._id, { status: resubmit ? "returned" : "reviewed", rating, updatedAt: now });
    const p = await ctx.db.get(t.profileId);
    await audit(ctx, scope.school._id, scope.profile._id, "assignment.review", `${a.title}: ${nameOf(p)}`, `rating ${rating}${resubmit ? ", may resubmit" : ""}`);
    await notify(ctx, t.profileId, { title: `Feedback on “${a.title}”`, body: resubmit ? "You can improve it and submit again before the deadline." : "Your work has been reviewed.", link: `/dashboard/school/work/${t._id}` });
    return null;
  },
});

// ── Teachers ───────────────────────────────────────────────────────────────────────────────────────────────
export const myWork = query({
  args: {},
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const targets = await ctx.db.query("assignmentTargets").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).take(300);
    const now = Date.now();
    const out = [];
    for (const t of targets) {
      const a = await ctx.db.get(t.assignmentId);
      if (!a || a.archivedAt !== undefined || now < a.opensAt) continue;
      const prog = a.kind === "module" || a.kind === "path" ? await progressFor(ctx, profile._id, a) : null;
      out.push({ targetId: t._id, title: a.title, kind: a.kind, skillArea: a.skillArea, dueAt: a.dueAt, closesAt: closesAt(a, t), mandatory: a.mandatory, status: displayStatus(a, t, now), progress: prog, score: t.score ?? null, rating: t.rating ?? null });
    }
    return out.sort((x, y) => x.dueAt - y.dueAt);
  },
});

export const myWorkItem = query({
  args: { targetId: v.id("assignmentTargets") },
  handler: async (ctx, { targetId }) => {
    const profile = await requireCurrentProfile(ctx);
    const t = await ctx.db.get(targetId);
    if (!t || t.profileId !== profile._id) throw notFound("Assignment");
    const a = await ctx.db.get(t.assignmentId);
    if (!a) throw notFound("Assignment");
    const now = Date.now();
    const subs = await ctx.db.query("taskSubmissions").withIndex("by_target", (q) => q.eq("targetId", t._id)).order("desc").take(10);
    const modules = [];
    for (const m of a.modules) {
      const def = await getProgramDef(ctx, m.programId);
      const keys = await lessonKeysFor(ctx, m);
      const row = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", m.programId)).unique();
      const done = new Set(row?.completedLessons ?? []);
      modules.push({ programId: m.programId, moduleKey: m.moduleKey ?? null, lessons: keys.length, done: keys.filter((k) => done.has(k)).length, exists: !!def });
    }
    const open = now <= closesAt(a, t) && now >= a.opensAt;
    const canSubmit = a.kind === "task" && open && (t.status === "not_started" || t.status === "in_progress" || t.status === "returned");
    return {
      targetId: t._id, title: a.title, description: a.description, objectives: a.objectives, skillArea: a.skillArea, kind: a.kind,
      taskInstructions: a.taskInstructions ?? null, rubric: a.rubric ?? null, levels: LEVELS, attachments: await urls(ctx, a.attachments),
      dueAt: a.dueAt, closesAt: closesAt(a, t), extensionUntil: t.extensionUntil ?? null, mandatory: a.mandatory, status: displayStatus(a, t, now),
      score: t.score ?? null, passed: t.passed ?? null, rating: t.rating ?? null, modules, canSubmit, windowOpen: open,
      submissions: await Promise.all(subs.map(async (s) => ({ _id: s._id, text: s.text, submittedAt: s.submittedAt, attachments: await urls(ctx, s.attachments), review: s.review ? { levels: s.review.levels, feedback: s.review.feedback, reviewedAt: s.review.reviewedAt, allowResubmit: s.review.allowResubmit } : null }))),
    };
  },
});

export const uploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCurrentProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * A teacher submits evidence for a practical task. After the window closes the attempt is refused and recorded,
 * so leadership can see someone tried to submit late.
 */
export const submitTask = mutation({
  args: { targetId: v.id("assignmentTargets"), text: v.string(), attachments: v.optional(attachmentInput) },
  // A late attempt is not an error: it is refused AND recorded, which a failing function could not do (its writes are undone).
  returns: v.union(v.object({ ok: v.literal(true) }), v.object({ ok: v.literal(false), closedAt: v.number(), message: v.string() })),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const t = await ctx.db.get(args.targetId);
    if (!t || t.profileId !== profile._id) throw notFound("Assignment");
    const a = await ctx.db.get(t.assignmentId);
    if (!a || a.archivedAt !== undefined) throw notFound("Assignment");
    if (a.kind !== "task") throw fail("INVALID_ARGUMENT", "This assignment is completed by doing the module, not by submitting.");
    const now = Date.now();
    if (now < a.opensAt) throw fail("NOT_OPEN", "This assignment is not open yet.");
    if (now > closesAt(a, t)) {
      await ctx.db.patch(t._id, { blockedAttempts: [...(t.blockedAttempts ?? []), now].slice(-20), updatedAt: now });
      for (const m of await managersToTell(ctx, a)) await notify(ctx, m, { title: `${nameOf(profile)} tried to submit “${a.title}” after the deadline`, body: "The attempt was refused and recorded.", link: `/dashboard/school/assignments/${a._id}` });
      return { ok: false as const, closedAt: closesAt(a, t), message: `The deadline passed on ${eat(closesAt(a, t))}, so this can no longer be submitted. Your attempt was recorded. Ask your school leadership for an extension if you had a good reason.` };
    }
    if (t.status === "submitted" || t.status === "reviewed") throw fail("ALREADY_SUBMITTED", "You have already submitted this.");
    const text = args.text.trim();
    if (text.length < 20 && !(args.attachments?.length)) throw fail("INVALID_ARGUMENT", "Write a short description of your evidence, or attach it.");
    const attachments = args.attachments?.length ? await checkAttachments(ctx, args.attachments) : undefined;
    await ctx.db.insert("taskSubmissions", { targetId: t._id, profileId: profile._id, text: text.slice(0, 10000), ...(attachments ? { attachments } : {}), submittedAt: now });
    // After the due time but inside a grace period counts as late; inside an agreed extension does not.
    const late = now > a.dueAt && !(t.extensionUntil !== undefined && now <= t.extensionUntil);
    await ctx.db.patch(t._id, { status: "submitted", submittedAt: now, late, updatedAt: now });
    for (const m of await managersToTell(ctx, a)) {
      await notify(ctx, m, { title: `${nameOf(profile)} submitted “${a.title}”${late ? " (late)" : ""}`, body: "Ready for your review.", link: `/dashboard/school/assignments/${a._id}` });
    }
    return { ok: true as const };
  },
});

export const markStarted = mutation({
  args: { targetId: v.id("assignmentTargets") },
  returns: v.null(),
  handler: async (ctx, { targetId }) => {
    const profile = await requireCurrentProfile(ctx);
    const t = await ctx.db.get(targetId);
    if (t && t.profileId === profile._id && t.status === "not_started") await ctx.db.patch(t._id, { status: "in_progress", updatedAt: Date.now() });
    return null;
  },
});

// ── Reports ────────────────────────────────────────────────────────────────────────────────────────────────
/** The principal's overview, filterable by department, term (date range) and skill area. */
export const overview = query({
  args: { departmentId: v.optional(v.id("departments")), from: v.optional(v.number()), to: v.optional(v.number()), skillArea: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scope = await requireManager(ctx);
    let members = await membersInScope(ctx, scope);
    if (args.departmentId) members = members.filter((m) => m.departmentId === args.departmentId);
    const ids = new Set(members.map((m) => m.profileId));
    const now = Date.now();
    const assignments = (await ctx.db.query("schoolAssignments").withIndex("by_school", (q) => q.eq("schoolId", scope.school._id)).take(300))
      .filter((a) => !a.archivedAt && (!args.skillArea || a.skillArea === args.skillArea) && (!args.from || a.dueAt >= args.from) && (!args.to || a.dueAt <= args.to));
    const perTeacher = new Map<string, { assigned: number; done: number; onTime: number; overdue: number; scores: number[]; ratings: number[]; skills: Set<string> }>();
    const perSkill = new Map<string, { done: number; total: number; ratings: number[]; scores: number[] }>();
    const recent: { at: number; text: string }[] = [];
    for (const a of assignments) {
      const targets = (await ctx.db.query("assignmentTargets").withIndex("by_assignment", (q) => q.eq("assignmentId", a._id)).take(MAX_TARGETS)).filter((t) => ids.has(t.profileId));
      for (const t of targets) {
        const st = displayStatus(a, t, now);
        const row = perTeacher.get(t.profileId) ?? { assigned: 0, done: 0, onTime: 0, overdue: 0, scores: [], ratings: [], skills: new Set() };
        const sk = perSkill.get(a.skillArea) ?? { done: 0, total: 0, ratings: [], scores: [] };
        row.assigned++; sk.total++;
        const finished = st === "submitted" || st === "late" || st === "reviewed" || st === "returned";
        if (finished) { row.done++; sk.done++; row.skills.add(a.skillArea); if (!t.late) row.onTime++; }
        if (st === "overdue" || st === "invalid") row.overdue++;
        if (t.score !== undefined) { row.scores.push(t.score); sk.scores.push(t.score); }
        if (t.rating !== undefined) { row.ratings.push(t.rating); sk.ratings.push(t.rating); }
        perTeacher.set(t.profileId, row); perSkill.set(a.skillArea, sk);
        if (t.submittedAt) recent.push({ at: t.submittedAt, text: `${t.profileId}|${a.title}${t.late ? " (late)" : ""}` });
      }
    }
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    const teachers = [];
    for (const m of members) {
      const r = perTeacher.get(m.profileId);
      const p = await ctx.db.get(m.profileId);
      const activity = await ctx.db.query("activityLog").withIndex("by_user_and_date", (q) => q.eq("userId", m.profileId)).order("desc").first();
      teachers.push({
        profileId: m.profileId, name: nameOf(p), assigned: r?.assigned ?? 0, completed: r?.done ?? 0,
        onTimeRate: r && r.done ? Math.round((r.onTime / r.done) * 100) : null, overdue: r?.overdue ?? 0,
        avgScore: avg(r?.scores ?? []), avgRating: avg(r?.ratings ?? []), skills: [...(r?.skills ?? [])], lastActive: activity?.date ?? null,
      });
    }
    const totalAssigned = teachers.reduce((n, t) => n + t.assigned, 0);
    const totalDone = teachers.reduce((n, t) => n + t.completed, 0);
    const skills = [...perSkill.entries()].map(([skill, s]) => ({ skill, completion: s.total ? Math.round((s.done / s.total) * 100) : 0, avgRating: avg(s.ratings), avgScore: avg(s.scores) }))
      .sort((a, b) => b.completion - a.completion);
    const since = now - 14 * 86_400_000;
    const names = new Map(teachers.map((t) => [t.profileId as string, t.name]));
    return {
      activeTeachers: teachers.filter((t) => t.lastActive && Date.parse(t.lastActive) >= since).length,
      teachers: teachers.sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name)),
      completionRate: totalAssigned ? Math.round((totalDone / totalAssigned) * 100) : null,
      overdue: teachers.reduce((n, t) => n + t.overdue, 0),
      skills,
      needSupport: teachers.filter((t) => t.overdue >= 2 || (t.avgRating !== null && t.avgRating < 2) || (t.avgScore !== null && t.avgScore < 60)).map((t) => t.name),
      recent: recent.sort((a, b) => b.at - a.at).slice(0, 10).map((r) => { const [pid, what] = r.text.split("|"); return { at: r.at, text: `${names.get(pid) ?? "A teacher"} completed ${what}` }; }),
      skillAreas: [...new Set(assignments.map((a) => a.skillArea))].sort(),
    };
  },
});

export const schoolLog = query({
  args: {},
  handler: async (ctx) => {
    const scope = await requirePrincipal(ctx);
    const rows = await ctx.db.query("schoolAudit").withIndex("by_school", (q) => q.eq("schoolId", scope.school._id)).order("desc").take(100);
    const out = [];
    for (const r of rows) out.push({ _id: r._id, at: r.at, action: r.action, targetLabel: r.targetLabel, detail: r.detail ?? null, actor: nameOf(await ctx.db.get(r.actorId)) });
    return out;
  },
});

// ── Reminders and summaries (cron) ─────────────────────────────────────────────────────────────────────────
/** Hourly: remind teachers 48 and 24 hours before the window closes; tell leadership about newly overdue work. */
export const remind = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const soon = await ctx.db.query("schoolAssignments").take(1000);
    for (const a of soon) {
      if (a.archivedAt || now < a.opensAt) continue;
      const closes = closesAt(a);
      if (closes < now - 2 * 3_600_000 || closes > now + 49 * 3_600_000) continue;
      const targets = await ctx.db.query("assignmentTargets").withIndex("by_assignment", (q) => q.eq("assignmentId", a._id)).take(MAX_TARGETS);
      let newlyOverdue = 0;
      for (const t of targets) {
        if (t.status !== "not_started" && t.status !== "in_progress" && t.status !== "returned") continue;
        const left = closesAt(a, t) - now;
        const sent = new Set(t.reminded ?? []);
        const tag = left <= 0 ? "overdue" : left <= 24 * 3_600_000 ? "24h" : left <= 48 * 3_600_000 ? "48h" : null;
        if (!tag || sent.has(tag)) continue;
        sent.add(tag);
        await ctx.db.patch(t._id, { reminded: [...sent], updatedAt: now });
        if (tag === "overdue") { newlyOverdue++; continue; }
        await notify(ctx, t.profileId, { title: `Due in ${tag === "24h" ? "24 hours" : "2 days"}: ${a.title}`, body: `Submit by ${eat(closesAt(a, t))}.`, link: `/dashboard/school/work/${t._id}` });
      }
      if (newlyOverdue > 0) for (const m of await managersToTell(ctx, a)) await notify(ctx, m, { title: `${newlyOverdue} teacher${newlyOverdue === 1 ? "" : "s"} missed “${a.title}”`, body: "The deadline has passed.", link: `/dashboard/school/assignments/${a._id}` });
    }
    return null;
  },
});

/** Weekly (Monday morning, Kenya time): a short summary for each principal. */
export const weeklySummary = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const schools = await ctx.db.query("schools").take(500);
    for (const s of schools) {
      if (s.archivedAt) continue;
      const targets = await ctx.db.query("assignmentTargets").withIndex("by_school", (q) => q.eq("schoolId", s._id)).take(2000);
      if (targets.length === 0) continue;
      const weekAgo = now - 7 * 86_400_000;
      const done = targets.filter((t) => t.submittedAt && t.submittedAt >= weekAgo).length;
      let overdue = 0;
      for (const t of targets) { const a = await ctx.db.get(t.assignmentId); if (a && !a.archivedAt) { const st = displayStatus(a, t, now); if (st === "overdue" || st === "invalid") overdue++; } }
      await notify(ctx, s.headId, { title: `This week at ${s.name}`, body: `${done} piece${done === 1 ? "" : "s"} of work completed · ${overdue} overdue`, link: "/dashboard/school" });
    }
    return null;
  },
});

