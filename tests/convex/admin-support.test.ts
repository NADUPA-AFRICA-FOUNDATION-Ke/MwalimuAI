import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { addActivity, days, makeLearner, makeStaff, newTest } from "./helpers";
import { totpCode } from "../../convex/lib/totp";
import { computeStreak } from "../../convex/lib/streakMath";

const REASON = "Verified support ticket SUP-1042: sync bug";
const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(new RegExp(code));

describe("access control", () => {
  it("rejects non-staff, missing MFA and wrong roles on the server", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const noMfa = await makeStaff(t, "super_admin", { mfa: false });
    const viewer = await makeStaff(t, "viewer");
    const content = await makeStaff(t, "content_manager");
    const support = await makeStaff(t, "support_agent");
    const target = await makeLearner(t);

    await rejects(learner.as.query(api.admin.users.get, { profileId: target.profileId }), "FORBIDDEN");
    await rejects(t.query(api.admin.users.get, { profileId: target.profileId }), "UNAUTHENTICATED");
    await rejects(noMfa.as.query(api.admin.users.get, { profileId: target.profileId }), "MFA_REQUIRED");
    // viewer: read-only
    await expect(viewer.as.query(api.admin.users.get, { profileId: target.profileId })).resolves.toBeTruthy();
    await rejects(
      viewer.as.mutation(api.admin.users.updateProfile, { profileId: target.profileId, name: "X Y", reason: REASON }),
      "FORBIDDEN",
    );
    // content manager: no support tools
    await rejects(content.as.query(api.admin.users.get, { profileId: target.profileId }), "FORBIDDEN");
    await rejects(
      content.as.mutation(api.admin.streaks.restore, {
        profileId: target.profileId,
        fromDate: days(3),
        toDate: days(2),
        reason: REASON,
      }),
      "FORBIDDEN",
    );
    // support agent: no staff management
    await rejects(
      support.as.mutation(api.admin.staff.invite, { email: "new@x.test", role: "viewer", reason: REASON }),
      "FORBIDDEN",
    );
    await rejects(support.as.query(api.admin.staff.list, {}), "FORBIDDEN");
  });

  it("reports staff state without leaking to learners", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const staff = await makeStaff(t, "support_agent");
    expect(await learner.as.query(api.admin.me.me, {})).toEqual({ state: "not_staff" });
    expect(await staff.as.query(api.admin.me.me, {})).toMatchObject({ state: "ready", role: "support_agent" });
  });
});

describe("MFA", () => {
  it("enrols, verifies, blocks replay and locks after repeated failures", async () => {
    const t = newTest();
    const s = await makeStaff(t, "super_admin", { mfa: false });
    const { secret } = await s.as.mutation(api.admin.mfa.beginEnrollment, {});
    expect(await s.as.query(api.admin.me.me, {})).toMatchObject({ state: "mfa_enrollment_required" });

    const code = await totpCode(secret, Date.now());
    expect(await s.as.mutation(api.admin.mfa.verifyCode, { code })).toMatchObject({ ok: true });
    expect(await s.as.query(api.admin.me.me, {})).toMatchObject({ state: "ready" });
    // same code again from a fresh session is a replay
    const again = await s.as.mutation(api.admin.mfa.verifyCode, { code });
    expect(again.ok).toBe(false);

    let last;
    for (let i = 0; i < 5; i++) last = await s.as.mutation(api.admin.mfa.verifyCode, { code: "000000" });
    expect(last).toMatchObject({ ok: false, locked: true });
    const locked = await s.as.mutation(api.admin.mfa.verifyCode, { code: await totpCode(secret, Date.now() + 30_000) });
    expect(locked).toMatchObject({ ok: false, locked: true });
    await rejects(s.as.mutation(api.admin.mfa.beginEnrollment, {}), "ALREADY_ENROLLED");
  });
});

