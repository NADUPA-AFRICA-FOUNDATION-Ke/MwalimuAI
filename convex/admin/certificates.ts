import { v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { staffMutation } from "../lib/staff";
import { fail, notFound } from "../lib/errors";
import { notify } from "../lib/notices";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // same alphabet as the learner app's serials
const block = (n: number) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => ALPHABET[b % ALPHABET.length]).join("");

async function freshSerial(ctx: MutationCtx) {
  for (let i = 0; i < 10; i++) {
    const serial = `MW-${block(5)}-${block(5)}`;
    if (
      !(await ctx.db
        .query("certificates")
        .withIndex("by_serial", (q) => q.eq("serial", serial))
        .first())
    )
      return serial;
  }
  throw new Error("Could not allocate a unique certificate serial");
}

export const revoke = staffMutation({
  permission: "certificates.manage",
  requireReason: true,
  args: { certificateId: v.id("certificates"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const c = await ctx.db.get(args.certificateId);
    if (!c) throw notFound("Certificate");
    if (c.revokedAt !== undefined) throw fail("NO_CHANGES", "Already revoked");
    await ctx.db.patch(c._id, { revokedAt: Date.now(), revocationReason: args.reason.trim() });
    await notify(ctx, c.userId, {
      title: "A certificate was revoked",
      body: `${c.programTitle} (${c.serial}): ${args.reason.trim()}`,
      link: "/support",
    });
    await log({
      action: "certificate.revoke",
      targetType: "certificate",
      targetId: c._id,
      targetLabel: c.serial,
      before: { revoked: false },
      after: { revoked: true },
    });
    return null;
  },
});

export const reinstate = staffMutation({
  permission: "certificates.manage",
  requireReason: true,
  args: { certificateId: v.id("certificates"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const c = await ctx.db.get(args.certificateId);
    if (!c) throw notFound("Certificate");
    if (c.revokedAt === undefined) throw fail("NO_CHANGES", "Not revoked");
    await ctx.db.patch(c._id, { revokedAt: undefined, revocationReason: undefined });
    await notify(ctx, c.userId, {
      title: "Your certificate was reinstated",
      body: `${c.programTitle} (${c.serial}) is valid again.`,
      link: `/dashboard/learning/${c.programId}/certificate`,
    });
    await log({
      action: "certificate.reinstate",
      targetType: "certificate",
      targetId: c._id,
      targetLabel: c.serial,
      before: { revoked: true, reason: c.revocationReason ?? null },
      after: { revoked: false },
    });
    return null;
  },
});

/** Issues a replacement with a new serial (e.g. name correction) and revokes the old one. */
export const reissue = staffMutation({
  permission: "certificates.manage",
  requireReason: true,
  args: { certificateId: v.id("certificates"), teacherName: v.optional(v.string()), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const old = await ctx.db.get(args.certificateId);
    if (!old) throw notFound("Certificate");
    const serial = await freshSerial(ctx);
    const teacherName = (args.teacherName?.trim() || old.teacherName).slice(0, 300);
    const newId = await ctx.db.insert("certificates", {
      serial,
      userId: old.userId,
      programId: old.programId,
      programTitle: old.programTitle,
      teacherName,
      earnedAt: old.earnedAt,
      reissuedFrom: old._id,
    });
    if (old.revokedAt === undefined) {
      await ctx.db.patch(old._id, {
        revokedAt: Date.now(),
        revocationReason: `Reissued as ${serial}: ${args.reason.trim()}`,
      });
    }
    // Point the learner's progress at the new serial so their certificate page and PDF show it.
    const progress = await ctx.db
      .query("learningProgress")
      .withIndex("by_user_and_program", (q) => q.eq("userId", old.userId).eq("programId", old.programId))
      .unique();
    if (progress) await ctx.db.patch(progress._id, { certificateSerial: serial });
    await notify(ctx, old.userId, {
      title: "Your certificate was reissued",
      body: `${old.programTitle} now has the new serial ${serial}.`,
      link: `/dashboard/learning/${old.programId}/certificate`,
    });
    await log({
      action: "certificate.reissue",
      targetType: "certificate",
      targetId: old._id,
      targetLabel: old.serial,
      before: { serial: old.serial, teacherName: old.teacherName },
      after: { serial, teacherName, newCertificateId: newId },
    });
    return { certificateId: newId, serial };
  },
});
