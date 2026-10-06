import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, type MutationCtx } from "../_generated/server";
import { INVITE_TTL_MS } from "../lib/staff";
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
  invitedAt?: number;
  _creationTime: number;
}) => ({
  _id: s._id,
  email: s.email,
  name: s.name,
  role: s.role,
  status: s.status,
  mfaEnrolledAt: s.mfaEnrolledAt,
  createdAt: s._creationTime,
  invitedAt: s.invitedAt,
  // Invited but never set up two-factor: how long the invitation has left (or that it has lapsed).
  inviteExpiresAt: s.mfaEnrolledAt === undefined && s.invitedAt !== undefined ? s.invitedAt + INVITE_TTL_MS : undefined,
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
      invitedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.admin.staff.sendInviteEmail, { staffId: id, invitedBy: staff.name || staff.email });
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
      backupCodes: undefined,
      invitedAt: Date.now(),
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

/** Starts the 14 days again and emails the invitation once more. */
export const resendInvite = staffMutation({
  permission: "staff.manage",
  requireReason: true,
  args: { staffId: v.id("staff"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const target = await ctx.db.get(args.staffId);
    if (!target) throw notFound("Staff member");
    if (target.mfaEnrolledAt !== undefined) throw fail("ALREADY_ENROLLED", "They have already set up two-factor");
    await ctx.db.patch(target._id, { invitedAt: Date.now(), updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.admin.staff.sendInviteEmail, { staffId: target._id, invitedBy: staff.name || staff.email });
    await log({ action: "staff.resend_invite", targetType: "staff", targetId: target._id, targetLabel: target.email });
    return null;
  },
});

export const staffForInvite = internalMutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, { staffId }) => {
    const s = await ctx.db.get(staffId);
    return s ? { email: s.email, name: s.name ?? "", role: s.role } : null;
  },
});

const ROLE_TEXT: Record<string, string> = {
  super_admin: "Super Admin",
  content_manager: "Content Manager",
  support_agent: "Support Agent",
  viewer: "Viewer",
};

/** Tells the person they have been invited. Failure to send never blocks the invitation itself. */
export const sendInviteEmail = internalAction({
  args: { staffId: v.id("staff"), invitedBy: v.string() },
  handler: async (ctx, { staffId, invitedBy }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const who = await ctx.runMutation(internal.admin.staff.staffForInvite, { staffId });
    if (!apiKey || !who) return;
    const site = (process.env.SITE_URL ?? "").replace(/\/$/, "");
    const adminUrl = (process.env.ADMIN_ORIGINS ?? "").split(",")[0].trim() || `${site}/admin`;
    const text = `Hello${who.name ? ` ${who.name}` : ""},\n\n${invitedBy} invited you to the Mwalimu AI staff console as ${ROLE_TEXT[who.role] ?? who.role}.\n\nSign in with this email address (${who.email}) at:\n${adminUrl}\n\nYou will set up two-factor sign-in with an authenticator app the first time, and you will be given backup codes. Keep them somewhere safe.\n\nThis invitation expires in 14 days. If you were not expecting it, you can ignore this email.`;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM ?? "Mwalimu AI <onboarding@resend.dev>", to: [who.email], subject: "You have been invited to the Mwalimu AI staff console", text }),
      });
    } catch {
      /* the invitation still stands; staff can resend */
    }
  },
});

/**
 * Break-glass for when the only Super Admin loses their authenticator and has no backup codes. Run from a trusted
 * shell with deploy access:  npx convex run admin/staff:emergencyResetMfa '{"email":"you@example.com"}'
 * They sign in and enrol again (and get new backup codes). Recorded in the audit log.
 */
export const emergencyResetMfa = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const target = await ctx.db.query("staff").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).unique();
    if (!target) throw new Error("No staff member with that email");
    await ctx.db.patch(target._id, { totpSecretEnc: undefined, mfaEnrolledAt: undefined, lastTotpStep: undefined, mfaFailedAttempts: undefined, mfaLockedUntil: undefined, backupCodes: undefined, invitedAt: Date.now(), updatedAt: Date.now() });
    for (const s of await ctx.db.query("staffSessions").withIndex("by_staff", (q) => q.eq("staffId", target._id)).take(500)) await ctx.db.delete(s._id);
    await writeAudit(ctx, target, { action: "staff.emergency_reset_mfa", targetType: "staff", targetId: target._id, targetLabel: target.email, reason: "Emergency reset from a trusted shell" });
    return target._id;
  },
});