describe("streak restoration", () => {
  it("restores missing days, audits before/after with the reason, and never duplicates", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const u = await makeLearner(t);
    // active 10..6 days ago, outage 5..3, active 2..1 days ago: streak is broken
    await addActivity(t, u.profileId, [10, 9, 8, 7, 6, 2, 1].map(days));

    const preview = await support.as.query(api.admin.streaks.preview, {
      profileId: u.profileId,
      fromDate: days(5),
      toDate: days(3),
    });
    if (!preview.ok) throw new Error(preview.error);
    expect(preview.datesToRestore).toHaveLength(3);
    expect(preview.after.current).toBeGreaterThan(preview.before.current);
    // an out-of-policy range is reported, not thrown
    expect(
      await support.as.query(api.admin.streaks.preview, {
        profileId: u.profileId,
        fromDate: days(60),
        toDate: days(58),
      }),
    ).toMatchObject({ ok: false });

    const res = await support.as.mutation(api.admin.streaks.restore, {
      profileId: u.profileId,
      fromDate: days(5),
      toDate: days(3),
      reason: REASON,
      ticketRef: "SUP-1042",
    });
    expect(res.datesRestored).toHaveLength(3);
    expect(res.before.current).toBe(2);
    expect(res.after.current).toBe(10); // days 10..1 are now one unbroken run

    const audit = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: "streak.restore",
      targetId: u.profileId,
      reason: REASON,
      actorEmail: support.email,
    });
    expect((audit[0].before as { current: number }).current).toBe(res.before.current);
    expect((audit[0].after as { current: number }).current).toBe(res.after.current);

    // learner-facing rows carry the restored flag and show up in the learner's own feed
    const mine = await u.as.query(api.activity.listMine, {});
    expect(mine.filter((r) => r.source === "restored")).toHaveLength(3);

    await rejects(
      support.as.mutation(api.admin.streaks.restore, {
        profileId: u.profileId,
        fromDate: days(5),
        toDate: days(3),
        reason: REASON,
      }),
      "NOTHING_TO_RESTORE",
    );
  });

  it("requires a real reason and enforces the look-back cap, with a Super Admin override", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const admin = await makeStaff(t, "super_admin");
    const u = await makeLearner(t);
    await rejects(
      support.as.mutation(api.admin.streaks.restore, {
        profileId: u.profileId,
        fromDate: days(5),
        toDate: days(4),
        reason: "ok",
      }),
      "REASON_REQUIRED",
    );
    await rejects(
      support.as.mutation(api.admin.streaks.restore, {
        profileId: u.profileId,
        fromDate: days(40),
        toDate: days(38),
        reason: REASON,
      }),
      "LOOKBACK_EXCEEDED",
    );
    await rejects(
      support.as.mutation(api.admin.streaks.restore, {
        profileId: u.profileId,
        fromDate: days(40),
        toDate: days(38),
        reason: REASON,
        overrideLookback: true,
      }),
      "FORBIDDEN",
    );
    await expect(
      admin.as.mutation(api.admin.streaks.restore, {
        profileId: u.profileId,
        fromDate: days(40),
        toDate: days(38),
        reason: REASON,
        overrideLookback: true,
      }),
    ).resolves.toBeTruthy();
    await rejects(
      support.as.mutation(api.admin.streaks.restore, {
        profileId: u.profileId,
        fromDate: days(2),
        toDate: days(0),
        reason: REASON,
      }),
      "past days",
    );
    // failed attempts leave no audit rows
    expect(await t.run(async (ctx) => (await ctx.db.query("auditLog").collect()).length)).toBe(1);
  });

  it("revoke removes only the restored rows", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const u = await makeLearner(t);
    await addActivity(t, u.profileId, [days(5)]);
    const { adjustmentId } = await support.as.mutation(api.admin.streaks.restore, {
      profileId: u.profileId,
      fromDate: days(5),
      toDate: days(3),
      reason: REASON,
    });
    const res = await support.as.mutation(api.admin.streaks.revoke, { adjustmentId, reason: REASON });
    expect(res.removed).toBe(2);
    const rows = await t.run(async (ctx) => ctx.db.query("activityLog").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBeUndefined();
  });

  it("computes streaks like the client", () => {
    const today = days(0);
    expect(computeStreak([days(1), days(2), days(3)], today).current).toBe(3);
    expect(computeStreak([days(0), days(2)], today).current).toBe(1);
    expect(computeStreak([days(5), days(4), days(1)], today)).toMatchObject({ longest: 2, totalDays: 3 });
  });
});

