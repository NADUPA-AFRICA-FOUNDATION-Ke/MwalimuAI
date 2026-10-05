import { v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { notify } from "../lib/notices";
import { queueEmail } from "../lib/emailQueue";
import { fail, notFound } from "../lib/errors";
import type { Doc } from "../_generated/dataModel";

const status = v.union(v.literal("open"), v.literal("pending_user"), v.literal("resolved"));

const staffName = (s: Doc<"staff">) => s.name?.trim() || s.email.split("@")[0];

/** Queue, newest activity first. Optionally filtered by status; capped, never a table scan. */
export const list = staffQuery({
  permission: "tickets.read",
  args: { status: v.optional(status) },
  handler: async (ctx, { status: filter }) => {
    const rows = filter
      ? await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", filter)).order("desc").take(100)
      : await ctx.db.query("tickets").order("desc").take(100);
    const out = [];
    for (const t of rows) {
      const p = await ctx.db.get(t.profileId);
      out.push({
        _id: t._id,
        number: t.number,
        subject: t.subject,
        category: t.category,
        status: t.status,
        lastMessageAt: t.lastMessageAt,
        lastMessageBy: t.lastMessageBy,
        createdAt: t.createdAt,
        assignedTo: t.assignedTo ?? null,
        learner: { _id: t.profileId, name: p?.name ?? "", email: p?.email ?? "" },
      });
    }
    return out.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const counts = staffQuery({
  permission: "tickets.read",
  args: {},
  handler: async (ctx) => {
    const open = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "open")).take(200);
    const waiting = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "pending_user")).take(200);
    return { open: open.length, pendingUser: waiting.length };
  },
});

export const forUser = staffQuery({
  permission: "tickets.read",
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const rows = await ctx.db.query("tickets").withIndex("by_profile", (q) => q.eq("profileId", profileId)).order("desc").take(20);
    return rows.map((t) => ({ _id: t._id, number: t.number, subject: t.subject, status: t.status, lastMessageAt: t.lastMessageAt }));
  },
});

export const get = staffQuery({
  permission: "tickets.read",
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const t = await ctx.db.get(ticketId);
    if (!t) throw notFound("Ticket");
    const learner = await ctx.db.get(t.profileId);
    const messages = await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(200);
    const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
    return {
      ticket: {
        _id: t._id,
        number: t.number,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
        lastMessageAt: t.lastMessageAt,
        resolvedAt: t.resolvedAt ?? null,
        assignedToName: assignee ? staffName(assignee) : null,
      },
      learner: learner
        ? { _id: learner._id, name: learner.name, email: learner.email ?? "", status: learner.status ?? "active" }
        : null,
      messages: messages.map((m) => ({
        _id: m._id,
        author: m.author,
        authorLabel: m.authorLabel,
        body: m.body,
        internal: m.internal,
        createdAt: m.createdAt,
      })),
    };
  },
});

/** Reply to the learner. They see it in the ticket thread and in their bell. */
export const reply = staffMutation({
  permission: "tickets.reply",
  args: { ticketId: v.id("tickets"), body: v.string(), resolve: v.optional(v.boolean()) },
  handler: async (ctx, args, { staff }, log) => {
    const t = await ctx.db.get(args.ticketId);
    if (!t) throw notFound("Ticket");
    const body = args.body.trim();
    if (body.length < 2 || body.length > 4000) throw fail("INVALID_ARGUMENT", "Reply must be between 2 and 4000 characters");
    const now = Date.now();
    const resolved = args.resolve === true;
    await ctx.db.insert("ticketMessages", {
      ticketId: t._id,
      author: "staff",
      staffId: staff._id,
      authorLabel: `${staffName(staff)} (Mwalimu AI Support)`,
      body,
      internal: false,
      createdAt: now,
    });
    await ctx.db.patch(t._id, {
      status: resolved ? "resolved" : "pending_user",
      lastMessageAt: now,
      lastMessageBy: "staff",
      assignedTo: t.assignedTo ?? staff._id,
      ...(resolved ? { resolvedAt: now } : {}),
    });
    await notify(ctx, t.profileId, {
      title: resolved ? `Ticket ${t.number} resolved` : `Support replied to ${t.number}`,
      body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      link: `/dashboard/support/${t._id}`,
    });
    // The in-app notice only helps people who open the app; email reaches the ones who do not.
    await queueEmail(ctx, { profileId: t.profileId, kind: "ticket_reply", dedupeKey: `ticket:${t._id}:${now}`, data: { number: t.number, subject: t.subject, excerpt: body.length > 280 ? `${body.slice(0, 280)}…` : body, ticketId: t._id, resolved } });
    await log({
      action: resolved ? "ticket.reply_resolve" : "ticket.reply",
      targetType: "ticket",
      targetId: t._id,
      targetLabel: t.number,
      before: { status: t.status },
      after: { status: resolved ? "resolved" : "pending_user" },
    });
    return null;
  },
});

/** Staff-only note. Never shown to the learner. */
export const note = staffMutation({
  permission: "tickets.reply",
  args: { ticketId: v.id("tickets"), body: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const t = await ctx.db.get(args.ticketId);
    if (!t) throw notFound("Ticket");
    const body = args.body.trim();
    if (body.length < 2 || body.length > 4000) throw fail("INVALID_ARGUMENT", "Note must be between 2 and 4000 characters");
    await ctx.db.insert("ticketMessages", {
      ticketId: t._id,
      author: "staff",
      staffId: staff._id,
      authorLabel: staffName(staff),
      body,
      internal: true,
      createdAt: Date.now(),
    });
    await log({ action: "ticket.note", targetType: "ticket", targetId: t._id, targetLabel: t.number });
    return null;
  },
});

export const setStatus = staffMutation({
  permission: "tickets.reply",
  requireReason: true,
  args: { ticketId: v.id("tickets"), status, reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const t = await ctx.db.get(args.ticketId);
    if (!t) throw notFound("Ticket");
    if (t.status === args.status) throw fail("NO_CHANGES", `Ticket is already ${args.status.replace("_", " ")}`);
    await ctx.db.patch(t._id, {
      status: args.status,
      assignedTo: t.assignedTo ?? staff._id,
      resolvedAt: args.status === "resolved" ? Date.now() : undefined,
    });
    if (args.status === "resolved") {
      await notify(ctx, t.profileId, {
        title: `Ticket ${t.number} resolved`,
        body: "Support marked this ticket as resolved. Reply on the ticket if you still need help.",
        link: `/dashboard/support/${t._id}`,
      });
    }
    await log({
      action: "ticket.set_status",
      targetType: "ticket",
      targetId: t._id,
      targetLabel: t.number,
      before: { status: t.status },
      after: { status: args.status },
    });
    return null;
  },
});

export const assignToMe = staffMutation({
  permission: "tickets.reply",
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args, { staff }, log) => {
    const t = await ctx.db.get(args.ticketId);
    if (!t) throw notFound("Ticket");
    await ctx.db.patch(t._id, { assignedTo: staff._id });
    await log({
      action: "ticket.assign",
      targetType: "ticket",
      targetId: t._id,
      targetLabel: t.number,
      after: { assignedTo: staff.email },
    });
    return null;
  },
});
