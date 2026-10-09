import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";
import { STATIC_PROGRAMS } from "../../convex/lib/staticCurriculum";
import { eatDateKey } from "../../convex/lib/streakMath";

// Regression tests for the security audit of 9 Oct 2026 (~/security-audit-skill/MwalimuAI/run-1).
const REASON = "Following up the support ticket";

describe("staff accounts are out of reach of learner-account tools", () => {
  it("refuses a temporary password or suspension for a staff member's account", async () => {
    const t = newTest();
    const admin = await makeStaff(t, "super_admin");
    const agent = await makeStaff(t, "support_agent");
    const { profileId: adminProfile } = await makeLearner(t, { authSubject: admin.userId, tokenIdentifier: `test|${admin.userId}`, email: admin.email });

    await expect(agent.as.action(api.admin.users.issueTemporaryPassword, { profileId: adminProfile, reason: REASON })).rejects.toThrow(/staff account/);
    await expect(agent.as.mutation(api.admin.users.setStatus, { profileId: adminProfile, status: "suspended", reason: REASON })).rejects.toThrow(/staff account/);

    // Ordinary learners are unaffected.
    const learner = await makeLearner(t);
    await agent.as.mutation(api.admin.users.setStatus, { profileId: learner.profileId, status: "suspended", reason: REASON });
    expect((await t.run((ctx) => ctx.db.get(learner.profileId)))?.status).toBe("suspended");
  });
});

describe("migrated profiles are only matched by a verified email", () => {
  async function setup(verified: boolean) {
    const t = newTest();
    const victim = await t.mutation(internal.profiles.provisionMigrated, { legacyUserId: "L1", email: "victim@example.test" });
    // The users row a password sign-up creates: email stored, but not verified (Convex Auth tokens carry no email claim).
    const userId = await t.run((ctx) => ctx.db.insert("users", { email: "victim@example.test", ...(verified ? { emailVerificationTime: Date.now() } : {}) }));
    const as = t.withIdentity({ subject: `${userId}|s1`, tokenIdentifier: `test|${userId}` });
    return { t, victim, userId, as };
  }

  it("does not hand a migrated learner's profile to an unverified sign-up with the same email", async () => {
    const { t, victim, as } = await setup(false);
    expect(await as.query(api.profiles.me, {})).toBeNull();
    expect(await as.mutation(api.profiles.linkMigratedIdentity, {})).toBeNull();
    expect((await t.run((ctx) => ctx.db.get(victim)))?.tokenIdentifier).toBe("migrated|L1");
  });

  it("still links the profile once the email is verified (reset-password email or Google)", async () => {
    const { t, victim, userId, as } = await setup(true);
    expect((await as.query(api.profiles.me, {}))?._id).toBe(victim);
    await as.mutation(api.profiles.linkMigratedIdentity, {});
    expect((await t.run((ctx) => ctx.db.get(victim)))?.authSubject).toBe(userId);
  });
});

describe("a replaced session cannot take the account back", () => {
  it("refuses claim from a session whose sign-in was deleted, and from suspended accounts", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const ids = await t.run(async (ctx) => ({
      a: await ctx.db.insert("authSessions", { userId: learner.userId, expirationTime: Date.now() + 86_400_000 }),
      b: await ctx.db.insert("authSessions", { userId: learner.userId, expirationTime: Date.now() + 86_400_000 }),
    }));
    const as = (s: string) => t.withIdentity({ subject: `${learner.userId}|${s}`, tokenIdentifier: `test|${learner.userId}`, email: learner.email });
    const [phone, laptop] = [as(ids.a), as(ids.b)];
    await phone.mutation(api.sessions.claim, { tabId: "p1", confirm: false });
    await laptop.mutation(api.sessions.claim, { tabId: "l1", confirm: true }); // phone's sign-in is deleted here

    await expect(phone.mutation(api.sessions.claim, { tabId: "p1", confirm: true })).rejects.toThrow(/another device or browser/);
    const after = await t.run(async (ctx) => ({ laptop: await ctx.db.get(ids.b), holder: (await ctx.db.get(learner.profileId))?.activeAuthSession }));
    expect(after.laptop).not.toBeNull();
    expect(after.holder).toBe(ids.b);

    await t.run((ctx) => ctx.db.patch(learner.profileId, { status: "suspended" }));
    await expect(laptop.mutation(api.sessions.claim, { tabId: "l1", confirm: false })).rejects.toThrow(/suspended/);
  });
});

