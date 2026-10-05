import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentProfile } from "./lib/auth";
import { fail } from "./lib/errors";
import { sha256Hex } from "./lib/audit";
import { eraseBatch, type EraseState } from "./lib/erase";

const ACTIVE_BILLING = ["active", "trialing", "past_due"];

/**
 * Everything the platform holds about the signed-in learner, as plain data they can keep. Large collections are
 * capped (and flagged) so the file stays a sensible size; the settings page lets them contact support for more.
 */
export const exportMine = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getCurrentProfile(ctx);
    if (!profile) throw fail("NOT_FOUND", "No profile to export");
    const id = profile._id;
    const truncated: string[] = [];
    const cap = async <T>(label: string, fetch: (n: number) => Promise<T[]>, n: number) => {
      const rows = await fetch(n + 1);
      if (rows.length > n) truncated.push(label);
      return rows.slice(0, n);
    };
    const strip = <T extends Record<string, unknown>>(row: T) => {
      const { _id, _creationTime, userId, profileId, legacyId, tokenIdentifier, authSubject, legacySupabaseUserId, activeSessionId, searchText, migrationStatus, ...rest } = row as Record<string, unknown>;
      void _id; void _creationTime; void userId; void profileId; void legacyId; void tokenIdentifier; void authSubject; void legacySupabaseUserId; void activeSessionId; void searchText; void migrationStatus;
      return rest;
    };
    const tickets = await cap("tickets", (n) => ctx.db.query("tickets").withIndex("by_profile", (q) => q.eq("profileId", id)).order("desc").take(n), 100);
    const ticketsOut = [];
    for (const t of tickets) {
      const msgs = await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(200);
      ticketsOut.push({ number: t.number, subject: t.subject, status: t.status, createdAt: t.createdAt, messages: msgs.filter((m) => !m.internal).map((m) => ({ from: m.author === "user" ? "you" : "support", body: m.body, at: m.createdAt })) });
    }
    return {
      exportedAt: new Date().toISOString(),
      about: "Your Mwalimu AI data. Staff-only notes and system identifiers are left out.",
      profile: strip(profile as never),
      learningProgress: (await ctx.db.query("learningProgress").withIndex("by_user", (q) => q.eq("userId", id)).take(100)).map(strip),
      certificates: (await ctx.db.query("certificates").withIndex("by_user", (q) => q.eq("userId", id)).take(100)).map(strip),
      activity: (await cap("activity", (n) => ctx.db.query("activityLog").withIndex("by_user_and_date", (q) => q.eq("userId", id)).order("desc").take(n), 2000)).map(strip),
      journal: (await cap("journal", (n) => ctx.db.query("journalEntries").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).order("desc").take(n), 400)).map(strip),
      toolHistory: (await cap("toolHistory", (n) => ctx.db.query("toolHistory").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).order("desc").take(n), 100)).map(strip),
      toolsUsed: (await ctx.db.query("toolsUsed").withIndex("by_user_and_last_used_at", (q) => q.eq("userId", id)).take(100)).map(strip),
      goals: (await ctx.db.query("goals").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).take(200)).map(strip),
      needsAssessment: (await ctx.db.query("assessmentResults").withIndex("by_user", (q) => q.eq("userId", id)).take(5)).map(strip),
      aiConversations: (await cap("aiConversations", (n) => ctx.db.query("aiConversations").withIndex("by_user_and_updated_at", (q) => q.eq("userId", id)).order("desc").take(n), 100)).map(strip),
      aiMessages: (await cap("aiMessages", (n) => ctx.db.query("aiMessages").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).order("desc").take(n), 600)).map(strip),
      communityPosts: (await cap("communityPosts", (n) => ctx.db.query("communityPosts").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).order("desc").take(n), 300)).map(strip),
      communityReplies: (await cap("communityReplies", (n) => ctx.db.query("communityComments").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).order("desc").take(n), 500)).map(strip),
      supportTickets: ticketsOut,
      notifications: (await ctx.db.query("notifications").withIndex("by_user_and_created_at", (q) => q.eq("userId", id)).order("desc").take(200)).map(strip),
      streakRestorations: (await ctx.db.query("streakAdjustments").withIndex("by_profile", (q) => q.eq("profileId", id)).take(100)).map((a) => ({ dates: a.dates, at: a.createdAt, revoked: a.revokedAt !== undefined })),
      subscription: await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", id)).first().then((s) => (s ? { plan: s.plan, status: s.status, currentPeriodEnd: s.currentPeriodEnd } : null)),
      truncated,
    };
  },
});

/** Records that an export was taken (no personal data is stored). */
export const logExport = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { profile } = await getCurrentProfile(ctx);
    if (profile) await ctx.db.insert("privacyRequests", { kind: "export", ref: (await sha256Hex(profile._id)).slice(0, 32), at: Date.now() });
    return null;
  },
});

/**
 * Permanently erases the signed-in learner. They are signed out everywhere at once; the data is then removed in
 * the background, a batch at a time. Staff accounts and learners with a live paid plan must sort that out first.
 */
export const deleteMine = mutation({
  args: { confirm: v.string() },
  returns: v.null(),
  handler: async (ctx, { confirm }) => {
    const { profile } = await getCurrentProfile(ctx);
    if (!profile) throw fail("NOT_FOUND", "No account found");
    if (confirm.trim() !== "DELETE") throw fail("CONFIRM_REQUIRED", "Type DELETE to confirm");
    if (profile.email) {
      const staff = await ctx.db.query("staff").withIndex("by_email", (q) => q.eq("email", profile.email!.trim().toLowerCase())).unique();
      if (staff) throw fail("STAFF_ACCOUNT", "This account is used for staff access. Ask a Super Admin to remove your staff access first.");
    }
    const sub = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).first();
    if (sub && sub.plan !== "free" && ACTIVE_BILLING.includes(sub.status)) throw fail("CANCEL_SUBSCRIPTION_FIRST", "Cancel your paid plan first, so you are not charged after your account is gone.");

    // Lock the account and end every session now; the erasure follows.
    await ctx.db.patch(profile._id, { status: "deactivated", statusReason: "Account deleted by the learner", statusChangedAt: Date.now(), activeSessionId: undefined, updatedAt: Date.now() });
    const userId = ctx.db.normalizeId("users", profile.authSubject);
    if (userId) {
      for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).take(50)) {
        for (const t of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).take(100)) await ctx.db.delete(t._id);
        await ctx.db.delete(s._id);
      }
    }
    await ctx.db.insert("privacyRequests", { kind: "erasure_requested", ref: (await sha256Hex(profile._id)).slice(0, 32), at: Date.now() });
    await ctx.scheduler.runAfter(0, internal.dataRights.eraseRun, { state: { profileId: profile._id, phase: 0, cursor: null } });
    return null;
  },
});

export const eraseRun = internalMutation({
  args: { state: v.object({ profileId: v.id("profiles"), phase: v.number(), cursor: v.union(v.string(), v.null()) }) },
  handler: async (ctx, { state }) => {
    const next: EraseState | null = await eraseBatch(ctx, state);
    if (next) await ctx.scheduler.runAfter(0, internal.dataRights.eraseRun, { state: next });
  },
});
