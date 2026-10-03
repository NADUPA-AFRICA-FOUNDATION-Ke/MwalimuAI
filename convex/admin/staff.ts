import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { staffMutation, staffQuery } from "../lib/staff";
import { writeAudit } from "../lib/audit";

const role = v.union(
  v.literal("super_admin"),
  v.literal("content_manager"),
  v.literal("support_agent"),
  v.literal("viewer"),
);

import type { Id } from "../_generated/dataModel";
import { fail, notFound } from "../lib/errors";
const safe = (s: {
  _id: Id<"staff">;
  email: string;
  name?: string;
  role: string;
  status: string;
  mfaEnrolledAt?: number;
  _creationTime: number;
}) => ({
  _id: s._id,
  email: s.email,
  name: s.name,
  role: s.role,
  status: s.status,
  mfaEnrolledAt: s.mfaEnrolledAt,
  createdAt: s._creationTime,
});

export const list = staffQuery({
  permission: "staff.manage",
  args: {},
  handler: async (ctx) => (await ctx.db.query("staff").take(200)).map(safe),
});

async function activeSuperAdmins(ctx: MutationCtx) {
  return (await ctx.db.query("staff").take(200)).filter((s) => s.role === "super_admin" && s.status === "active");
}

export const invite = staffMutation({
  permission: "staff.manage",
  requireReason: true,
  args: { email: v.string(), name: v.optional(v.string()), role, reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail("INVALID_ARGUMENT", "Invalid email");
    const existing = await ctx.db
      .query("staff")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw fail("ALREADY_EXISTS", "That person is already staff");
    const id = await ctx.db.insert("staff", {
      email,
      ...(args.name ? { name: args.name.trim() } : {}),
      role: args.role,
      status: "active",
      createdBy: staff._id,
      updatedAt: Date.now(),
    });
    await log({
      action: "staff.invite",
      targetType: "staff",
      targetId: id,
      targetLabel: email,
      after: { role: args.role },
    });
    return id;
  },
});

export const setRole = staffMutation({
  permission: "staff.manage",
  requireReason: true,
  args: { staffId: v.id("staff"), role, reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const target = await ctx.db.get(args.staffId);
    if (!target) throw notFound("Staff member");
    if (target._id === staff._id) throw fail("INVALID_ARGUMENT", "You cannot change your own role");
    if (target.role === "super_admin" && args.role !== "super_admin" && (await activeSuperAdmins(ctx)).length <= 1) {
      throw fail("LAST_SUPER_ADMIN", "There must be at least one active Super Admin");
    }
    await ctx.db.patch(target._id, { role: args.role, updatedAt: Date.now() });
    await log({
      action: "staff.set_role",
      targetType: "staff",
      targetId: target._id,
      targetLabel: target.email,
      before: { role: target.role },
      after: { role: args.role },
    });
    return null;
  },
});

export const setStatus = staffMutation({
  permission: "staff.manage",
  requireReason: true,
  args: { staffId: v.id("staff"), status: v.union(v.literal("active"), v.literal("disabled")), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const target = await ctx.db.get(args.staffId);
    if (!target) throw notFound("Staff member");
    if (target._id === staff._id) throw fail("INVALID_ARGUMENT", "You cannot disable yourself");
    if (args.status === "disabled" && target.role === "super_admin" && (await activeSuperAdmins(ctx)).length <= 1) {
      throw fail("LAST_SUPER_ADMIN", "There must be at least one active Super Admin");
    }
    await ctx.db.patch(target._id, { status: args.status, updatedAt: Date.now() });
    await log({
      action: "staff.set_status",
      targetType: "staff",
      targetId: target._id,
      targetLabel: target.email,
      before: { status: target.status },
      after: { status: args.status },
    });
    return null;
  },
});

/** Clears the authenticator and every verified session; the person must enrol again. */
export const resetMfa = staffMutation({
  permission: "staff.manage",
  requireReason: true,
  args: { staffId: v.id("staff"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const target = await ctx.db.get(args.staffId);
    if (!target) throw notFound("Staff member");
    await ctx.db.patch(target._id, {
      totpSecretEnc: undefined,
      mfaEnrolledAt: undefined,
      lastTotpStep: undefined,
      mfaFailedAttempts: undefined,
      mfaLockedUntil: undefined,
      updatedAt: Date.now(),
    });
    for (const s of await ctx.db
      .query("staffSessions")
      .withIndex("by_staff", (q) => q.eq("staffId", target._id))
      .take(500)) {
      await ctx.db.delete(s._id);
    }
    await log({ action: "staff.reset_mfa", targetType: "staff", targetId: target._id, targetLabel: target.email });
    return null;
  },
});

/**
 * First Super Admin. Run from a trusted shell only:
 *   npx convex run admin/staff:bootstrapSuperAdmin '{"email":"you@example.com"}'
 * Refuses once any staff exists.
 */
export const bootstrapSuperAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if ((await ctx.db.query("staff").first()) !== null)
      throw new Error("Staff already exist; use the console to invite more");
    const normalized = email.trim().toLowerCase();
    const id = await ctx.db.insert("staff", {
      email: normalized,
      role: "super_admin",
      status: "active",
      updatedAt: Date.now(),
    });
    const doc = (await ctx.db.get(id))!;
    await writeAudit(ctx, doc, {
      action: "staff.bootstrap",
      targetType: "staff",
      targetId: id,
      targetLabel: normalized,
      reason: "Initial Super Admin created from CLI",
    });
    return id;
  },
});
