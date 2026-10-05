import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { sha256Hex } from "./lib/audit";

const MAX_NEW_PER_HOUR = 200;

/** Remove things that identify a person or carry secrets: query strings, long ids, emails, numbers. */
const scrub = (s: string) =>
  s
    .replace(/\?[^\s)'"]*/g, "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>")
    .replace(/\b[a-z0-9]{24,}\b/gi, "<id>");
const shape = (s: string) => scrub(s).replace(/\d+/g, "#");

/**
 * Anyone (signed in or not) may report an error, so it is bounded: text is trimmed and scrubbed, identical errors
 * only bump a counter, and no more than 200 brand-new error types are stored per hour however many are sent.
 */
export const report = mutation({
  args: {
    source: v.union(v.literal("browser"), v.literal("server"), v.literal("api")),
    message: v.string(),
    stack: v.optional(v.string()),
    route: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = scrub(args.message).slice(0, 500);
    if (!message.trim()) return null;
    const stack = args.stack ? scrub(args.stack).slice(0, 2000) : undefined;
    const route = args.route ? scrub(args.route).slice(0, 200) : undefined;
    const firstFrame = stack?.split("\n").find((l) => /at |@/.test(l)) ?? "";
    const fingerprint = (await sha256Hex(`${args.source}|${shape(message)}|${shape(firstFrame)}`)).slice(0, 32);
    const now = Date.now();
    const existing = await ctx.db.query("clientErrors").withIndex("by_fingerprint", (q) => q.eq("fingerprint", fingerprint)).unique();
    if (existing) {
      // A fix that regressed reopens the error.
      await ctx.db.patch(existing._id, { count: existing.count + 1, lastSeen: now, ...(existing.resolvedAt !== undefined ? { resolvedAt: undefined, resolvedBy: undefined } : {}) });
      return null;
    }
    const recent = await ctx.db.query("clientErrors").withIndex("by_first_seen", (q) => q.gte("firstSeen", now - 3600_000)).take(MAX_NEW_PER_HOUR + 1);
    if (recent.length > MAX_NEW_PER_HOUR) return null;
    await ctx.db.insert("clientErrors", {
      fingerprint, source: args.source, message, count: 1, firstSeen: now, lastSeen: now,
      ...(stack ? { stack } : {}), ...(route ? { route } : {}), ...(args.userAgent ? { userAgent: args.userAgent.slice(0, 200) } : {}),
    });
    return null;
  },
});

/** Cheap liveness check used by the uptime monitor. */
export const ping = query({
  args: {},
  returns: v.object({ ok: v.boolean(), at: v.number() }),
  handler: async () => ({ ok: true, at: Date.now() }),
});
