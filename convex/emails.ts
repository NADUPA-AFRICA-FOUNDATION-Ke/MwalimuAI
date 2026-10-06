import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { addDays, computeStreak, eatDateKey } from "./lib/streakMath";
import { loadActivity } from "./lib/streakRestore";
import { ensureSender, queueEmail, unsubscribeToken, verifyUnsubscribeToken } from "./lib/emailQueue";
import { certificateEmail, streakEmail, ticketReplyEmail, weeklyEmail, type EmailContext, type Rendered } from "./lib/emailTemplates";

const SPACING_MS = Number(process.env.EMAIL_SEND_SPACING_MS ?? 600); // Resend allows about 2 requests a second
const MAX_ATTEMPTS = 4;
const nudgesOn = () => process.env.EMAIL_NUDGES_ENABLED === "true";
const siteUrl = () => (process.env.SITE_URL ?? "https://mwalimu-ai-nu.vercel.app").replace(/\/$/, "");

// ── Learner preferences ─────────────────────────────────────────────────────

const prefsShape = v.object({ streak: v.boolean(), tickets: v.boolean(), certificates: v.boolean(), weekly: v.boolean() });

export const myPrefs = query({
  args: {},
  returns: v.object({ prefs: prefsShape, hasEmail: v.boolean() }),
  handler: async (ctx) => {
    const p = await requireCurrentProfile(ctx);
    const e = p.emailPrefs ?? {};
    const off = p.notificationPreferences?.email === false;
    return { prefs: { streak: !off && e.streak !== false, tickets: !off && e.tickets !== false, certificates: !off && e.certificates !== false, weekly: !off && e.weekly !== false }, hasEmail: Boolean(p.email) };
  },
});

export const setPrefs = mutation({
  args: { prefs: prefsShape },
  returns: v.null(),
  handler: async (ctx, { prefs }) => {
    const p = await requireCurrentProfile(ctx);
    await ctx.db.patch(p._id, { emailPrefs: prefs, ...(p.notificationPreferences?.email === false && Object.values(prefs).some(Boolean) ? { notificationPreferences: { ...p.notificationPreferences, email: true } } : {}), updatedAt: Date.now() });
    return null;
  },
});

/** The unsubscribe link in every email. Works signed out; the token proves it came from us. */
export const unsubscribe = mutation({
  args: { token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { token }) => {
    const raw = await verifyUnsubscribeToken(token);
    const id = raw ? ctx.db.normalizeId("profiles", raw) : null;
    if (!id) return false;
    await ctx.db.patch(id, { emailPrefs: { streak: false, tickets: false, certificates: false, weekly: false }, updatedAt: Date.now() });
    return true;
  },
});

// ── Sending ─────────────────────────────────────────────────────────────────

/** Renders a queued email, or null if it should no longer go out (learner gone, suspended, opted out since). */
export const prepare = internalQuery({
  args: { id: v.id("emailLog") },
  handler: async (ctx, { id }): Promise<(Rendered & { to: string; unsubscribeUrl: string }) | null> => {
    const row = await ctx.db.get(id);
    if (!row || row.status !== "sending") return null;
    const p = await ctx.db.get(row.profileId);
    const pref = { ticket_reply: "tickets", certificate: "certificates", streak: "streak", weekly: "weekly" } as const;
    if (!p?.email || p.status === "suspended" || p.status === "deactivated" || p.emailPrefs?.[pref[row.kind]] === false || p.notificationPreferences?.email === false) return null;
    const unsubscribeUrl = `${siteUrl()}/api/unsubscribe?t=${encodeURIComponent(await unsubscribeToken(p._id))}`;
    const c: EmailContext = { name: p.name ?? "", lang: p.lang, siteUrl: siteUrl(), unsubscribeUrl };
    const d = row.data as Record<string, any>;
    const rendered =
      row.kind === "ticket_reply" ? ticketReplyEmail(c, d as never)
      : row.kind === "certificate" ? certificateEmail(c, d as never)
      : row.kind === "streak" ? streakEmail(c, d as never)
      : weeklyEmail(c, d as never);
    return { ...rendered, to: row.to, unsubscribeUrl };
  },
});

