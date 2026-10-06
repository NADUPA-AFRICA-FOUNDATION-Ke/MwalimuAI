import { queueEmail } from "./lib/emailQueue";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { requireNonEmpty } from "./lib/validation";
import { isProgramCompleteServer, loadProgramDef } from "./lib/eligibility";
import { programTitleFor } from "./lib/contentRead";
import { fail } from "./lib/errors";

const certificateDoc = v.object({
  _id: v.id("certificates"), _creationTime: v.number(), serial: v.string(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  programId: v.string(), programTitle: v.string(), teacherName: v.string(), earnedAt: v.number(),
  revokedAt: v.optional(v.number()), revocationReason: v.optional(v.string()),
});
const verification = v.object({
  serial: v.string(), programId: v.string(), programTitle: v.string(), teacherName: v.string(), earnedAt: v.number(), valid: v.boolean(),
});

function normalizeSerial(serial: string) {
  return requireNonEmpty(serial, "serial", 64).toUpperCase();
}

export const verify = query({
  args: { serial: v.string() }, returns: v.union(v.null(), verification),
  handler: async (ctx, { serial }) => {
    const normalized = normalizeSerial(serial);
    const certificate = await ctx.db.query("certificates").withIndex("by_serial", (q) => q.eq("serial", normalized)).unique();
    if (!certificate) return null;
    return { serial: certificate.serial, programId: certificate.programId, programTitle: certificate.programTitle,
      teacherName: certificate.teacherName, earnedAt: certificate.earnedAt, valid: certificate.revokedAt === undefined };
  },
});

export const mine = query({
  args: {}, returns: v.array(certificateDoc),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("certificates").withIndex("by_user", (q) => q.eq("userId", profile._id)).order("desc").take(100);
  },
});

export const issueMine = mutation({
  args: { serial: v.string(), programId: v.string(), programTitle: v.string(), teacherName: v.optional(v.string()) },
  returns: v.id("certificates"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx); const serial = normalizeSerial(args.serial);
    const progress = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) =>
      q.eq("userId", profile._id).eq("programId", args.programId)).unique();
    if (!progress?.certificateEarnedAt || progress.certificateSerial?.toUpperCase() !== serial
      || !isProgramCompleteServer(await loadProgramDef(ctx, args.programId), progress)) {
      throw fail("NOT_ELIGIBLE", "Completed program progress is required before certificate issuance");
    }
    const programTitle = (await programTitleFor(ctx, args.programId)) ?? args.programTitle;
    const existing = await ctx.db.query("certificates").withIndex("by_serial", (q) => q.eq("serial", serial)).unique();
    if (existing) {
      if (existing.userId !== profile._id) throw fail("SERIAL_IN_USE", "Certificate serial is already registered");
      return existing._id;
    }
    const id = await ctx.db.insert("certificates", {
      serial, userId: profile._id, programId: requireNonEmpty(args.programId, "programId", 100),
      programTitle: requireNonEmpty(programTitle, "programTitle", 300),
      teacherName: requireNonEmpty(args.teacherName ?? profile.name ?? "Teacher", "teacherName", 300),
      earnedAt: Date.parse(progress.certificateEarnedAt) || Date.now(),
    });
    await queueEmail(ctx, { profileId: profile._id, kind: "certificate", dedupeKey: `cert:${serial}`, data: { programTitle, serial, programId: args.programId } });
    return id;
  },
});

export const upsertMine = mutation({
  args: { serial: v.string(), programId: v.string(), teacherName: v.string(), programTitle: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const serial = normalizeSerial(args.serial);
    // Registration is only allowed for the serial the server already accepted on
    // this user's own, eligible progress (see learningProgress.save).
    const progress = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) =>
      q.eq("userId", profile._id).eq("programId", args.programId)).unique();
    const programTitle = await programTitleFor(ctx, args.programId);
    if (!programTitle || !progress?.certificateSerial || progress.certificateSerial.toUpperCase() !== serial
      || !isProgramCompleteServer(await loadProgramDef(ctx, args.programId), progress)) {
      throw fail("NOT_ELIGIBLE", "Completed program progress is required before certificate issuance");
    }
    const owner = await ctx.db.query("certificates").withIndex("by_serial", (q) => q.eq("serial", serial)).unique();
    if (owner && owner.userId !== profile._id) throw fail("SERIAL_IN_USE", "Certificate serial is already registered");
    const existing = await ctx.db.query("certificates").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", args.programId)).unique();
    const teacherName = requireNonEmpty(args.teacherName || profile.name || "Teacher", "teacherName", 300);
    if (existing) {
      // Serial and revocation state are staff-controlled once issued; only the display name may update.
      await ctx.db.patch(existing._id, { teacherName });
      return existing._id;
    }
    const id = await ctx.db.insert("certificates", {
      serial, userId: profile._id, programId: args.programId, programTitle, teacherName,
      earnedAt: Date.parse(progress.certificateEarnedAt ?? "") || Date.now(),
    });
    await queueEmail(ctx, { profileId: profile._id, kind: "certificate", dedupeKey: `cert:${serial}`, data: { programTitle, serial, programId: args.programId } });
    return id;
  },
});

// Kept for client compatibility. Learners can no longer delete or revoke issued certificates:
// a content edit or a retake must never silently invalidate a credential. Staff revoke, with an audit trail.
export const removeMine = mutation({
  args: { programId: v.string() }, returns: v.null(),
  handler: async (ctx) => {
    await requireCurrentProfile(ctx);
    return null;
  },
});
