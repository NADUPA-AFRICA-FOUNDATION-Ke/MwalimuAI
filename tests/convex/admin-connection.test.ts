import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { addActivity, days, makeLearner, makeStaff, newTest } from "./helpers";

const REASON = "Verified outage on the platform, ticket checked";
const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toThrow(new RegExp(code));

describe("what staff do reaches the learner", () => {
  it("restored days appear in the learner's sync state, with a notification, and revoking removes them", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const support = await makeStaff(t, "support_agent");
    await addActivity(t, learner.profileId, [days(1), days(4)]);

    const res = await support.as.mutation(api.admin.streaks.restore, {
      profileId: learner.profileId,
      fromDate: days(3),
      toDate: days(2),
      reason: REASON,
    });
    expect(res.datesRestored).toHaveLength(2);

    const state = await learner.as.query(api.activity.syncState, {});
    expect(state.rows.filter((r) => r.restored).map((r) => r.date).sort()).toEqual([days(3), days(2)].sort());

    const notes = await learner.as.query(api.notifications.listMine, {});
    expect(notes[0].title).toMatch(/streak was restored/i);

    await support.as.mutation(api.admin.streaks.revoke, { adjustmentId: res.adjustmentId, reason: REASON });
    const after = await learner.as.query(api.activity.syncState, {});
    expect(after.rows.some((r) => r.restored)).toBe(false);
    expect(after.revokedDates.sort()).toEqual([days(3), days(2)].sort());
  });

  it("profile edits, suspension and reactivation notify the learner", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const support = await makeStaff(t, "support_agent");
    await support.as.mutation(api.admin.users.updateProfile, { profileId: learner.profileId, school: "New School", reason: REASON });
    await support.as.mutation(api.admin.users.setStatus, { profileId: learner.profileId, status: "suspended", reason: REASON });
    await support.as.mutation(api.admin.users.setStatus, { profileId: learner.profileId, status: "active", reason: REASON });
    const notes = await learner.as.query(api.notifications.listMine, {});
    const titles = notes.map((n) => n.title);
    expect(titles).toContain("Support updated your profile");
    expect(titles).toContain("Your account was reactivated");
  });
});

describe("support tickets", () => {
  it("a learner raises a ticket, staff reply, the learner sees it and internal notes stay hidden", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const other = await makeLearner(t);
    const support = await makeStaff(t, "support_agent");

    const { ticketId, number } = await learner.as.mutation(api.tickets.create, {
      subject: "Lost my streak",
      category: "streak",
      body: "I was learning 10 and 11 Sep but the streak broke.",
    });
    expect(number).toMatch(/^MW-[A-Z2-9]{6}$/);

    const queue = await support.as.query(api.admin.tickets.list, { status: "open" });
    expect(queue.map((x) => x._id)).toContain(ticketId);
    expect((await support.as.query(api.admin.tickets.counts, {})).open).toBe(1);

    await support.as.mutation(api.admin.tickets.note, { ticketId, body: "Checked logs, outage confirmed." });
    await support.as.mutation(api.admin.tickets.reply, { ticketId, body: "We are looking into it." });

    const mine = await learner.as.query(api.tickets.getMine, { ticketId });
    expect(mine.ticket.status).toBe("pending_user");
    expect(mine.messages.map((m) => m.body)).toEqual(["I was learning 10 and 11 Sep but the streak broke.", "We are looking into it."]);
    const notes = await learner.as.query(api.notifications.listMine, {});
    expect(notes[0].title).toContain(number);

    // Another learner cannot read it; the learner's reply reopens.
    await rejects(other.as.query(api.tickets.getMine, { ticketId }), "NOT_FOUND");
    await learner.as.mutation(api.tickets.reply, { ticketId, body: "Thanks, any update?" });
    expect((await learner.as.query(api.tickets.getMine, { ticketId })).ticket.status).toBe("open");

    // Staff see internal notes.
    const staffView = await support.as.query(api.admin.tickets.get, { ticketId });
    expect(staffView.messages.some((m) => m.internal)).toBe(true);
  });

  it("quoting a ticket number on a streak restore posts the outcome on the ticket", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const support = await makeStaff(t, "support_agent");
    await addActivity(t, learner.profileId, [days(1), days(5)]);
    const { ticketId, number } = await learner.as.mutation(api.tickets.create, {
      subject: "Streak", category: "streak", body: "Please restore my days.",
    });
    await support.as.mutation(api.admin.streaks.restore, {
      profileId: learner.profileId, fromDate: days(4), toDate: days(2), reason: REASON, ticketRef: number,
    });
    const mine = await learner.as.query(api.tickets.getMine, { ticketId });
    expect(mine.messages.at(-1)?.body).toMatch(/restored your streak/i);
    expect(mine.ticket.status).toBe("pending_user");
  });

  it("limits open tickets and enforces roles", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const viewer = await makeStaff(t, "viewer");
    const content = await makeStaff(t, "content_manager");
    for (let i = 0; i < 5; i++)
      await learner.as.mutation(api.tickets.create, { subject: `Q${i}`, category: "other", body: "Help please" });
    await rejects(learner.as.mutation(api.tickets.create, { subject: "One more", category: "other", body: "Help" }), "TOO_MANY_TICKETS");
    const [first] = await viewer.as.query(api.admin.tickets.list, {});
    await rejects(viewer.as.mutation(api.admin.tickets.reply, { ticketId: first._id, body: "hi there" }), "FORBIDDEN");
    await rejects(content.as.query(api.admin.tickets.list, {}), "FORBIDDEN");
  });
});

describe("admin sees what the learner did", () => {
  it("returns activity, tools and tickets without private content", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const viewer = await makeStaff(t, "viewer");
    await addActivity(t, learner.profileId, [days(1), days(2)]);
    await learner.as.mutation(api.activity.recordToolUsed, { toolId: "lesson-plan" });
    const a = await viewer.as.query(api.admin.activity.overview, { profileId: learner.profileId });
    expect(a.activeDays30).toBe(2);
    expect(a.tools[0]).toMatchObject({ toolId: "lesson-plan", useCount: 1 });
    expect(JSON.stringify(a)).not.toMatch(/content|mood/);
  });
});
