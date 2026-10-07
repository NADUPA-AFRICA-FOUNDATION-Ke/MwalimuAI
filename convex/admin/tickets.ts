import { v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { notify } from "../lib/notices";
import { fail, notFound } from "../lib/errors";
import type { Doc } from "../_generated/dataModel";
import { attachmentInput, checkAttachments, firstResponseDue, priorityV, publicMessages, statusV as status } from "../lib/ticketing";


/** Password sign-ups keep their address on the sign-in account, not the profile: look there when the profile has none. */
async function emailOf(ctx: { db: { get: (id: never) => Promise<unknown> } }, p: Doc<"profiles"> | null) {
  if (!p) return "";
  if (p.email) return p.email;
  const u = (await ctx.db.get(p.authSubject as never).catch(() => null)) as { email?: string } | null;
  return u?.email ?? "";
}

const staffName = (s: Doc<"staff">) => s.name?.trim() || s.email.split("@")[0];

/**
 * The queue. Filters: status ("active" = open + in progress), priority, category, assigned to me, and a text search
 * over number, subject and who wrote it. Capped and index-driven, never a table scan.
 */
export const list = staffQuery({
  permission: "tickets.read",
  args: {
    status: v.optional(v.union(status, v.literal("active"))),
    priority: v.optional(priorityV),
    category: v.optional(v.string()),
    mine: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args, { staff }) => {
    const q = args.search?.trim().toLowerCase();
    let rows: Doc<"tickets">[];
    if (q) rows = await ctx.db.query("tickets").withSearchIndex("search_tickets", (s) => s.search("searchText", q)).take(100);
    else if (args.status === "active") {
      const [open, working] = await Promise.all([
        ctx.db.query("tickets").withIndex("by_status", (x) => x.eq("status", "open")).order("desc").take(100),
        ctx.db.query("tickets").withIndex("by_status", (x) => x.eq("status", "in_progress")).order("desc").take(100),
      ]);
      rows = [...open, ...working];
    } else if (args.status) rows = await ctx.db.query("tickets").withIndex("by_status", (x) => x.eq("status", args.status as Doc<"tickets">["status"])).order("desc").take(100);
    else rows = await ctx.db.query("tickets").order("desc").take(100);
    if (q && args.status) rows = rows.filter((t) => (args.status === "active" ? t.status === "open" || t.status === "in_progress" : t.status === args.status));
    if (args.priority) rows = rows.filter((t) => (t.priority ?? "normal") === args.priority);
    if (args.category) rows = rows.filter((t) => t.category === args.category);
    if (args.mine) rows = rows.filter((t) => t.assignedTo === staff._id);
    const now = Date.now();
    const rank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
    const out = [];
    for (const t of rows) {
      const p = t.profileId ? await ctx.db.get(t.profileId) : null;
      const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
      const dueAt = firstResponseDue(t);
      out.push({
        _id: t._id,
        number: t.number,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority ?? "normal",
        lastMessageAt: t.lastMessageAt,
        lastMessageBy: t.lastMessageBy,
        createdAt: t.createdAt,
        dueAt,
        overdue: dueAt !== null && dueAt < now && t.status !== "resolved" && t.status !== "closed",
        assignedTo: t.assignedTo ?? null,
        assigneeName: assignee ? staffName(assignee) : null,
        learner: { _id: t.profileId ?? null, name: p?.name ?? t.visitor?.name ?? "", email: p ? await emailOf(ctx as never, p) : (t.visitor?.email ?? ""), visitor: !t.profileId },
      });
    }
    // Overdue first, then by priority, then most recent activity.
    return out.sort((a, b) => Number(b.overdue) - Number(a.overdue) || rank[a.priority] - rank[b.priority] || b.lastMessageAt - a.lastMessageAt);
  },
});

export const counts = staffQuery({
  permission: "tickets.read",
  args: {},
  handler: async (ctx) => {
    const open = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "open")).take(200);
    const working = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "in_progress")).take(200);
    const waiting = await ctx.db.query("tickets").withIndex("by_status", (q) => q.eq("status", "pending_user")).take(200);
    const now = Date.now();
    const overdue = [...open, ...working].filter((t) => { const d = firstResponseDue(t); return d !== null && d < now; }).length;
    return { open: open.length, inProgress: working.length, pendingUser: waiting.length, overdue };
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
    const learner = t.profileId ? await ctx.db.get(t.profileId) : null;
    const messages = await publicMessages(ctx, t._id, true);
    const assignee = t.assignedTo ? await ctx.db.get(t.assignedTo) : null;
    return {
      ticket: {
        _id: t._id,
        number: t.number,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority ?? "normal",
        dueAt: firstResponseDue(t),
        createdAt: t.createdAt,
        lastMessageAt: t.lastMessageAt,
        resolvedAt: t.resolvedAt ?? null,
        assignedToName: assignee ? staffName(assignee) : null,
      },
      learner: learner
        ? { _id: learner._id, name: learner.name, email: await emailOf(ctx as never, learner), status: learner.status ?? "active" }
        : null,
      // Someone who wrote from the public Contact/Support page and has no account inbox yet. Their address is as they typed it: it is not verified.
      visitor: t.visitor ? { name: t.visitor.name, email: t.visitor.email } : null,
      messages,
    };
  },
});

