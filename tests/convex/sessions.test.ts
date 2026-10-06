import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, newTest, type T } from "./helpers";

/** The same learner signed in twice: two real sign-in sessions, as two devices or browsers would have. */
async function twoSessions(t: T) {
  const learner = await makeLearner(t);
  const ids = await t.run(async (ctx) => {
    const a = await ctx.db.insert("authSessions", { userId: learner.userId, expirationTime: Date.now() + 86_400_000 });
    const b = await ctx.db.insert("authSessions", { userId: learner.userId, expirationTime: Date.now() + 86_400_000 });
    await ctx.db.insert("authRefreshTokens", { sessionId: a, expirationTime: Date.now() + 86_400_000 });
    return { a, b };
  });
  const as = (s: string) => t.withIdentity({ subject: `${learner.userId}|${s}`, tokenIdentifier: `test|${learner.userId}`, email: learner.email });
  return { learner, phone: as(ids.a), laptop: as(ids.b), ids };
}

describe("one account, one session, one tab", () => {
  it("lets the first sign-in hold the account and asks the second to confirm", async () => {
    const t = newTest();
    const { phone, laptop } = await twoSessions(t);
    expect(await phone.mutation(api.sessions.claim, { tabId: "p1", confirm: false })).toEqual({ status: "ok" });
    expect(await laptop.mutation(api.sessions.claim, { tabId: "l1", confirm: false })).toEqual({ status: "confirm" });
    // Not confirmed yet: the phone still holds it, and the laptop is refused by the server.
    await expect(laptop.query(api.learningProgress.mine, {})).rejects.toThrow(/another device or browser/);
    expect(await phone.query(api.learningProgress.mine, {})).toEqual([]);
  });

  it("on confirm, cuts the old session off at the server and deletes its sign-in", async () => {
    const t = newTest();
    const { phone, laptop, ids } = await twoSessions(t);
    await phone.mutation(api.sessions.claim, { tabId: "p1", confirm: false });
    await laptop.mutation(api.sessions.claim, { tabId: "l1", confirm: true, agent: "Chrome on Mac" });
    await expect(phone.query(api.learningProgress.mine, {})).rejects.toThrow(/another device or browser/);
    await expect(phone.mutation(api.learningProgress.submitAssessment, { programId: "cbc-foundations", kind: "pre", answers: [0, 0, 0, 0, 0, 0] })).rejects.toThrow(/another device/);
    expect((await phone.query(api.profiles.me, {}))?.session.isActive).toBe(false);
    const left = await t.run(async (ctx) => ({ sessions: await ctx.db.query("authSessions").collect(), tokens: await ctx.db.query("authRefreshTokens").collect() }));
    expect(left.sessions.map((s) => s._id)).toEqual([ids.b]);
    expect(left.tokens).toHaveLength(0);
    const info = await laptop.query(api.sessions.mine, {});
    expect(info).toMatchObject({ agent: "Chrome on Mac", switchesLast30Days: 2 });
  });

  it("moves the account between tabs of the same browser without asking", async () => {
    const t = newTest();
    const { phone } = await twoSessions(t);
    await phone.mutation(api.sessions.claim, { tabId: "tab-1", confirm: false });
    expect((await phone.query(api.profiles.me, {}))?.session).toMatchObject({ isActive: true, activeTabId: "tab-1" });
    expect(await phone.mutation(api.sessions.claim, { tabId: "tab-2", confirm: false })).toEqual({ status: "ok" });
    expect((await phone.query(api.profiles.me, {}))?.session.activeTabId).toBe("tab-2");
  });

  it("frees the account on sign-out, so the next sign-in does not need to confirm", async () => {
    const t = newTest();
    const { phone, laptop } = await twoSessions(t);
    await phone.mutation(api.sessions.claim, { tabId: "p1", confirm: false });
    await phone.mutation(api.sessions.release, {});
    expect(await laptop.mutation(api.sessions.claim, { tabId: "l1", confirm: false })).toEqual({ status: "ok" });
  });

  it("does not ask to confirm when the other session has already expired", async () => {
    const t = newTest();
    const { phone, laptop, ids } = await twoSessions(t);
    await phone.mutation(api.sessions.claim, { tabId: "p1", confirm: false });
    await t.run((ctx) => ctx.db.patch(ids.a, { expirationTime: Date.now() - 1 }));
    expect(await laptop.mutation(api.sessions.claim, { tabId: "l1", confirm: false })).toEqual({ status: "ok" });
  });
});
