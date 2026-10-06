import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentProfile } from "./lib/auth";
import { fail, notFound } from "./lib/errors";
import { requireNonEmpty } from "./lib/validation";
import { hashToken, newToken } from "./lib/visitorToken";
import type { Id } from "./_generated/dataModel";

const MAX_OPEN_TICKETS = 5;
const MAX_USER_MESSAGES_PER_TICKET = 50;
const NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I so a number read over the phone is unambiguous

const category = v.union(
  v.literal("streak"),
  v.literal("account"),
  v.literal("content"),
  v.literal("payment"),
  v.literal("certificate"),
  v.literal("technical"),
  v.literal("feedback"),
  v.literal("other"),
);

const ticketSummary = v.object({
  _id: v.id("tickets"),
  number: v.string(),
  subject: v.string(),
  category,
  status: v.union(v.literal("open"), v.literal("pending_user"), v.literal("resolved")),
  lastMessageAt: v.number(),
  lastMessageBy: v.union(v.literal("user"), v.literal("staff")),
  createdAt: v.number(),
});

function summary(t: Doc<"tickets">) {
  return {
    _id: t._id,
    number: t.number,
    subject: t.subject,
    category: t.category,
    status: t.status,
    lastMessageAt: t.lastMessageAt,
    lastMessageBy: t.lastMessageBy,
    createdAt: t.createdAt,
  };
}


async function newTicketNumber(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `MW-${Array.from({ length: 6 }, () => NUMBER_ALPHABET[Math.floor(Math.random() * NUMBER_ALPHABET.length)]).join("")}`;
    const clash = await ctx.db.query("tickets").withIndex("by_number", (q) => q.eq("number", candidate)).first();
    if (!clash) return candidate;
  }
  throw fail("TRY_AGAIN", "Could not create the ticket. Please try again.");
}

async function mineOrThrow(ctx: QueryCtx) {
  const { profile } = await getCurrentProfile(ctx);
  if (!profile) throw fail("PROFILE_NOT_PROVISIONED", "Finish setting up your profile first");
  return profile;
}

export const listMine = query({
  args: {},
  returns: v.array(ticketSummary),
  handler: async (ctx) => {
    const profile = await mineOrThrow(ctx);
    const rows = await ctx.db
      .query("tickets")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(50);
    return rows.map(summary);
  },
});

export const getMine = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const profile = await mineOrThrow(ctx);
    const t = await ctx.db.get(ticketId);
    if (!t || t.profileId !== profile._id) throw notFound("Ticket");
    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", t._id))
      .take(200);
    return {
      ticket: summary(t),
      // Internal staff notes never leave the server.
      messages: messages
        .filter((m) => !m.internal)
        .map((m) => ({ _id: m._id, author: m.author, authorLabel: m.authorLabel, body: m.body, createdAt: m.createdAt })),
    };
  },
});

export const create = mutation({
  args: { subject: v.string(), category, body: v.string() },
  returns: v.object({ ticketId: v.id("tickets"), number: v.string() }),
  handler: async (ctx, args) => {
    const profile = await mineOrThrow(ctx);
    const subject = requireNonEmpty(args.subject, "Subject", 120);
    const body = requireNonEmpty(args.body, "Message", 4000);
    const open = await ctx.db
      .query("tickets")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(30);
    if (open.filter((t) => t.status !== "resolved").length >= MAX_OPEN_TICKETS) {
      throw fail("TOO_MANY_TICKETS", "You already have several open tickets. Please wait for a reply or reply on an existing ticket.");
    }
    const number = await newTicketNumber(ctx);
    const now = Date.now();
    const ticketId = await ctx.db.insert("tickets", {
      number,
      profileId: profile._id,
      subject,
      category: args.category,
      status: "open",
      lastMessageAt: now,
      lastMessageBy: "user",
      createdAt: now,
    });
    await ctx.db.insert("ticketMessages", {
      ticketId,
      author: "user",
      authorLabel: profile.name || "Learner",
      body,
      internal: false,
      createdAt: now,
    });
    return { ticketId, number };
  },
});

/** Learner reply. Replying to a resolved ticket reopens it. */
export const reply = mutation({
  args: { ticketId: v.id("tickets"), body: v.string() },
  returns: v.null(),
  handler: async (ctx, { ticketId, body }) => {
    const profile = await mineOrThrow(ctx);
    const t = await ctx.db.get(ticketId);
    if (!t || t.profileId !== profile._id) throw notFound("Ticket");
    const text = requireNonEmpty(body, "Message", 4000);
    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", t._id))
      .take(200);
    if (messages.filter((m) => m.author === "user").length >= MAX_USER_MESSAGES_PER_TICKET) {
      throw fail("TICKET_FULL", "This ticket has reached its message limit. Please open a new ticket.");
    }
    const now = Date.now();
    await ctx.db.insert("ticketMessages", {
      ticketId,
      author: "user",
      authorLabel: profile.name || "Learner",
      body: text,
      internal: false,
      createdAt: now,
    });
    await ctx.db.patch(ticketId, {
      status: "open",
      lastMessageAt: now,
      lastMessageBy: "user",
      resolvedAt: undefined,
    });
    return null;
  },
});

/** Learner closes their own ticket ("my problem is solved"). */
export const resolve = mutation({
  args: { ticketId: v.id("tickets") },
  returns: v.null(),
  handler: async (ctx, { ticketId }) => {
    const profile = await mineOrThrow(ctx);
    const t = await ctx.db.get(ticketId);
    if (!t || t.profileId !== profile._id) throw notFound("Ticket");
    if (t.status !== "resolved") await ctx.db.patch(ticketId, { status: "resolved", resolvedAt: Date.now() });
    return null;
  },
});


