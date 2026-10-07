import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { makeLearner, makeStaff, newTest, type T } from "./helpers";

// The test harness does not record a file's type the way real uploads do, so it is set here.
const storeFile = (t: T, type: string, bytes = 1000) =>
  t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([new Uint8Array(bytes)], { type }));
    await (ctx.db as any).patch(id, { contentType: type });
    return id;
  });

describe("tickets: statuses, priority, search", () => {
  it("lets staff move a ticket through every status, notifying the learner each time", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "Certificate missing", category: "certificate", body: "I finished but see no certificate." });
    for (const status of ["in_progress", "pending_user", "resolved", "closed"] as const) {
      await agent.as.mutation(api.admin.tickets.setStatus, { ticketId, status, reason: "Working through the ticket" });
    }
    const notes = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notes.map((n) => n.title)).toEqual([
      expect.stringContaining("is being worked on"),
      expect.stringContaining("needs a reply from you"),
      expect.stringContaining("marked resolved"),
      expect.stringContaining("was closed"),
    ]);
    // A closed ticket takes no more replies from anyone until staff reopen it.
    await expect(learner.as.mutation(api.tickets.reply, { ticketId, body: "One more thing" })).rejects.toThrow(/closed/);
    await expect(agent.as.mutation(api.admin.tickets.reply, { ticketId, body: "Following up" })).rejects.toThrow(/closed/);
  });

  it("records the first reply time, ranks overdue and urgent tickets first, and searches", async () => {
    const t = newTest();
    const learner = await makeLearner(t, { name: "Achieng Otieno" });
    const agent = await makeStaff(t, "support_agent");
    const a = await learner.as.mutation(api.tickets.create, { subject: "Lesson video will not load", category: "technical", body: "It spins forever." });
    const b = await learner.as.mutation(api.tickets.create, { subject: "Payment taken twice", category: "payment", body: "Charged twice today." });
    await agent.as.mutation(api.admin.tickets.setPriority, { ticketId: b.ticketId, priority: "urgent" });
    await t.run((ctx) => ctx.db.patch(a.ticketId, { createdAt: Date.now() - 30 * 3_600_000 })); // normal target is 24h: now overdue
    const queue = await agent.as.query(api.admin.tickets.list, { status: "active" });
    expect(queue.map((x) => x.number)).toEqual([a.number, b.number]);
    expect(queue[0].overdue).toBe(true);
    expect((await agent.as.query(api.admin.tickets.counts, {})).overdue).toBe(1);
    await agent.as.mutation(api.admin.tickets.reply, { ticketId: a.ticketId, body: "Looking into it now." });
    expect((await agent.as.query(api.admin.tickets.counts, {})).overdue).toBe(0);
    expect((await agent.as.query(api.admin.tickets.list, { search: "achieng" })).length).toBe(2);
    expect((await agent.as.query(api.admin.tickets.list, { search: "payment" })).map((x) => x.number)).toEqual([b.number]);
    expect((await agent.as.query(api.admin.tickets.list, { priority: "urgent" })).map((x) => x.number)).toEqual([b.number]);
  });

  it("closes resolved tickets after a quiet week and tells the learner", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const agent = await makeStaff(t, "support_agent");
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "Question", category: "other", body: "How do I start?" });
    await agent.as.mutation(api.admin.tickets.reply, { ticketId, body: "Open Learn and pick a path.", resolve: true });
    await t.run((ctx) => ctx.db.patch(ticketId, { lastMessageAt: Date.now() - 8 * 86_400_000 }));
    await t.mutation(internal.retention.sweep, {});
    expect((await learner.as.query(api.tickets.getMine, { ticketId })).ticket.status).toBe("closed");
  });

  it("no longer lets the learner mark their own ticket solved", async () => {
    const mod = await import("../../convex/tickets");
    expect("resolve" in mod).toBe(false);
  });
});

describe("tickets: who wrote it", () => {
  it("shows staff the sign-in email when a password sign-up's profile has none", async () => {
    const t = newTest();
    const learner = await makeLearner(t, { email: undefined });
    const agent = await makeStaff(t, "support_agent");
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "Help", category: "other", body: "Please help me." });
    expect((await agent.as.query(api.admin.tickets.get, { ticketId })).learner?.email).toBe(learner.email);
    expect((await agent.as.query(api.admin.tickets.list, {}))[0].learner.email).toBe(learner.email);
  });
});