describe("post-assessment attempts cannot dodge the daily limit", () => {
  it("counts a submission against the real program even when it reuses an attempt opened for something else", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const program = STATIC_PROGRAMS.find((p) => p.id === "cbc-foundations")!;
    const wrong = program.postAssessment.map((q) => (q.correct + 1) % 4);
    // Attempts opened under the real program but as a pre-assessment (an unknown program id is now refused outright).
    await expect(learner.as.mutation(api.assessmentIntegrity.startAttempt, { programId: "dummy-1", kind: "post", assistive: false })).rejects.toThrow(/Unknown program/);
    const decoys = [];
    for (let i = 0; i < 4; i++) decoys.push(await learner.as.mutation(api.assessmentIntegrity.startAttempt, { programId: program.id, kind: "pre", assistive: false }));
    for (let i = 0; i < 3; i++) await learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: wrong, attemptId: decoys[i] });
    await expect(learner.as.mutation(api.learningProgress.submitAssessment, { programId: program.id, kind: "post", answers: wrong, attemptId: decoys[3] })).rejects.toThrow(/several times today/);
  });
});

describe("learner identity in staff analytics follows users.read", () => {
  it("shows the heaviest AI users by name to support staff but anonymised to content managers", async () => {
    const t = newTest();
    const learner = await makeLearner(t, { name: "Wanjiru Kamau" });
    await t.run((ctx) => ctx.db.insert("aiUsage", { profileId: learner.profileId, day: eatDateKey(Date.now()), count: 7 } as never));
    const support = await makeStaff(t, "support_agent");
    const content = await makeStaff(t, "content_manager");
    expect((await support.as.query(api.admin.aiUsage.overview, {})).heaviestToday[0]).toMatchObject({ name: "Wanjiru Kamau", profileId: learner.profileId, count: 7 });
    expect((await content.as.query(api.admin.aiUsage.overview, {})).heaviestToday[0]).toEqual({ name: "Learner 1", profileId: null, count: 7 });
  });
});

describe("Stripe lifecycle reaches the app", () => {
  it("revokes paid access when Stripe cancels a subscription that carries no learner metadata", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const t = newTest();
    const learner = await makeLearner(t);
    await t.mutation(api.subscriptions.fulfillFromStripe, { webhookSecret: "whsec_test", legacyUserId: learner.profileId, plan: "professional", status: "active", stripeSubscriptionId: "sub_test" });
    expect((await learner.as.query(api.subscriptions.mine, {})).entitlement.isPaid).toBe(true);
    // customer.subscription.deleted for a subscription created before checkout stamped the learner on it.
    await t.mutation(api.subscriptions.fulfillFromStripe, { webhookSecret: "whsec_test", plan: "professional", status: "canceled", stripeSubscriptionId: "sub_test" });
    expect((await learner.as.query(api.subscriptions.mine, {})).entitlement).toMatchObject({ isPaid: false, status: "canceled" });
    // An unpaid checkout never grants access, and an unknown subscription is refused rather than guessed.
    await t.mutation(api.subscriptions.fulfillFromStripe, { webhookSecret: "whsec_test", legacyUserId: learner.profileId, plan: "professional", status: "incomplete", stripeSubscriptionId: "sub_test" });
    expect((await learner.as.query(api.subscriptions.mine, {})).entitlement.isPaid).toBe(false);
    await expect(t.mutation(api.subscriptions.fulfillFromStripe, { webhookSecret: "whsec_test", plan: "professional", status: "canceled", stripeSubscriptionId: "sub_unknown" })).rejects.toThrow(/Profile not found/);
  });
});

describe("visitor tickets only come through the website's contact route", () => {
  const visitor = { name: "Visitor Person", email: "v@example.test", subject: "Cannot sign in", body: "I am locked out of my account.", category: "account" as const };
  it("refuses direct calls without the server key once it is configured", async () => {
    const t = newTest();
    process.env.CONTACT_FORM_KEY = "test-contact-key";
    try {
      await expect(t.mutation(api.tickets.createPublic, visitor)).rejects.toThrow(/contact form/);
      await expect(t.mutation(api.tickets.createPublic, { ...visitor, formKey: "wrong-key-of-same-size" })).rejects.toThrow(/contact form/);
      await expect(t.mutation(api.tickets.createPublic, { ...visitor, formKey: "test-contact-key" })).resolves.toMatchObject({ number: expect.any(String) });
    } finally {
      delete process.env.CONTACT_FORM_KEY;
    }
  });
});
