import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentProfile } from "./lib/auth";
import { fail, notFound } from "./lib/errors";
import { requireNonEmpty } from "./lib/validation";

const MAX_OPEN_TICKETS = 5;
const MAX_USER_MESSAGES_PER_TICKET = 50;
const NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I so a number read over the phone is unambiguous

const category = v.union(
  v.literal("streak"),
  v.literal("account"),
  v.literal("content"),
  v.literal("payment"),
  v.literal("certificate"),
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
    let number = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = `MW-${Array.from({ length: 6 }, () => NUMBER_ALPHABET[Math.floor(Math.random() * NUMBER_ALPHABET.length)]).join("")}`;
      const clash = await ctx.db.query("tickets").withIndex("by_number", (q) => q.eq("number", candidate)).first();
      if (!clash) {
        number = candidate;
        break;
      }
    }
    if (!number) throw fail("TRY_AGAIN", "Could not create the ticket. Please try again.");
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