/** Rows ready to send, plus any that a crashed sender claimed more than two minutes ago. */
export const nextQueued = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const queued = await ctx.db.query("emailLog").withIndex("by_status_and_created_at", (q) => q.eq("status", "queued")).take(limit);
    const stuck = (await ctx.db.query("emailLog").withIndex("by_status_and_created_at", (q) => q.eq("status", "sending")).take(5)).filter((r) => (r.claimedAt ?? 0) < Date.now() - 120_000);
    return [...queued, ...stuck].slice(0, limit).map((r) => r._id);
  },
});

/** Takes one email for sending. Only one sender can win, so two overlapping senders never send the same email twice. */
export const claim = internalMutation({
  args: { id: v.id("emailLog") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    const stale = row?.status === "sending" && (row.claimedAt ?? 0) < Date.now() - 120_000;
    if (!row || (row.status !== "queued" && !stale)) return false;
    await ctx.db.patch(id, { status: "sending", claimedAt: Date.now() });
    return true;
  },
});

export const mark = internalMutation({
  args: { id: v.id("emailLog"), outcome: v.union(v.literal("sent"), v.literal("retry"), v.literal("failed"), v.literal("skipped")), error: v.optional(v.string()) },
  handler: async (ctx, { id, outcome, error }) => {
    const row = await ctx.db.get(id);
    if (!row || row.status !== "sending") return; // someone else already settled it
    const attempts = row.attempts + (outcome === "skipped" ? 0 : 1);
    if (outcome === "sent") await ctx.db.patch(id, { status: "sent", attempts, sentAt: Date.now() });
    else if (outcome === "skipped") await ctx.db.patch(id, { status: "skipped", attempts });
    else await ctx.db.patch(id, { status: outcome === "retry" && attempts < MAX_ATTEMPTS ? "queued" : "failed", claimedAt: undefined, attempts, error: (error ?? "").slice(0, 300) });
  },
});

export const drainDone = internalMutation({
  args: {},
  handler: async (ctx) => {
    const lease = await ctx.db.query("emailRuntime").first();
    const more = await ctx.db.query("emailLog").withIndex("by_status_and_created_at", (q) => q.eq("status", "queued")).first();
    if (more) {
      if (lease) await ctx.db.patch(lease._id, { leaseUntil: Date.now() + 60_000 });
      await ctx.scheduler.runAfter(1000, internal.emails.drain, {});
    } else if (lease) await ctx.db.delete(lease._id);
  },
});

/** Sends queued emails one at a time at a polite pace, so a burst (a nudge run) never trips the provider's limit. */
export const drain = internalAction({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM ?? "Mwalimu AI <onboarding@resend.dev>";
    const started = Date.now();
    for (const id of await ctx.runQuery(internal.emails.nextQueued, { limit: 20 })) {
      if (Date.now() - started > 25_000) break; // stay inside the action time limit; drainDone reschedules
      if (!(await ctx.runMutation(internal.emails.claim, { id }))) continue;
      const mail = await ctx.runQuery(internal.emails.prepare, { id });
      if (!mail) { await ctx.runMutation(internal.emails.mark, { id, outcome: "skipped" }); continue; }
      if (!apiKey) { await ctx.runMutation(internal.emails.mark, { id, outcome: "failed", error: "RESEND_API_KEY is not set" }); continue; }
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text,
            headers: { "List-Unsubscribe": `<${mail.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          }),
        });
        if (res.ok) await ctx.runMutation(internal.emails.mark, { id, outcome: "sent" });
        else {
          const retry = res.status === 429 || res.status >= 500;
          await ctx.runMutation(internal.emails.mark, { id, outcome: retry ? "retry" : "failed", error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` });
        }
      } catch (e) {
        await ctx.runMutation(internal.emails.mark, { id, outcome: "retry", error: e instanceof Error ? e.message : "network error" });
      }
      if (SPACING_MS > 0) await new Promise((r) => setTimeout(r, SPACING_MS));
    }
    await ctx.runMutation(internal.emails.drainDone, {});
  },
});