describe("tickets: attachments", () => {
  it("accepts photos and PDFs up to 5 MB, three per message, and shows them in the conversation", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const photo = await storeFile(t, "image/jpeg");
    const pdf = await storeFile(t, "application/pdf");
    const { ticketId } = await learner.as.mutation(api.tickets.create, { subject: "Screenshot of the error", category: "technical", body: "See attached.", attachments: [{ storageId: photo, name: "error.jpg" }, { storageId: pdf, name: "receipt.pdf" }] });
    const { messages } = await learner.as.query(api.tickets.getMine, { ticketId });
    expect(messages[0].attachments.map((a) => [a.name, a.type])).toEqual([["error.jpg", "image/jpeg"], ["receipt.pdf", "application/pdf"]]);
    expect(messages[0].attachments[0].url).toBeTruthy();
  });

  it("rejects other file types, oversized files and more than three", async () => {
    const t = newTest();
    const learner = await makeLearner(t);
    const exe = await storeFile(t, "application/x-msdownload");
    await expect(learner.as.mutation(api.tickets.create, { subject: "x", category: "other", body: "y", attachments: [{ storageId: exe, name: "virus.exe" }] })).rejects.toThrow(/JPG, PNG, WebP|PDF/);
    const big = await storeFile(t, "image/png", 6 * 1024 * 1024);
    await expect(learner.as.mutation(api.tickets.create, { subject: "x", category: "other", body: "y", attachments: [{ storageId: big, name: "big.png" }] })).rejects.toThrow(/5 MB/);
    const four = await Promise.all([1, 2, 3, 4].map(() => storeFile(t, "image/png")));
    await expect(learner.as.mutation(api.tickets.create, { subject: "x", category: "other", body: "y", attachments: four.map((s, i) => ({ storageId: s, name: `${i}.png` })) })).rejects.toThrow(/up to 3/);
  });
});

describe("support alerts for staff", () => {
  it("alerts staff on new tickets, replies and reopenings, and tracks what each person has seen", async () => {
    const t = newTest();
    const learner = await makeLearner(t, { name: "Wanjiku" });
    const agent = await makeStaff(t, "support_agent");
    const other = await makeStaff(t, "super_admin");
    const { ticketId, number } = await learner.as.mutation(api.tickets.create, { subject: "Help", category: "other", body: "I need help with my account." });
    await agent.as.mutation(api.admin.tickets.reply, { ticketId, body: "Done.", resolve: true });
    await learner.as.mutation(api.tickets.reply, { ticketId, body: "Still broken." });
    await t.mutation(api.tickets.createPublic, { name: "Visitor Person", email: "v@example.test", subject: "Cannot sign in", body: "I am locked out of my account.", category: "account" });
    const mine = await agent.as.query(api.admin.notices.mine, {});
    expect(mine.unread).toBe(3);
    expect(mine.items.map((i) => i.title)).toEqual([
      expect.stringContaining("New ticket"),
      `Wanjiku reopened ${number}`,
      `New ticket ${number} from Wanjiku`,
    ]);
    await agent.as.mutation(api.admin.notices.markAllRead, {});
    expect((await agent.as.query(api.admin.notices.mine, {})).unread).toBe(0);
    expect((await other.as.query(api.admin.notices.mine, {})).unread).toBe(3); // each person has their own "seen"
    const viewer = await makeStaff(t, "content_manager");
    await expect(viewer.as.query(api.admin.notices.mine, {})).rejects.toThrow();
  });

  it("puts visitor locked-out requests at high priority", async () => {
    const t = newTest();
    await t.mutation(api.tickets.createPublic, { name: "Visitor Person", email: "v@example.test", subject: "Cannot sign in", body: "I am locked out of my account.", category: "account" });
    const [tk] = await t.run((ctx) => ctx.db.query("tickets").collect());
    expect(tk.priority).toBe("high");
  });
});

describe("saved replies", () => {
  it("can be created, edited and deleted by support staff, and are audited", async () => {
    const t = newTest();
    const agent = await makeStaff(t, "support_agent");
    const viewer = await makeStaff(t, "viewer");
    const id = await agent.as.mutation(api.admin.tickets.cannedSave, { title: "Password reset", body: "We have set a temporary password." });
    await agent.as.mutation(api.admin.tickets.cannedSave, { id, title: "Password reset", body: "Your temporary password is below." });
    expect(await viewer.as.query(api.admin.tickets.cannedList, {})).toEqual([{ _id: id, title: "Password reset", body: "Your temporary password is below." }]);
    await expect(viewer.as.mutation(api.admin.tickets.cannedSave, { title: "x y", body: "z z" })).rejects.toThrow();
    await agent.as.mutation(api.admin.tickets.cannedDelete, { id });
    expect(await agent.as.query(api.admin.tickets.cannedList, {})).toEqual([]);
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit.filter((a) => a.action.startsWith("ticket.canned")).length).toBe(3);
  });
});
