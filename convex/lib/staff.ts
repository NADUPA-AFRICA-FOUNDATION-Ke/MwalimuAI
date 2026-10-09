import { type ObjectType, type PropertyValidators } from "convex/values";
import type { RegisteredMutation, RegisteredQuery } from "convex/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireIdentity } from "./auth";
import { writeAudit, type AuditEntry } from "./audit";
import { MIN_REASON_LENGTH, roleHasPermission, type Permission } from "./permissions";
import { fail, forbidden } from "./errors";

const MFA_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type StaffContext = { staff: Doc<"staff">; authSessionId: string; mfaVerified: boolean };

/** Resolves the signed-in Convex Auth user to an active staff row via a *verified* email. */
export async function resolveStaff(ctx: QueryCtx | MutationCtx): Promise<StaffContext> {
  const identity = await requireIdentity(ctx);
  const [userId, authSessionId = ""] = identity.subject.split("|");
  let user: Doc<"users"> | null = null;
  try {
    user = await ctx.db.get(userId as Id<"users">);
  } catch {
    /* non-document subject */
  }
  const email = user?.email?.trim().toLowerCase();
  if (!email || !user?.emailVerificationTime) throw forbidden();
  const staff = await ctx.db
    .query("staff")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (!staff || staff.status !== "active") throw forbidden();
  // An invitation nobody acted on is not a standing credential: it lapses after 14 days until staff re-invite them.
  if (staff.mfaEnrolledAt === undefined && staff.invitedAt !== undefined && Date.now() - staff.invitedAt > INVITE_TTL_MS) throw forbidden();
  // Newest verification wins: an older, expired row for the same sign-in must not hide a fresh code.
  const session = await ctx.db
    .query("staffSessions")
    .withIndex("by_session", (q) => q.eq("authSessionId", authSessionId))
    .order("desc")
    .first();
  const mfaVerified = Boolean(
    session &&
    session.staffId === staff._id &&
    staff.mfaEnrolledAt !== undefined &&
    Date.now() - session.verifiedAt < MFA_SESSION_TTL_MS,
  );
  return { staff, authSessionId, mfaVerified };
}

/** Records that this sign-in passed the code check now, refreshing its existing row rather than adding another. */
export async function markMfaVerified(ctx: MutationCtx, staffId: Id<"staff">, authSessionId: string, now: number) {
  const rows = await ctx.db
    .query("staffSessions")
    .withIndex("by_session", (q) => q.eq("authSessionId", authSessionId))
    .take(50);
  const [keep, ...extra] = rows.filter((r) => r.staffId === staffId);
  for (const r of extra) await ctx.db.delete(r._id);
  if (keep) await ctx.db.patch(keep._id, { verifiedAt: now });
  else await ctx.db.insert("staffSessions", { staffId, authSessionId, verifiedAt: now });
}

export async function requireStaff(ctx: QueryCtx | MutationCtx, permission: Permission): Promise<StaffContext> {
  const staffCtx = await resolveStaff(ctx);
  if (!staffCtx.mfaVerified) throw fail("MFA_REQUIRED", "Complete two-factor verification");
  if (!roleHasPermission(staffCtx.staff.role, permission)) throw forbidden();
  return staffCtx;
}

type LogFn = (entry: AuditEntry) => Promise<Id<"auditLog">>;

export function staffQuery<Args extends PropertyValidators, R>(def: {
  permission: Permission;
  args: Args;
  handler: (ctx: QueryCtx, args: ObjectType<Args>, staff: StaffContext) => Promise<R>;
}): RegisteredQuery<"public", ObjectType<Args>, Promise<R>> {
  // Cast: Convex's registration generics can't be satisfied by a generic validator map.
  return (query as any)({
    args: def.args,
    handler: async (ctx: QueryCtx, args: ObjectType<Args>) => {
      const staff = await requireStaff(ctx, def.permission);
      return def.handler(ctx, args, staff);
    },
  });
}

/**
 * Every admin mutation goes through here: permission + MFA check, mandatory
 * reason (when requireReason), and a guarantee that at least one audit row is
 * written in the same transaction. A handler that logs nothing is rolled back.
 */
export function staffMutation<Args extends PropertyValidators, R>(def: {
  permission: Permission;
  args: Args;
  requireReason?: boolean;
  handler: (ctx: MutationCtx, args: ObjectType<Args>, staff: StaffContext, log: LogFn) => Promise<R>;
}): RegisteredMutation<"public", ObjectType<Args>, Promise<R>> {
  return (mutation as any)({
    args: def.args,
    handler: async (ctx: MutationCtx, args: ObjectType<Args>) => {
      const staffCtx = await requireStaff(ctx, def.permission);
      const reason = (args as { reason?: string }).reason;
      if (def.requireReason) assertReason(reason);
      let logged = 0;
      const log: LogFn = async (entry: AuditEntry) => {
        logged++;
        return writeAudit(ctx, staffCtx.staff, { reason: entry.reason ?? reason?.trim(), ...entry });
      };
      const result = await def.handler(ctx, args, staffCtx, log);
      if (logged === 0) throw new Error("Admin mutation completed without an audit entry");
      return result;
    },
  });
}

export function assertReason(reason: string | undefined): asserts reason is string {
  if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
    throw fail("REASON_REQUIRED", `A reason of at least ${MIN_REASON_LENGTH} characters is required`);
  }
}
