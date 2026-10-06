import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { fail, notFound } from "./lib/errors";

const MAX_EVENTS = 300;
const EVENT_TYPES = new Set([
  "copy", "cut", "paste", "drop", "context_menu", "select_all", "print", "screenshot_key", "window_blur", "tab_hidden",
  "devtools_open", "large_insert", "fullscreen_exit", "second_tab", "assistive_on",
]);

/** Opens a sitting. The learner is told the assessment is monitored before this is called. */
export const startAttempt = mutation({
  args: { programId: v.string(), kind: v.union(v.literal("pre"), v.literal("post")), assistive: v.boolean() },
  returns: v.id("assessmentAttempts"),
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    const now = Date.now();
    const recent = await ctx.db.query("assessmentAttempts").withIndex("by_profile_and_program", (q) => q.eq("profileId", profile._id).eq("programId", args.programId).gt("startedAt", now - 3_600_000)).take(30);
    if (recent.length >= 20) throw fail("RATE_LIMITED", "Too many attempts started. Please wait a while.");
    return await ctx.db.insert("assessmentAttempts", {
      profileId: profile._id,
      programId: args.programId,
      kind: args.kind,
      startedAt: now,
      assistive: args.assistive,
      events: args.assistive ? [{ type: "assistive_on", at: now }] : [],
    });
  },
});

/** Records what happened during a sitting. Events are evidence for staff; they never change the score. */
export const logEvents = mutation({
  args: { attemptId: v.id("assessmentAttempts"), events: v.array(v.object({ type: v.string(), at: v.number(), detail: v.optional(v.string()) })) },
  returns: v.null(),
  handler: async (ctx, { attemptId, events }) => {
    const profile = await requireCurrentProfile(ctx);
    const a = await ctx.db.get(attemptId);
    if (!a || a.profileId !== profile._id) throw notFound("Attempt");
    const clean = events
      .filter((e) => EVENT_TYPES.has(e.type))
      .slice(0, 50)
      .map((e) => ({ type: e.type, at: Math.min(Math.max(e.at, a.startedAt), Date.now() + 60_000), ...(e.detail ? { detail: e.detail.slice(0, 120) } : {}) }));
    if (clean.length === 0 || a.events.length >= MAX_EVENTS) return null;
    await ctx.db.patch(a._id, { events: [...a.events, ...clean].slice(0, MAX_EVENTS) });
    return null;
  },
});

export const setAssistive = mutation({
  args: { attemptId: v.id("assessmentAttempts") },
  returns: v.null(),
  handler: async (ctx, { attemptId }) => {
    const profile = await requireCurrentProfile(ctx);
    const a = await ctx.db.get(attemptId);
    if (!a || a.profileId !== profile._id) throw notFound("Attempt");
    if (!a.assistive) await ctx.db.patch(a._id, { assistive: true, events: [...a.events, { type: "assistive_on", at: Date.now() }].slice(0, MAX_EVENTS) });
    return null;
  },
});