describe("profiles", () => {
  it("edits allowed fields with before/after, and cannot touch identity or credentials", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const u = await makeLearner(t, { school: "Old Primary", county: "Kiambu" });
    await support.as.mutation(api.admin.users.updateProfile, {
      profileId: u.profileId,
      school: "New Primary",
      phone: "0712 345 678",
      reason: REASON,
    });
    const row = await t.run(async (ctx) => ctx.db.get(u.profileId));
    expect(row).toMatchObject({ school: "New Primary", phoneNormalized: "+254712345678" });
    expect(row?.searchText).toContain("new primary");
    const [entry] = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(entry.before).toMatchObject({ school: "Old Primary", phone: null });
    expect(entry.after).toMatchObject({ school: "New Primary", phone: "+254712345678" });

    // locked fields are not in the function's argument schema at all
    await expect(
      support.as.mutation(api.admin.users.updateProfile, {
        profileId: u.profileId,
        email: "x@y.z",
        reason: REASON,
      } as never),
    ).rejects.toThrow();
    await expect(
      support.as.mutation(api.admin.users.updateProfile, {
        profileId: u.profileId,
        tokenIdentifier: "evil",
        reason: REASON,
      } as never),
    ).rejects.toThrow();
    await rejects(
      support.as.mutation(api.admin.users.updateProfile, {
        profileId: u.profileId,
        school: "New Primary",
        reason: REASON,
      }),
      "NO_CHANGES",
    );
  });

  it("suspends: blocks learner functions server-side, kills sessions, and can be reversed", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const u = await makeLearner(t);
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("authSessions", { userId: u.userId, expirationTime: Date.now() + 1e9 });
      await ctx.db.insert("authRefreshTokens", { sessionId, expirationTime: Date.now() + 1e9 });
    });
    await expect(u.as.query(api.learningProgress.mine, {})).resolves.toEqual([]);
    await support.as.mutation(api.admin.users.setStatus, {
      profileId: u.profileId,
      status: "suspended",
      reason: REASON,
    });
    await rejects(u.as.query(api.learningProgress.mine, {}), "ACCOUNT_SUSPENDED");
    await rejects(u.as.mutation(api.activity.record, { date: days(0), type: "lesson" }), "ACCOUNT_SUSPENDED");
    expect(await t.run(async (ctx) => (await ctx.db.query("authSessions").collect()).length)).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.query("authRefreshTokens").collect()).length)).toBe(0);
    await support.as.mutation(api.admin.users.setStatus, { profileId: u.profileId, status: "active", reason: REASON });
    await expect(u.as.query(api.learningProgress.mine, {})).resolves.toEqual([]);
  });

  it("searches by email, phone and name via indexes", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const a = await makeLearner(t, {
      name: "Wanjiku Kamau",
      phoneNormalized: "+254700111222",
      searchText: "wanjiku kamau +254700111222",
    });
    await makeLearner(t, { name: "Otieno Odhiambo" });
    const opts = { numItems: 10, cursor: null };
    const byEmail = await support.as.query(api.admin.users.search, {
      query: a.email.toUpperCase(),
      paginationOpts: opts,
    });
    expect(byEmail.page.map((p) => p._id)).toEqual([a.profileId]);
    const byPhone = await support.as.query(api.admin.users.search, { query: "0700 111 222", paginationOpts: opts });
    expect(byPhone.page.map((p) => p._id)).toEqual([a.profileId]);
    const byName = await support.as.query(api.admin.users.search, { query: "wanjiku", paginationOpts: opts });
    expect(byName.page.map((p) => p._id)).toEqual([a.profileId]);
    await rejects(
      support.as.query(api.admin.users.search, { county: "Kiambu", paginationOpts: opts }),
      "INVALID_ARGUMENT",
    );
  });
});

describe("staff management and audit log", () => {
  it("protects the last Super Admin and logs every change", async () => {
    const t = newTest();
    const root = await makeStaff(t, "super_admin");
    const other = await makeStaff(t, "support_agent");
    await rejects(
      root.as.mutation(api.admin.staff.setRole, { staffId: root.staffId, role: "viewer", reason: REASON }),
      "own role",
    );
    await root.as.mutation(api.admin.staff.setRole, { staffId: other.staffId, role: "super_admin", reason: REASON });
    await other.as.mutation(api.admin.staff.setStatus, { staffId: root.staffId, status: "disabled", reason: REASON });
    await rejects(
      other.as.mutation(api.admin.staff.setStatus, { staffId: root.staffId, status: "disabled", reason: REASON }),
      "NO_CHANGES|LAST|disable",
    );
    // disabled staff are locked out immediately
    await rejects(root.as.query(api.admin.staff.list, {}), "FORBIDDEN");
    const actions = (await t.run(async (ctx) => ctx.db.query("auditLog").collect())).map((r) => r.action);
    expect(actions).toEqual(["staff.set_role", "staff.set_status"]);
  });

  it("builds a verifiable hash chain and detects tampering; scopes reads by role", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const viewer = await makeStaff(t, "viewer");
    const admin = await makeStaff(t, "super_admin");
    const u = await makeLearner(t);
    await support.as.mutation(api.admin.users.updateProfile, {
      profileId: u.profileId,
      school: "A School",
      reason: REASON,
    });
    await admin.as.mutation(api.admin.users.updateProfile, {
      profileId: u.profileId,
      school: "B School",
      reason: REASON,
    });
    await support.as.mutation(api.admin.users.updateProfile, {
      profileId: u.profileId,
      school: "C School",
      reason: REASON,
    });

    const opts = { numItems: 50, cursor: null };
    expect((await viewer.as.query(api.admin.audit.list, { paginationOpts: opts })).page).toHaveLength(3);
    const own = await support.as.query(api.admin.audit.list, { paginationOpts: opts });
    expect(own.page).toHaveLength(2);
    expect(own.page.every((r) => r.actorEmail === support.email)).toBe(true);
    const forTarget = await support.as.query(api.admin.audit.list, {
      paginationOpts: opts,
      targetType: "profile",
      targetId: u.profileId,
    });
    expect(forTarget.page).toHaveLength(2);
    await rejects(support.as.query(api.admin.audit.verifyChain, { paginationOpts: opts }), "FORBIDDEN");

    expect(await viewer.as.query(api.admin.audit.verifyChain, { paginationOpts: opts })).toMatchObject({
      ok: true,
      checked: 3,
    });
    const middle = (
      await t.run(async (ctx) => ctx.db.query("auditLog").withIndex("by_created_at").order("asc").collect())
    )[1];
    await t.run(async (ctx) => ctx.db.patch(middle._id, { reason: "edited after the fact" }));
    expect(await viewer.as.query(api.admin.audit.verifyChain, { paginationOpts: opts })).toMatchObject({
      ok: false,
      brokenAtId: middle._id,
    });
  });

  it("an admin mutation that logs nothing is rolled back", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const u = await makeLearner(t);
    // NO_CHANGES path throws before logging; profile must be untouched
    await rejects(
      support.as.mutation(api.admin.users.updateProfile, { profileId: u.profileId, reason: REASON }),
      "NO_CHANGES",
    );
    expect(await t.run(async (ctx) => (await ctx.db.query("auditLog").collect()).length)).toBe(0);
  });
});

