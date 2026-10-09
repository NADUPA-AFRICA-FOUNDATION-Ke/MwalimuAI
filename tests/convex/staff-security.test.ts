import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { makeStaff, newTest } from "./helpers";
import { totpCode } from "../../convex/lib/totp";

const REASON = "Following the onboarding checklist";
afterEach(() => vi.unstubAllGlobals());

async function enrol(t: ReturnType<typeof newTest>) {
  const s = await makeStaff(t, "super_admin", { mfa: false });
  const { secret } = await s.as.mutation(api.admin.mfa.beginEnrollment, {});
  const r = await s.as.mutation(api.admin.mfa.verifyCode, { code: await totpCode(secret, Date.now()) });
  if (!r.ok || !("backupCodes" in r) || !r.backupCodes) throw new Error("expected backup codes on first enrolment");
  return { s, codes: r.backupCodes, secret };
}
const newSession = (s: Awaited<ReturnType<typeof makeStaff>>, t: ReturnType<typeof newTest>, n: string) =>
  t.withIdentity({ subject: `${s.userId}|${n}`, tokenIdentifier: `test|${s.userId}`, email: s.email });

describe("staff recovery codes", () => {
  it("gives ten single-use codes at enrolment that get a lost-phone sign-in through, once each", async () => {
    const t = newTest();
    const { s, codes } = await enrol(t);
    expect(codes).toHaveLength(10);
    expect(codes[0]).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    expect((await s.as.query(api.admin.me.me, {}))).toMatchObject({ state: "ready", backupCodesLeft: 10 });

    // New browser, no authenticator: a backup code works, once.
    const fresh = newSession(s, t, "lost-phone");
    expect(await fresh.query(api.admin.me.me, {})).toMatchObject({ state: "mfa_required" });
    expect(await fresh.mutation(api.admin.mfa.verifyCode, { code: codes[3].toLowerCase().replace("-", "") })).toMatchObject({ ok: true, usedBackupCode: true, backupCodesLeft: 9 });
    expect(await fresh.query(api.admin.me.me, {})).toMatchObject({ state: "ready", backupCodesLeft: 9 });
    const again = newSession(s, t, "another");
    expect(await again.mutation(api.admin.mfa.verifyCode, { code: codes[3] })).toMatchObject({ ok: false });
    // Wrong guesses count towards the lockout like any other.
    let last;
    for (let i = 0; i < 5; i++) last = await again.mutation(api.admin.mfa.verifyCode, { code: "ZZZZ-ZZZZ" });
    expect(last).toMatchObject({ ok: false, locked: true });
    const rows = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(rows.some((r) => r.action === "staff.login_backup_code")).toBe(true);
  });

  it("regenerating replaces the codes and needs a verified session", async () => {
    const t = newTest();
    const { s, codes } = await enrol(t);
    const unverified = newSession(s, t, "unverified");
    await expect(unverified.mutation(api.admin.mfa.regenerateBackupCodes, {})).rejects.toThrow(/MFA_REQUIRED/);
    const { backupCodes } = await s.as.mutation(api.admin.mfa.regenerateBackupCodes, {});
    expect(backupCodes).toHaveLength(10);
    expect(await newSession(s, t, "old").mutation(api.admin.mfa.verifyCode, { code: codes[0] })).toMatchObject({ ok: false });
    expect(await newSession(s, t, "new").mutation(api.admin.mfa.verifyCode, { code: backupCodes[0] })).toMatchObject({ ok: true });
  });

  it("a Super Admin reset, or the break-glass command, clears codes so the person can enrol again", async () => {
    const t = newTest();
    const { s: lost, codes } = await enrol(t);
    const admin = await makeStaff(t, "super_admin");
    await admin.as.mutation(api.admin.staff.resetMfa, { staffId: lost.staffId, reason: REASON });
    expect(await lost.as.query(api.admin.me.me, {})).toMatchObject({ state: "mfa_enrollment_required" });
    await expect(newSession(lost, t, "x").mutation(api.admin.mfa.verifyCode, { code: codes[0] })).rejects.toThrow(/NOT_ENROLLED/); // codes are void until they enrol again

    await t.mutation(internal.admin.staff.emergencyResetMfa, { email: lost.email });
    const row = await t.run((ctx) => ctx.db.get(lost.staffId));
    expect(row?.backupCodes).toBeUndefined();
  });
});

describe("staff invitations", () => {
  it("lapse after 14 days unless used, can be resent, and are emailed", async () => {
    const sent: { to: string[]; subject: string; text: string }[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => { sent.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); });
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const id = await admin.as.mutation(api.admin.staff.invite, { email: "newbie@school.test", role: "support_agent", reason: REASON });
    await t.action(internal.admin.staff.sendInviteEmail, { staffId: id, invitedBy: "Admin" });
    expect(sent.at(-1)).toMatchObject({ to: ["newbie@school.test"], subject: expect.stringMatching(/invited/) });
    expect(sent.at(-1)!.text).toContain("expires in 14 days");

    const listed = (await admin.as.query(api.admin.staff.list, {})).find((x) => x._id === id)!;
    expect(listed.inviteExpiresAt).toBeGreaterThan(Date.now());

    // Fifteen days pass without them setting up 2FA: the invitation no longer grants access.
    const person = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { email: "newbie@school.test", emailVerificationTime: Date.now() });
      await ctx.db.patch(id, { invitedAt: Date.now() - 15 * 86_400_000 });
      return userId;
    });
    const as = t.withIdentity({ subject: `${person}|s1`, tokenIdentifier: `test|${person}`, email: "newbie@school.test" });
    expect(await as.query(api.admin.me.me, {})).toEqual({ state: "not_staff" });
    await admin.as.mutation(api.admin.staff.resendInvite, { staffId: id, reason: REASON });
    expect(await as.query(api.admin.me.me, {})).toMatchObject({ state: "mfa_enrollment_required" });
  });
});

describe("staff sign-in session", () => {
  // Production incident 9 Oct 2026: a sign-in session first verified >12h earlier kept asking for a code. Every
  // correct code was accepted and recorded, but the oldest (expired) verification for the session was the one read.
  it("treats a session as verified after a fresh code, even if an older verification for it has expired", async () => {
    const t = newTest();
    const { s, secret } = await enrol(t);
    const as = newSession(s, t, "long-lived");
    const thirteenHoursAgo = Date.now() - 13 * 3_600_000;
    await t.run(async (ctx) => {
      await ctx.db.insert("staffSessions", { staffId: s.staffId, authSessionId: "long-lived", verifiedAt: thirteenHoursAgo });
    });
    expect(await as.query(api.admin.me.me, {})).toMatchObject({ state: "mfa_required" });

    // The authenticator moves on a step, as it would hours later; the code must be newer than the enrolment one.
    const r = await as.mutation(api.admin.mfa.verifyCode, { code: await totpCode(secret, Date.now() + 30_000) });
    expect(r.ok).toBe(true);
    expect(await as.query(api.admin.me.me, {})).toMatchObject({ state: "ready" });
  });
});