/** Reply to the learner or visitor. A learner sees it in their ticket and bell; a visitor on their private link. */
export const reply = staffMutation({
  permission: "tickets.reply",
  args: { ticketId: v.id("tickets"), body: v.string(), resolve: v.optional(v.boolean()), attachments: v.optional(attachmentInput) },
  handler: async (ctx, args, { staff }, log) => {
    const t = await ctx.db.get(args.ticketId);
    if (!t) throw notFound("Ticket");
    const body = args.body.trim();
    if (body.length < 2 || body.length > 4000) throw fail("INVALID_ARGUMENT", "Reply must be between 2 and 4000 characters");
    if (t.status === "closed") throw fail("TICKET_CLOSED", "This ticket is closed. Reopen it first (set its status) if it needs another reply.");
    const now = Date.now();
    const resolved = args.resolve === true;
    await ctx.db.insert("ticketMessages", {
      ticketId: t._id,
      author: "staff",
      staffId: staff._id,
      authorLabel: `${staffName(staff)} (Mwalimu AI Support)`,
      body,
      internal: false,
      ...(args.attachments?.length ? { attachments: await checkAttachments(ctx, args.attachments) } : {}),
      createdAt: now,
    });
    await ctx.db.patch(t._id, {
      firstResponseAt: t.firstResponseAt ?? now,
      closedAt: undefined,
      status: resolved ? "resolved" : "pending_user",
      lastMessageAt: now,
      lastMessageBy: "staff",
      assignedTo: t.assignedTo ?? staff._id,
      ...(resolved ? { resolvedAt: now } : {}),
    });
    // Replies live in the ticket. Signed-in learners also get an in-app notification; visitors see the reply on their private link.
    if (t.profileId) {
      await notify(ctx, t.profileId, {
        title: resolved ? `Ticket ${t.number} resolved` : `Support replied to ${t.number}`,
        body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
        link: `/dashboard/support/${t._id}`,
      });
    }
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
      resolvedAt: args.status === "resolved" ? Date.now() : t.resolvedAt,
      closedAt: args.status === "closed" ? Date.now() : undefined,
    });
    // The learner hears about every change of state, in plain words.
    const SAY: Record<string, string> = {
      open: "is open again",
      in_progress: "is being worked on",
      pending_user: "needs a reply from you",
      resolved: "was marked resolved. Reply if you still need help",
      closed: "was closed",
    };
    if (t.profileId) {
      await notify(ctx, t.profileId, { title: `Ticket ${t.number} ${SAY[args.status]}`, body: t.subject, link: `/dashboard/support/${t._id}` });
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

export const setPriority = staffMutation({
  permission: "tickets.reply",
  args: { ticketId: v.id("tickets"), priority: priorityV },
  handler: async (ctx, args, _s, log) => {
    const t = await ctx.db.get(args.ticketId);
    if (!t) throw notFound("Ticket");
    await ctx.db.patch(t._id, { priority: args.priority });
    await log({ action: "ticket.set_priority", targetType: "ticket", targetId: t._id, targetLabel: t.number, before: { priority: t.priority ?? "normal" }, after: { priority: args.priority } });
    return null;
  },
});

export const generateUploadUrl = staffMutation({
  permission: "tickets.reply",
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

// ── Saved replies ─────────────────────────────────────────────────────────────
export const cannedList = staffQuery({
  permission: "tickets.read",
  args: {},
  handler: async (ctx) => (await ctx.db.query("cannedReplies").take(100)).sort((a, b) => a.title.localeCompare(b.title)).map((c) => ({ _id: c._id, title: c.title, body: c.body })),
});

export const cannedSave = staffMutation({
  permission: "tickets.reply",
  args: { id: v.optional(v.id("cannedReplies")), title: v.string(), body: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const title = args.title.trim(), body = args.body.trim();
    if (title.length < 2 || title.length > 80 || body.length < 2 || body.length > 4000) throw fail("INVALID_ARGUMENT", "Give the saved reply a title (up to 80 characters) and text (up to 4000).");
    const now = Date.now();
    const id = args.id ? (await ctx.db.patch(args.id, { title, body, updatedBy: staff._id, updatedAt: now }), args.id) : await ctx.db.insert("cannedReplies", { title, body, updatedBy: staff._id, updatedAt: now });
    await log({ action: "ticket.canned_save", targetType: "cannedReply", targetId: id, targetLabel: title });
    return id;
  },
});

export const cannedDelete = staffMutation({
  permission: "tickets.reply",
  args: { id: v.id("cannedReplies") },
  handler: async (ctx, { id }, _s, log) => {
    const c = await ctx.db.get(id);
    if (!c) throw notFound("Saved reply");
    await ctx.db.delete(id);
    await log({ action: "ticket.canned_delete", targetType: "cannedReply", targetId: id, targetLabel: c.title });
    return null;
  },
});
