import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { resolveStaff } from "../lib/staff";
import { writeAudit } from "../lib/audit";
import { decryptSecret, encryptSecret, generateTotpSecret, otpauthUri, verifyTotp } from "../lib/totp";
import { fail } from "../lib/errors";

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

export const verifyCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const { staff, authSessionId } = await resolveForMfa(ctx);
    const now = Date.now();
    if (staff.mfaLockedUntil && staff.mfaLockedUntil > now) {
      return { ok: false as const, locked: true, retryAfterSeconds: Math.ceil((staff.mfaLockedUntil - now) / 1000) };
    }
    if (!staff.totpSecretEnc) throw fail("NOT_ENROLLED", "Start two-factor setup first");
    const step = await verifyTotp(await decryptSecret(staff.totpSecretEnc), code.trim(), now);
    if (step === null || (staff.lastTotpStep !== undefined && step <= staff.lastTotpStep)) {
      const failures = (staff.mfaFailedAttempts ?? 0) + 1;
      const locked = failures >= MAX_FAILURES;
      await ctx.db.patch(staff._id, {
        mfaFailedAttempts: locked ? 0 : failures,
        ...(locked ? { mfaLockedUntil: now + LOCK_MS } : {}),
      });
      return { ok: false as const, locked, retryAfterSeconds: locked ? LOCK_MS / 1000 : 0 };
    }
    const firstEnrollment = staff.mfaEnrolledAt === undefined;
    await ctx.db.patch(staff._id, {
      mfaEnrolledAt: staff.mfaEnrolledAt ?? now,
      mfaFailedAttempts: 0,
      lastTotpStep: step,
      updatedAt: now,
    });
    await ctx.db.insert("staffSessions", { staffId: staff._id, authSessionId, verifiedAt: now });
    await writeAudit(ctx, staff, {
      action: firstEnrollment ? "staff.mfa_enrolled" : "staff.login",
      targetType: "staff",
      targetId: staff._id,
      targetLabel: staff.email,
    });
    return { ok: true as const };
  },
});
