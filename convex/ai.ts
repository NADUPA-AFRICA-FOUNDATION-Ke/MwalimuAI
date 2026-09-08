import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { boundedLimit, requireNonEmpty } from "./lib/validation";

const conversationDoc = v.object({
  _id: v.id("aiConversations"), _creationTime: v.number(), userId: v.id("profiles"),
  legacyId: v.optional(v.string()), clientId: v.optional(v.string()), title: v.string(),
  createdAt: v.number(), updatedAt: v.number(),
});
const messageDoc = v.object({
  _id: v.id("aiMessages"), _creationTime: v.number(), conversationId: v.id("aiConversations"),
  userId: v.id("profiles"), legacyId: v.optional(v.string()), clientId: v.optional(v.string()),
  role: v.union(v.literal("user"), v.literal("assistant")), content: v.string(), createdAt: v.number(),
});
const role = v.union(v.literal("user"), v.literal("assistant"));

export const listConversations = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(conversationDoc),
  handler: async (ctx, { limit }) => {
    const profile = await requireCurrentProfile(ctx);
    return await ctx.db.query("aiConversations")
      .withIndex("by_user_and_updated_at", (q) => q.eq("userId", profile._id))
      .order("desc").take(boundedLimit(limit, 50, 100));
  },
});

export const listMessages = query({
  args: { conversationId: v.id("aiConversations"), limit: v.optional(v.number()) },
  returns: v.array(messageDoc),
  handler: async (ctx, { conversationId, limit }) => {
    const profile = await requireCurrentProfile(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== profile._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    }
    return await ctx.db.query("aiMessages")
      .withIndex("by_conversation_and_created_at", (q) => q.eq("conversationId", conversationId))
      .order("asc").take(boundedLimit(limit, 200, 500));
  },
});

export const createConversation = mutation({
  args: { title: v.string(), clientId: v.optional(v.string()) },
  returns: v.id("aiConversations"),
  handler: async (ctx, { title, clientId }) => {
    const profile = await requireCurrentProfile(ctx);
    const normalizedTitle = requireNonEmpty(title, "title", 120);
    if (clientId) {
      const existing = await ctx.db.query("aiConversations")
        .withIndex("by_user_and_client_id", (q) => q.eq("userId", profile._id).eq("clientId", clientId))
        .unique();
      if (existing) return existing._id;
    }
    const now = Date.now();
    return await ctx.db.insert("aiConversations", {
      userId: profile._id, title: normalizedTitle, createdAt: now, updatedAt: now,
      ...(clientId ? { clientId } : {}),
    });
  },
});

export const renameConversation = mutation({
  args: { conversationId: v.id("aiConversations"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, { conversationId, title }) => {
    const profile = await requireCurrentProfile(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== profile._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    }
    await ctx.db.patch(conversationId, { title: requireNonEmpty(title, "title", 120), updatedAt: Date.now() });
    return null;
  },
});

export const appendMessage = mutation({
  args: { conversationId: v.id("aiConversations"), role, content: v.string(), clientId: v.optional(v.string()) },
  returns: v.id("aiMessages"),
  handler: async (ctx, { conversationId, role: messageRole, content, clientId }) => {
    const profile = await requireCurrentProfile(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== profile._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    }
    if (clientId) {
      const existing = await ctx.db.query("aiMessages")
        .withIndex("by_conversation_and_client_id", (q) => q.eq("conversationId", conversationId).eq("clientId", clientId))
        .unique();
      if (existing) return existing._id;
    }
    const now = Date.now();
    const id = await ctx.db.insert("aiMessages", {
      conversationId, userId: profile._id, role: messageRole,
      content: requireNonEmpty(content, "content", 100_000), createdAt: now,
      ...(clientId ? { clientId } : {}),
    });
    await ctx.db.patch(conversationId, { updatedAt: now });
    return id;
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("aiConversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    const profile = await requireCurrentProfile(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.userId !== profile._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Conversation not found" });
    }
    const messages = await ctx.db.query("aiMessages")
      .withIndex("by_conversation_and_created_at", (q) => q.eq("conversationId", conversationId)).take(501);
    if (messages.length > 500) {
      throw new ConvexError({ code: "TOO_MANY_MESSAGES", message: "Conversation is too large to delete in one request" });
    }
    for (const message of messages) await ctx.db.delete(message._id);
    await ctx.db.delete(conversationId);
    return null;
  },
});