describe("certificate integrity (learner side)", () => {
  it("ignores client-claimed certificates and recomputes assessment scores", async () => {
    const t = newTest();
    const u = await makeLearner(t);
    await u.as.mutation(api.learningProgress.save, {
      programId: "cbc-foundations",
      progress: {
        completedLessons: ["m1/l1"],
        reflections: {},
        certificateSerial: "MW-AAAAA-BBBBB",
        certificateEarnedAt: "1/1/2026",
        postAssessment: { score: 99, total: 99, date: "x", answers: [0, 0] },
      },
    });
    const [row] = await u.as.query(api.learningProgress.mine, {});
    expect(row.certificateSerial).toBeUndefined();
    expect(row.postAssessment).toBeUndefined(); // wrong answer count is dropped, not trusted
    await rejects(
      u.as.mutation(api.certificates.upsertMine, {
        serial: "MW-AAAAA-BBBBB",
        programId: "cbc-foundations",
        teacherName: "T",
        programTitle: "Forged",
      }),
      "NOT_ELIGIBLE",
    );
    await rejects(
      u.as.mutation(api.learningProgress.save, { programId: "does-not-exist", progress: {} }),
      "Unknown program",
    );
  });
});

describe("certificates (staff)", () => {
  it("only Super Admins manage certificates; reissue replaces and revokes with audit", async () => {
    const t = newTest();
    const support = await makeStaff(t, "support_agent");
    const admin = await makeStaff(t, "super_admin");
    const u = await makeLearner(t);
    const certId = await t.run(async (ctx) => {
      await ctx.db.insert("learningProgress", {
        userId: u.profileId,
        programId: "cbc-foundations",
        completedLessons: [],
        reflections: {},
        cohortJoined: false,
        updatedAt: 1,
        certificateSerial: "MW-AAAAA-BBBBB",
      });
      return ctx.db.insert("certificates", {
        serial: "MW-AAAAA-BBBBB",
        userId: u.profileId,
        programId: "cbc-foundations",
        programTitle: "CBC Foundations",
        teacherName: "Wanjiku Kmau",
        earnedAt: 1,
      });
    });
    await rejects(
      support.as.mutation(api.admin.certificates.reissue, { certificateId: certId, reason: REASON }),
      "FORBIDDEN",
    );
    const { serial } = await admin.as.mutation(api.admin.certificates.reissue, {
      certificateId: certId,
      teacherName: "Wanjiku Kamau",
      reason: "Name misspelt on original",
    });
    expect(serial).toMatch(/^MW-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    expect(await t.query(api.certificates.verify, { serial: "MW-AAAAA-BBBBB" })).toMatchObject({ valid: false });
    expect(await t.query(api.certificates.verify, { serial })).toMatchObject({
      valid: true,
      teacherName: "Wanjiku Kamau",
    });
    const [progress] = await u.as.query(api.learningProgress.mine, {});
    expect(progress.certificateSerial).toBe(serial);
    await admin.as.mutation(api.admin.certificates.revoke, {
      certificateId: await t.run(
        async (ctx) => (await ctx.db.query("certificates").collect()).find((c) => c.serial === serial)!._id,
      ),
      reason: REASON,
    });
    expect(await t.query(api.certificates.verify, { serial })).toMatchObject({ valid: false });
    const actions = (await t.run(async (ctx) => ctx.db.query("auditLog").collect())).map((a) => a.action);
    expect(actions).toEqual(["certificate.reissue", "certificate.revoke"]);
  });
});
