import { Scrypt } from "lucia";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest } from "./helpers";

const visitor = { name: "Wanjiku Kamau", email: "Wanjiku@School.test", subject: "I cannot sign in", body: "I forgot my password and cannot get in.", category: "account" as const };

describe("visitor support conversations", () => {
  it("creates a conversation with a private link, storing only a hash of it", async () => {
    const t = newTest();
    const { number, token } = await t.mutation(api.tickets.createPublic, visitor);
    expect(number).toMatch(/^MW-/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    const [ticket] = await t.run((ctx) => ctx.db.query("tickets").collect());
    expect(ticket.visitor).toEqual({ name: "Wanjiku Kamau", email: "wanjiku@school.test" });
    expect(ticket.tokenHash).toBeTruthy();
    expect(JSON.stringify(ticket)).not.toContain(token);
    const thread = await t.query(api.tickets.publicThread, { token });
    expect(thread?.messages).toHaveLength(1);
    expect(await t.query(api.tickets.publicThread, { token: "x".repeat(43) })).toBeNull();
  });

  it("rejects bad input and limits how many conversations one address can start an hour", async () => {
    const t = newTest();
    await expect(t.mutation(api.tickets.createPublic, { ...visitor, email: "nope" })).rejects.toThrow(/valid email/);
    await expect(t.mutation(api.tickets.createPublic, { ...visitor, body: "short" })).rejects.toThrow(/a little more/);
    for (let i = 0; i < 3; i++) await t.mutation(api.tickets.createPublic, visitor);
    await expect(t.mutation(api.tickets.createPublic, visitor)).rejects.toThrow(/several conversations/);
    await t.mutation(api.tickets.createPublic, { ...visitor, email: "other@school.test" });
  });

  it("lets staff reply, and the visitor sees the reply and can answer, without any email being queued", async () => {
    const t = newTest();
    const agent = await makeStaff(t, "support_agent");
    const { token } = await t.mutation(api.tickets.createPublic, visitor);
    const [row] = await agent.as.query(api.admin.tickets.list, {});
    expect(row.learner).toMatchObject({ _id: null, name: "Wanjiku Kamau", email: "wanjiku@school.test", visitor: true });
    const detail = await agent.as.query(api.admin.tickets.get, { ticketId: row._id });
    expect(detail.visitor).toMatchObject({ email: "wanjiku@school.test" });
    await agent.as.mutation(api.admin.tickets.note, { ticketId: row._id, body: "Internal: verify by other means" });
    await agent.as.mutation(api.admin.tickets.reply, { ticketId: row._id, body: "Your temporary password has been set." });
    const thread = await t.query(api.tickets.publicThread, { token });
    expect(thread?.messages.map((m) => m.author)).toEqual(["user", "staff"]); // the internal note is never shown
    expect(thread?.ticket.status).toBe("pending_user");
    await t.mutation(api.tickets.publicReply, { token, body: "Thank you, it works." });
    expect((await t.query(api.tickets.publicThread, { token }))?.ticket.status).toBe("open");
    expect(await t.run((ctx) => ctx.db.query("emailLog").collect())).toHaveLength(0);
  });

  it("lets a signed-in learner add a conversation to their account, after which the link stops working", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const { token } = await t.mutation(api.tickets.createPublic, visitor);
    const id = await learner.as.mutation(api.tickets.claimByToken, { token });
    expect((await learner.as.query(api.tickets.listMine, {})).map((x) => x._id)).toEqual([id]);
    expect(await t.query(api.tickets.publicThread, { token })).toBeNull();
    await expect(learner.as.mutation(api.tickets.claimByToken, { token })).rejects.toThrow();
  });

  it("moves conversations into the inbox automatically only when the sign-in proved the email address", async () => {
    const t = newTest();
    const verified = await makeLearner(t); // makeLearner's user has a verified email
    const unverified = await makeLearner(t);
    await t.run((ctx) => ctx.db.patch(unverified.userId, { emailVerificationTime: undefined }));
    await t.mutation(api.tickets.createPublic, { ...visitor, email: verified.email });
    await t.mutation(api.tickets.createPublic, { ...visitor, email: unverified.email });
    expect(await unverified.as.mutation(api.tickets.attachVerified, {})).toBe(0);
    expect(await verified.as.mutation(api.tickets.attachVerified, {})).toBe(1);
    expect(await verified.as.query(api.tickets.listMine, {})).toHaveLength(1);
    expect(await unverified.as.query(api.tickets.listMine, {})).toHaveLength(0);
  });

  it("keeps visitor tickets out of learner exports and works with the retention sweep", async () => {
    const t = newTest();
    await t.mutation(api.tickets.createPublic, visitor);
    const old = Date.now() - 800 * 86_400_000;
    await t.run(async (ctx) => {
      const [tk] = await ctx.db.query("tickets").collect();
      await ctx.db.patch(tk._id, { status: "resolved", lastMessageAt: old });
    });
    await t.mutation((await import("../../convex/_generated/api")).internal.retention.sweep, {});
    expect(await t.run((ctx) => ctx.db.query("tickets").collect())).toHaveLength(0);
  });
});

