import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertProfileActive, getCurrentProfile, sessionIdOf } from "./lib/auth";

const LOG_SIZE = 20;

/**
 * Makes this session and tab the one that holds the account. If another session (another device or browser) still
 * holds it, the first call returns "confirm" so the person can choose; confirming signs the other one out for good:
 * its session and refresh tokens are deleted, and every request it makes is refused from that moment.
 */
export const claim = mutation({
  args: { tabId: v.string(), confirm: v.boolean(), agent: v.optional(v.string()) },
  returns: v.object({ status: v.union(v.literal("ok"), v.literal("confirm")) }),
  handler: async (ctx, { tabId, confirm, agent }) => {
    const { identity, profile } = await getCurrentProfile(ctx);
    if (!profile) return { status: "ok" as const };
    assertProfileActive(profile);
    const sessionId = sessionIdOf(identity);
    const now = Date.now();
    // A session that was replaced had its sign-in deleted, but its access token stays valid until it expires (up to an
    // hour). It must not be able to take the account back and sign out the person who replaced it, so only a session
    // whose sign-in still exists may claim.
    const ownId = ctx.db.normalizeId("authSessions", sessionId);
    const own = ownId ? await ctx.db.get(ownId) : null;
    if (!own || own.expirationTime <= now) {
      throw new ConvexError({ code: "SESSION_REPLACED", message: "This account was opened on another device or browser, so you were signed out here." });
    }
    const holder = profile.activeAuthSession;
    let replaced = false;
    if (holder && holder !== sessionId) {
      const other = await ctx.db.get(holder as Id<"authSessions">).catch(() => null);
      const alive = other !== null && other.expirationTime > now;
      if (alive && !confirm) return { status: "confirm" as const };
      replaced = alive;
    }
    // Taking over ends the previous holder's sign-in for good. Other sessions that never held the account are already
    // refused by every learner function, and must confirm (which ends this one) if they want it.
    if (replaced && holder) {
      const sid = holder as Id<"authSessions">;
      for (const t of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", sid)).take(200)) await ctx.db.delete(t._id);
      await ctx.db.delete(sid);
    }
    const newSession = holder !== sessionId;
    await ctx.db.patch(profile._id, {
      activeAuthSession: sessionId,
      activeTabId: tabId.slice(0, 64),
      ...(newSession ? { sessionLog: [...(profile.sessionLog ?? []), { at: now, agent: (agent ?? "").slice(0, 160), replaced }].slice(-LOG_SIZE) } : {}),
    });
    return { status: "ok" as const };
  },
});

/** Signing out frees the account, so the next sign-in elsewhere does not have to confirm. */
export const release = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { identity, profile } = await getCurrentProfile(ctx);
    if (profile && profile.activeAuthSession === sessionIdOf(identity)) await ctx.db.patch(profile._id, { activeAuthSession: undefined, activeTabId: undefined });
    return null;
  },
});

/** For Settings: when this sign-in started and how many times the account changed device recently. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { profile } = await getCurrentProfile(ctx);
    const log = profile?.sessionLog ?? [];
    const last = log[log.length - 1];
    return { since: last?.at ?? null, agent: last?.agent ?? "", switchesLast30Days: log.filter((e) => e.at > Date.now() - 30 * 86_400_000).length };
  },
});
