import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireCurrentProfile } from "./auth";
import { fail } from "./errors";

type Ctx = QueryCtx | MutationCtx;

/** Who is asking, in which school, with which role. Null when the person is not in a school. */
export async function schoolOf(ctx: Ctx) {
  const profile = await requireCurrentProfile(ctx);
  const member = await ctx.db.query("schoolMembers").withIndex("by_profile", (q) => q.eq("profileId", profile._id).eq("status", "active")).first();
  if (!member) return null;
  const school = await ctx.db.get(member.schoolId);
  if (!school || school.archivedAt !== undefined) return null;
  return { profile, member, school };
}

export type ManagerScope = NonNullable<Awaited<ReturnType<typeof schoolOf>>> & {
  isPrincipal: boolean;
  /** Set for an HOD: they may only assign to and see their own department. */
  departmentOnly: Id<"departments"> | null;
};

/**
 * Principal: always. Deputy / HOD: only when the principal delegated it (canAssign). An HOD is limited to their department.
 * Every management function goes through here, so hiding buttons is never the only protection.
 */
export async function requireManager(ctx: Ctx): Promise<ManagerScope> {
  const s = await schoolOf(ctx);
  if (!s) throw fail("FORBIDDEN", "You are not in a school.");
  const { member } = s;
  const isPrincipal = member.role === "head";
  const delegated = (member.role === "deputy" || member.role === "hod") && member.canAssign === true;
  if (!isPrincipal && !delegated) throw fail("FORBIDDEN", "Only your principal, or a deputy or head of department they have authorised, can do this.");
  if (member.role === "hod" && !member.departmentId) throw fail("FORBIDDEN", "You are not linked to a department yet. Ask your principal.");
  return { ...s, isPrincipal, departmentOnly: member.role === "hod" ? member.departmentId! : null };
}

export async function requirePrincipal(ctx: Ctx) {
  const scope = await requireManager(ctx);
  if (!scope.isPrincipal) throw fail("FORBIDDEN", "Only the principal can do this.");
  return scope;
}

/** Active members a manager may see: everyone for the principal and deputies, one department for an HOD. */
export async function membersInScope(ctx: Ctx, scope: ManagerScope) {
  const all = await ctx.db.query("schoolMembers").withIndex("by_school_and_status", (q) => q.eq("schoolId", scope.school._id).eq("status", "active")).take(300);
  return scope.departmentOnly ? all.filter((m) => m.departmentId === scope.departmentOnly) : all;
}

/** When a teacher's submission window closes: the due time plus any grace period, or a later extension. */
export function closesAt(a: Pick<Doc<"schoolAssignments">, "dueAt" | "graceMinutes">, t?: Pick<Doc<"assignmentTargets">, "extensionUntil"> | null) {
  return Math.max(a.dueAt + a.graceMinutes * 60_000, t?.extensionUntil ?? 0);
}

export async function audit(ctx: MutationCtx, schoolId: Id<"schools">, actorId: Id<"profiles">, action: string, targetLabel: string, detail?: string) {
  await ctx.db.insert("schoolAudit", { schoolId, actorId, action, targetLabel, ...(detail ? { detail: detail.slice(0, 500) } : {}), at: Date.now() });
}

/** The status a person sees for one teacher on one assignment. */
export function displayStatus(a: Doc<"schoolAssignments">, t: Doc<"assignmentTargets">, now = Date.now()) {
  if (t.status === "reviewed") return "reviewed" as const;
  if (t.status === "returned") return "returned" as const;
  if (t.status === "submitted") return t.late ? ("late" as const) : ("submitted" as const);
  if (now > closesAt(a, t)) return (t.blockedAttempts?.length ? "invalid" : "overdue") as "invalid" | "overdue";
  return t.status === "in_progress" ? ("in_progress" as const) : ("not_started" as const);
}
export type DisplayStatus = ReturnType<typeof displayStatus>;