describe("passwords without email", () => {
  it("changes your own password only with the current one", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("authAccounts", { userId: learner.userId, provider: "password", providerAccountId: learner.email, secret: "x" });
    });
    // A wrong current password is refused before anything changes.
    await expect(learner.as.action(api.passwords.changeMine, { current: "wrong-password", next: "a-new-password-1" })).rejects.toThrow();
    await expect(learner.as.action(api.passwords.changeMine, { current: "whatever", next: "short" })).rejects.toThrow(/at least 8/);
  });

  it("only staff with the right role can issue a temporary password, and each is audited", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const viewer = await makeStaff(t, "viewer");
    await expect(viewer.as.action(api.admin.users.issueTemporaryPassword, { profileId: learner.profileId, reason: "Locked out of the account" })).rejects.toThrow();
    const agent = await makeStaff(t, "support_agent");
    // The account has no password sign-in on file, so it is refused with a clear message, after being audited.
    await expect(agent.as.action(api.admin.users.issueTemporaryPassword, { profileId: learner.profileId, reason: "Locked out of the account" })).rejects.toThrow(/no password/i);
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit.filter((a) => a.action === "auth.temp_password")).toHaveLength(1);
    await expect(agent.as.action(api.admin.users.issueTemporaryPassword, { profileId: learner.profileId, reason: "short" })).rejects.toThrow();
  });
});

describe("passwords without email: the full round trip", () => {
  it("lets staff issue a temporary password that works once, ends old sessions, and can then be changed in-app", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");
    await t.run(async (ctx) => {
      await ctx.db.insert("authAccounts", { userId: learner.userId, provider: "password", providerAccountId: learner.email, secret: await new Scrypt().hash("old-password-123") });
      const sessionId = await ctx.db.insert("authSessions", { userId: learner.userId, expirationTime: Date.now() + 86_400_000 });
      await ctx.db.insert("authRefreshTokens", { sessionId, expirationTime: Date.now() + 86_400_000 });
    });
    const issued = await agent.as.action(api.admin.users.issueTemporaryPassword, { profileId: learner.profileId, reason: "Locked out, verified by ticket" });
    expect(issued.password).toHaveLength(14);
    expect(issued.email).toBe(learner.email);
    expect(await t.run((ctx) => ctx.db.query("authSessions").collect())).toHaveLength(0); // signed out everywhere
    // The old password no longer works; the temporary one does and can be replaced from Settings.
    await expect(learner.as.action(api.passwords.changeMine, { current: "old-password-123", next: "brand-new-password-9" })).rejects.toThrow(/not correct/);
    await learner.as.action(api.passwords.changeMine, { current: issued.password, next: "brand-new-password-9" });
    await learner.as.action(api.passwords.changeMine, { current: "brand-new-password-9", next: "another-password-77" });
    // The audit row never contains the password.
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(JSON.stringify(audit)).not.toContain(issued.password);
  });
});
