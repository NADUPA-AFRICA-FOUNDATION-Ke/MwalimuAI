import { query } from "../_generated/server";
import { resolveStaff } from "../lib/staff";
import { ROLE_PERMISSIONS } from "../lib/permissions";

/** Safe to call from any signed-in user: reveals nothing beyond "not staff". */
export const me = query({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.auth.getUserIdentity()) === null) return { state: "signed_out" as const };
    let staffCtx;
    try {
      staffCtx = await resolveStaff(ctx);
    } catch {
      return { state: "not_staff" as const };
    }
    const { staff, mfaVerified } = staffCtx;
    return {
      state: mfaVerified
        ? ("ready" as const)
        : staff.mfaEnrolledAt
          ? ("mfa_required" as const)
          : ("mfa_enrollment_required" as const),
      email: staff.email,
      name: staff.name,
      role: staff.role,
      permissions: mfaVerified ? [...ROLE_PERMISSIONS[staff.role]] : [],
      backupCodesLeft: mfaVerified ? (staff.backupCodes?.length ?? 0) : 0,
    };
  },
});
