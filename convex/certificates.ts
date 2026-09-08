import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { requireNonEmpty } from "./lib/validation";

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
    if (!progress?.certificateEarnedAt || progress.certificateSerial?.toUpperCase() !== serial) {
      throw new ConvexError({ code: "NOT_ELIGIBLE", message: "Completed program progress is required before certificate issuance" });
    }
    const existing = await ctx.db.query("certificates").withIndex("by_serial", (q) => q.eq("serial", serial)).unique();
    if (existing) {
      if (existing.userId !== profile._id) throw new ConvexError({ code: "SERIAL_IN_USE", message: "Certificate serial is already registered" });
      return existing._id;
    }
    return await ctx.db.insert("certificates", {
      serial, userId: profile._id, programId: requireNonEmpty(args.programId, "programId", 100),
      programTitle: requireNonEmpty(args.programTitle, "programTitle", 300),
      teacherName: requireNonEmpty(args.teacherName ?? profile.name ?? "Teacher", "teacherName", 300),
      earnedAt: Date.parse(progress.certificateEarnedAt) || Date.now(),
    });
  },
});

export const upsertMine = mutation({
  args: { serial: v.string(), programId: v.string(), teacherName: v.string(), programTitle: v.string() },
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const serial = normalizeSerial(args.serial);
    const existing = await ctx.db.query("certificates").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", args.programId)).unique();
    if (existing) { await ctx.db.patch(existing._id, { serial, teacherName: args.teacherName || existing.teacherName, programTitle: args.programTitle || existing.programTitle }); return existing._id; }
    return await ctx.db.insert("certificates", { serial, userId: profile._id, programId: args.programId, programTitle: args.programTitle, teacherName: args.teacherName || profile.name || "Teacher", earnedAt: Date.now() });
  },
});

export const removeMine = mutation({
  args: { programId: v.string() }, returns: v.null(),
  handler: async (ctx, { programId }) => {
    const profile = await requireCurrentProfile(ctx);
    const existing = await ctx.db.query("certificates").withIndex("by_user_and_program", (q) => q.eq("userId", profile._id).eq("programId", programId)).unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});