// ---------------------------------------------------------------------------------------------------------------
// Visitors: anyone can write to support from the public Contact/Support pages, without an account. They get a
// private link to the conversation (staff replies appear there), and can add the conversation to their account
// inbox later. No email is sent by any of this.
// ---------------------------------------------------------------------------------------------------------------

const HOUR = 3_600_000;
const VISITOR_PER_ADDRESS = 3;
const VISITOR_SITE_WIDE = 100;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Starts a conversation. Returns the private token ONCE: it is only stored hashed. */
export const createPublic = mutation({
  args: { name: v.string(), email: v.string(), subject: v.string(), body: v.string(), category },
  returns: v.object({ number: v.string(), token: v.string() }),
  handler: async (ctx, args) => {
    const name = requireNonEmpty(args.name, "Name", 100);
    if (name.length < 2) throw fail("INVALID_ARGUMENT", "Please enter your name.");
    const email = args.email.trim().toLowerCase();
    if (!EMAIL_SHAPE.test(email) || email.length > 160) throw fail("INVALID_ARGUMENT", "Please enter a valid email address.");
    const subject = requireNonEmpty(args.subject, "Subject", 160);
    if (subject.length < 3) throw fail("INVALID_ARGUMENT", "Please add a subject.");
    const body = requireNonEmpty(args.body, "Message", 4000);
    if (body.length < 10) throw fail("INVALID_ARGUMENT", "Please write a little more so we can help.");
    const since = Date.now() - HOUR;
    const mine = await ctx.db.query("tickets").withIndex("by_visitor_email", (q) => q.eq("visitor.email", email).gt("createdAt", since)).take(VISITOR_PER_ADDRESS);
    if (mine.length >= VISITOR_PER_ADDRESS) throw fail("RATE_LIMITED", "You have started several conversations in the last hour. Please use the link you were given, or try again later.");
    const recent = await ctx.db.query("tickets").order("desc").take(VISITOR_SITE_WIDE);
    if (recent.length >= VISITOR_SITE_WIDE && recent.filter((t) => t.visitor && t.createdAt > since).length >= VISITOR_SITE_WIDE) throw fail("RATE_LIMITED", "We are receiving a lot of messages right now. Please try again in a little while.");
    const number = await newTicketNumber(ctx);
    const token = newToken();
    const now = Date.now();
    const ticketId = await ctx.db.insert("tickets", {
      number,
      visitor: { name, email },
      tokenHash: await hashToken(token),
      subject,
      category: args.category,
      status: "open",
      lastMessageAt: now,
      lastMessageBy: "user",
      createdAt: now,
    });
    await ctx.db.insert("ticketMessages", { ticketId, author: "user", authorLabel: name, body, internal: false, createdAt: now });
    return { number, token };
  },
});

async function byToken(ctx: QueryCtx, token: string) {
  if (token.length < 20 || token.length > 100) return null;
  const hash = await hashToken(token);
  return await ctx.db.query("tickets").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).first();
}

/** The conversation behind a private link, or null when the link is wrong or has been added to an account. */
export const publicThread = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const t = await byToken(ctx, token);
    if (!t) return null;
    const messages = await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(200);
    return {
      ticket: { ...summary(t), visitorName: t.visitor?.name ?? "" },
      messages: messages.filter((m) => !m.internal).map((m) => ({ _id: m._id, author: m.author, authorLabel: m.authorLabel, body: m.body, createdAt: m.createdAt })),
    };
  },
});

export const publicReply = mutation({
  args: { token: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, { token, body }) => {
    const t = await byToken(ctx, token);
    if (!t) throw notFound("Conversation");
    const text = requireNonEmpty(body, "Message", 4000);
    const messages = await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(200);
    if (messages.filter((m) => m.author === "user").length >= MAX_USER_MESSAGES_PER_TICKET) throw fail("TICKET_FULL", "This conversation has reached its message limit. Please start a new one.");
    const now = Date.now();
    await ctx.db.insert("ticketMessages", { ticketId: t._id, author: "user", authorLabel: t.visitor?.name ?? "Visitor", body: text, internal: false, createdAt: now });
    await ctx.db.patch(t._id, { status: "open", lastMessageAt: now, lastMessageBy: "user", resolvedAt: undefined });
    return null;
  },
});

/** A signed-in learner adds a visitor conversation (by its private link) to their own inbox. The link then stops working. */
export const claimByToken = mutation({
  args: { token: v.string() },
  returns: v.id("tickets"),
  handler: async (ctx, { token }) => {
    const profile = await mineOrThrow(ctx);
    const t = await byToken(ctx, token);
    if (!t || t.profileId) throw notFound("Conversation");
    await ctx.db.patch(t._id, { profileId: profile._id, tokenHash: undefined });
    return t._id;
  },
});

/**
 * Signed in with an email address that has been verified by the sign-in provider (for example Google): conversations
 * started as a visitor with that same address move to the account's inbox automatically. A password sign-up does not
 * prove the address, so those use the private link and "add to my account" instead.
 */
export const attachVerified = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { identity, profile } = await getCurrentProfile(ctx);
    if (!profile) return 0;
    const native = await ctx.db.get(identity.subject.split("|")[0] as Id<"users">).catch(() => null);
    const email = native?.email?.trim().toLowerCase();
    if (!native?.emailVerificationTime || !email) return 0;
    const rows = await ctx.db.query("tickets").withIndex("by_visitor_email", (q) => q.eq("visitor.email", email)).take(50);
    let moved = 0;
    for (const t of rows) {
      if (t.profileId) continue;
      await ctx.db.patch(t._id, { profileId: profile._id, tokenHash: undefined });
      moved++;
    }
    return moved;
  },
});
