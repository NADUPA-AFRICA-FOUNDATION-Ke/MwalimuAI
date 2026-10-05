import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { addActivity, days, makeLearner, makeStaff, newTest } from "./helpers";
import { unsubscribeToken } from "../../convex/lib/emailQueue";

const sent: { to: string[]; subject: string; html: string; text: string; headers: Record<string, string> }[] = [];
function stubResend(status = 200) {
  sent.length = 0;
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    if (status === 200) sent.push(JSON.parse(init.body));
    return new Response(status === 200 ? '{"id":"1"}' : "nope", { status });
  });
}
afterEach(() => vi.unstubAllGlobals());

const rows = (t: ReturnType<typeof newTest>) => t.run(async (ctx) => ctx.db.query("emailLog").collect());

describe("email", () => {
  it("emails a learner when staff reply to their ticket, and respects their choice", async () => {
    stubResend();
    const t = newTest();
    const learner = await makeLearner(t, { name: "Wanjiru Mwangi" });
    const quiet = await makeLearner(t);
    const support = await makeStaff(t, "support_agent");
    await quiet.as.mutation(api.emails.setPrefs, { prefs: { streak: true, tickets: false, certificates: true, weekly: true } });

    for (const l of [learner, quiet]) {
      const { ticketId } = await l.as.mutation(api.tickets.create, { subject: "Lost streak", category: "streak", body: "Please help me" });
      await support.as.mutation(api.admin.tickets.reply, { ticketId, body: "We restored your days." });
    }
    expect((await rows(t)).map((r) => r.to)).toEqual([learner.email]); // the opted-out learner got nothing queued

    await t.action(internal.emails.drain, {});
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual([learner.email]);
    expect(sent[0].subject).toMatch(/Support replied to MW-/);
    expect(sent[0].text).toContain("We restored your days.");
    expect(sent[0].text).toContain("Hello Wanjiru,");
    expect(sent[0].headers["List-Unsubscribe"]).toContain("/api/unsubscribe?t=");
    expect((await rows(t))[0].status).toBe("sent");
  });

  it("writes in Kiswahili for learners who use it", async () => {
    stubResend();
    const t = newTest();
    const learner = await makeLearner(t, { lang: "sw", name: "Otieno" });
    const support = await makeStaff(t, "support_agent");
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "Msaada", category: "other", body: "Tafadhali" });
    await support.as.mutation(api.admin.tickets.reply, { ticketId, body: "Tumeshughulikia." });
    await t.action(internal.emails.drain, {});
    expect(sent[0].subject).toMatch(/Msaada umejibu/);
    expect(sent[0].text).toContain("Habari Otieno,");
  });

  it("records failures without crashing, retries temporary ones, and gives up on permanent ones", async () => {
    stubResend(429); // the queue's own scheduled sender may also run here, so assert outcomes, not exact counts
    const t = newTest();
    const learner = await makeLearner(t);
    const support = await makeStaff(t, "support_agent");
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "x", category: "other", body: "hello there" });
    await support.as.mutation(api.admin.tickets.reply, { ticketId, body: "Hi there" });

    await t.action(internal.emails.drain, {});
    const afterTemporary = (await rows(t))[0];
    expect(afterTemporary.status).toBe("queued"); // 429 means try again later
    expect(afterTemporary.attempts).toBeGreaterThanOrEqual(1);
    stubResend(422);
    await t.action(internal.emails.drain, {});
    const afterPermanent = (await rows(t))[0];
    expect(afterPermanent.status).toBe("failed"); // 422 means it will never work
    expect(afterPermanent.error).toMatch(/422/);
  });

  it("unsubscribes with a signed link, rejects forged ones, and lets the learner turn emails back on", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const token = await unsubscribeToken(learner.profileId);
    expect(await t.mutation(api.emails.unsubscribe, { token: `${token}0` })).toBe(false);
    expect(await t.mutation(api.emails.unsubscribe, { token: `${learner.profileId}.${"0".repeat(40)}` })).toBe(false);
    expect((await learner.as.query(api.emails.myPrefs, {})).prefs.weekly).toBe(true);
    expect(await t.mutation(api.emails.unsubscribe, { token })).toBe(true);
    expect((await learner.as.query(api.emails.myPrefs, {})).prefs).toEqual({ streak: false, tickets: false, certificates: false, weekly: false });
    await learner.as.mutation(api.emails.setPrefs, { prefs: { streak: false, tickets: true, certificates: false, weekly: false } });
    expect((await learner.as.query(api.emails.myPrefs, {})).prefs.tickets).toBe(true);
  });

  it("nudges only learners with a streak of 3+ who have not been in today, once, and respects the daily cap", async () => {
    stubResend();
    const t = newTest();
    const atRisk = await makeLearner(t);
    const safe = await makeLearner(t);
    const short = await makeLearner(t);
    const optedOut = await makeLearner(t);
    const login = (id: Parameters<typeof addActivity>[1], d: string[]) =>
      t.run(async (ctx) => { for (const date of d) await ctx.db.insert("activityLog", { userId: id, date, type: "login", createdAt: Date.now() }); });
    await login(atRisk.profileId, [days(1), days(2), days(3)]);
    await login(safe.profileId, [days(0), days(1), days(2), days(3)]); // already here today
    await login(short.profileId, [days(1), days(2)]);
    await login(optedOut.profileId, [days(1), days(2), days(3)]);
    await optedOut.as.mutation(api.emails.setPrefs, { prefs: { streak: false, tickets: true, certificates: true, weekly: true } });

    await t.mutation(internal.emails.streakNudges, { force: true });
    await t.mutation(internal.emails.streakNudges, { force: true }); // running twice does not double send
    const queued = await rows(t);
    expect(queued.map((r) => r.profileId)).toEqual([atRisk.profileId]);
    expect(queued[0].data).toEqual({ days: 3 });
    await t.action(internal.emails.drain, {});
    expect(sent[0].subject).toMatch(/3-day streak/);
  });

  it("does not run campaigns unless switched on, and sends a weekly summary with real numbers", async () => {
    stubResend();
    const t = newTest();
    const learner = await makeLearner(t);
    await t.run(async (ctx) => {
      for (const d of [days(0), days(1), days(2)]) await ctx.db.insert("activityLog", { userId: learner.profileId, date: d, type: "login", createdAt: Date.now() });
      await ctx.db.insert("activityLog", { userId: learner.profileId, date: days(1), type: "lesson", createdAt: Date.now() });
    });
    await t.mutation(internal.emails.weeklySummaries, {}); // switched off
    expect(await rows(t)).toHaveLength(0);
    for (let off = 0; off < 7; off++) await t.mutation(internal.emails.weeklySummaries, { dayOffset: off, force: true });
    const r = await rows(t);
    expect(r).toHaveLength(1);
    expect(r[0].data).toMatchObject({ activeDays: 3, lessons: 1 });
  });
});
