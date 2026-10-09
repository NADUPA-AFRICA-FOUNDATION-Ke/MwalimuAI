import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { markMfaVerified, resolveStaff } from "../lib/staff";
import { writeAudit } from "../lib/audit";
import { decryptSecret, encryptSecret, generateTotpSecret, otpauthUri, verifyTotp } from "../lib/totp";
import { fail } from "../lib/errors";
import { BACKUP_CODE_PATTERN, generateBackupCodes, matchBackupCode } from "../lib/backupCodes";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

async function resolveForMfa(ctx: Parameters<typeof resolveStaff>[0]) {
  try {
    return await resolveStaff(ctx);
  } catch {
    throw fail("FORBIDDEN", "Not authorised");
  }
}

/** First-time setup. Refuses once enrolled; a Super Admin must reset MFA to re-enroll. */
export const beginEnrollment = mutation({
  args: {},
  handler: async (ctx) => {
    const { staff } = await resolveForMfa(ctx);
    if (staff.mfaEnrolledAt !== undefined) throw fail("ALREADY_ENROLLED", "Two-factor is already set up");
    const secret = generateTotpSecret();
    await ctx.db.patch(staff._id, { totpSecretEnc: await encryptSecret(secret), updatedAt: Date.now() });
    return { secret, uri: otpauthUri(staff.email, secret) };
  },
});

/**
 * Accepts the authenticator's 6-digit code, or (once enrolled) one of the single-use backup codes for a lost phone.
 * On first enrolment it also returns the backup codes, once.
 */
export const verifyCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const { staff, authSessionId } = await resolveForMfa(ctx);
    const now = Date.now();
    if (staff.mfaLockedUntil && staff.mfaLockedUntil > now) {
      return { ok: false as const, locked: true, retryAfterSeconds: Math.ceil((staff.mfaLockedUntil - now) / 1000) };
    }
    const entered = code.trim();
    const failed = async () => {
      const failures = (staff.mfaFailedAttempts ?? 0) + 1;
      const locked = failures >= MAX_FAILURES;
      await ctx.db.patch(staff._id, { mfaFailedAttempts: locked ? 0 : failures, ...(locked ? { mfaLockedUntil: now + LOCK_MS } : {}) });
      return { ok: false as const, locked, retryAfterSeconds: locked ? LOCK_MS / 1000 : 0 };
    };

    // A backup code: only for someone already enrolled.
    if (BACKUP_CODE_PATTERN.test(entered) && staff.mfaEnrolledAt !== undefined) {
      const stored = staff.backupCodes ?? [];
      const at = await matchBackupCode(stored, entered);
      if (at < 0) return await failed();
      const remaining = stored.filter((_, i) => i !== at);
      await ctx.db.patch(staff._id, { backupCodes: remaining, mfaFailedAttempts: 0, updatedAt: now });
      await markMfaVerified(ctx, staff._id, authSessionId, now);
      await writeAudit(ctx, staff, { action: "staff.login_backup_code", targetType: "staff", targetId: staff._id, targetLabel: staff.email, after: { backupCodesLeft: remaining.length } });
      return { ok: true as const, usedBackupCode: true, backupCodesLeft: remaining.length };
    }

    if (!staff.totpSecretEnc) throw fail("NOT_ENROLLED", "Start two-factor setup first");
    const step = await verifyTotp(await decryptSecret(staff.totpSecretEnc), entered, now);
    if (step === null || (staff.lastTotpStep !== undefined && step <= staff.lastTotpStep)) return await failed();

    const firstEnrollment = staff.mfaEnrolledAt === undefined;
    const fresh = firstEnrollment ? await generateBackupCodes() : null;
    await ctx.db.patch(staff._id, {
      mfaEnrolledAt: staff.mfaEnrolledAt ?? now,
      mfaFailedAttempts: 0,
      lastTotpStep: step,
      ...(fresh ? { backupCodes: fresh.stored } : {}),
      updatedAt: now,
    });
    await markMfaVerified(ctx, staff._id, authSessionId, now);
    await writeAudit(ctx, staff, {
      action: firstEnrollment ? "staff.mfa_enrolled" : "staff.login",
      targetType: "staff",
      targetId: staff._id,
      targetLabel: staff.email,
    });
    return { ok: true as const, ...(fresh ? { backupCodes: fresh.plain } : {}) };
  },
});

/** New set of backup codes (the old ones stop working). Needs a verified session, so a stolen password alone is not enough. */
export const regenerateBackupCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const { staff, mfaVerified } = await resolveForMfa(ctx);
    if (!mfaVerified) throw fail("MFA_REQUIRED", "Complete two-factor verification first");
    const fresh = await generateBackupCodes();
    await ctx.db.patch(staff._id, { backupCodes: fresh.stored, updatedAt: Date.now() });
    await writeAudit(ctx, staff, { action: "staff.backup_codes_regenerated", targetType: "staff", targetId: staff._id, targetLabel: staff.email });
    return { backupCodes: fresh.plain };
  },
});