// ── Scheduled campaigns ─────────────────────────────────────────────────────

/**
 * Daily, early evening Kenya time: learners with a streak of 3+ who were here yesterday but not yet today.
 * Starts from yesterday's visits (an index range) so it never scans all learners.
 */
export const streakNudges = internalMutation({
  args: { cursor: v.optional(v.string()), force: v.optional(v.boolean()) },
  handler: async (ctx, { cursor, force }) => {
    if (!nudgesOn() && !force) return;
    const today = eatDateKey(Date.now());
    const page = await ctx.db.query("activityLog").withIndex("by_date_and_type", (q) => q.eq("date", addDays(today, -1)).eq("type", "login")).paginate({ numItems: 100, cursor: cursor ?? null });
    for (const row of page.page) {
      if (row.source === "restored") continue;
      const todays = await ctx.db.query("activityLog").withIndex("by_user_date_and_type", (q) => q.eq("userId", row.userId).eq("date", today).eq("type", "login")).first();
      if (todays) continue;
      const days = computeStreak((await loadActivity(ctx, row.userId, today)).map((r) => r.date), today).current;
      if (days >= 3) await queueEmail(ctx, { profileId: row.userId, kind: "streak", dedupeKey: `streak:${today}:${row.userId}`, data: { days } });
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.emails.streakNudges, { cursor: page.continueCursor, ...(force ? { force } : {}) });
  },
});

/** Sunday evening: a short summary for everyone who was active in the last 7 days. */
export const weeklySummaries = internalMutation({
  args: { dayOffset: v.optional(v.number()), cursor: v.optional(v.string()), force: v.optional(v.boolean()) },
  handler: async (ctx, { dayOffset = 0, cursor, force }) => {
    if (!nudgesOn() && !force) return;
    const today = eatDateKey(Date.now());
    const day = addDays(today, -dayOffset);
    const page = await ctx.db.query("activityLog").withIndex("by_date_and_type", (q) => q.eq("date", day).eq("type", "login")).paginate({ numItems: 100, cursor: cursor ?? null });
    for (const row of page.page) {
      if (row.source === "restored") continue;
      const rows = await ctx.db.query("activityLog").withIndex("by_user_and_date", (q) => q.eq("userId", row.userId).gte("date", addDays(today, -6))).take(200);
      const real = rows.filter((r) => r.source !== "restored");
      const activeDays = new Set(real.filter((r) => r.type === "login").map((r) => r.date)).size;
      const lessons = real.filter((r) => r.type === "lesson").length;
      const streak = computeStreak((await loadActivity(ctx, row.userId, today)).map((r) => r.date), today).current;
      await queueEmail(ctx, { profileId: row.userId, kind: "weekly", dedupeKey: `weekly:${today}:${row.userId}`, data: { activeDays, lessons, streak } });
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.emails.weeklySummaries, { dayOffset, cursor: page.continueCursor, ...(force ? { force } : {}) });
    else if (dayOffset < 6) await ctx.scheduler.runAfter(0, internal.emails.weeklySummaries, { dayOffset: dayOffset + 1, ...(force ? { force } : {}) });
  },
});

/** Keeps the log small: sent and failed rows are only useful for a month. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 86_400_000;
    let n = 0;
    for (const status of ["sent", "failed", "skipped"] as const) {
      const rows = await ctx.db.query("emailLog").withIndex("by_status_and_created_at", (q) => q.eq("status", status).lt("createdAt", cutoff)).take(200);
      for (const r of rows) { await ctx.db.delete(r._id); n++; }
    }
    if (n >= 200) await ctx.scheduler.runAfter(0, internal.emails.cleanup, {});
  },
});

export const wake = internalMutation({ args: {}, handler: async (ctx) => { await ensureSender(ctx); } });
