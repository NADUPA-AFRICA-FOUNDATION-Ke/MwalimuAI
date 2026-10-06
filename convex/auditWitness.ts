import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { auditHashInput, GENESIS_HASH, sha256Hex } from "./lib/audit";

const PAGE = 200;

/**
 * Re-checks the audit chain since the last checkpoint and records a new one. A copy of the result is emailed to the
 * Super Admins: an attacker with database access cannot reach those emails, so rewriting or deleting history leaves
 * a mismatch the next check finds. Runs daily; can also be run by hand.
 */
export const check = internalMutation({
  args: {
    // Internal state for continuing across pages.
    prevHash: v.optional(v.string()),
    afterCreatedAt: v.optional(v.number()),
    cursor: v.optional(v.string()),
    checked: v.optional(v.number()),
    started: v.optional(v.boolean()),
    // Re-walk the whole chain from the first entry (weekly), not just what is new.
    full: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const last = await ctx.db.query("auditCheckpoints").withIndex("by_at").order("desc").first();
    let prev = args.prevHash ?? (args.full ? GENESIS_HASH : (last?.headHash ?? GENESIS_HASH));
    let after = args.afterCreatedAt ?? (args.full ? undefined : last?.headCreatedAt);
    const broken = async (note: string) => {
      const head = await ctx.db.query("auditLog").withIndex("by_created_at").order("desc").first();
      await ctx.db.insert("auditCheckpoints", { at: Date.now(), headHash: head?.hash ?? GENESIS_HASH, headCreatedAt: head?.createdAt ?? 0, newRows: args.checked ?? 0, status: "broken", note });
      await ctx.scheduler.runAfter(0, internal.auditWitness.notify, { status: "broken", note, rows: args.checked ?? 0, headHash: head?.hash ?? GENESIS_HASH });
    };

    // First page of a run: the row the last checkpoint ended on must still exist, unchanged.
    if (!args.started && last) {
      const anchor = await ctx.db.query("auditLog").withIndex("by_created_at", (q) => q.eq("createdAt", last.headCreatedAt)).first();
      if (!anchor || anchor.hash !== last.headHash) return await broken("The entry the last checkpoint ended on is missing or was changed.");
    }

    const page = await ctx.db
      .query("auditLog")
      .withIndex("by_created_at", (q) => (after === undefined ? q : q.gt("createdAt", after!)))
      .order("asc")
      .paginate({ numItems: PAGE, cursor: args.cursor ?? null });
    let checked = args.checked ?? 0;
    for (const row of page.page) {
      const expected = await sha256Hex(auditHashInput(prev, row));
      if (row.prevHash !== prev || row.hash !== expected) return await broken(`The chain breaks at an entry for “${row.action}”.`);
      prev = row.hash;
      after = row.createdAt;
      checked++;
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.auditWitness.check, { prevHash: prev, afterCreatedAt: after, cursor: page.continueCursor, checked, started: true, ...(args.full ? { full: true } : {}) });
      return;
    }
    const head = await ctx.db.query("auditLog").withIndex("by_created_at").order("desc").first();
    const headHash = head?.hash ?? GENESIS_HASH;
    await ctx.db.insert("auditCheckpoints", { at: Date.now(), headHash, headCreatedAt: head?.createdAt ?? 0, newRows: checked, status: "ok" });
    await ctx.scheduler.runAfter(0, internal.auditWitness.notify, { status: "ok", rows: checked, headHash });
  },
});

export const recipients = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("staff").take(200)).filter((s) => s.role === "super_admin" && s.status === "active").map((s) => s.email),
});

export const notify = internalAction({
  args: { status: v.union(v.literal("ok"), v.literal("broken")), rows: v.number(), headHash: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { status, rows, headHash, note }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const to = await ctx.runQuery(internal.auditWitness.recipients, {});
    if (!apiKey || to.length === 0) return;
    const ok = status === "ok";
    const subject = ok ? "Mwalimu AI audit log checkpoint: all good" : "ALERT: Mwalimu AI audit log may have been tampered with";
    const text = ok
      ? `The staff audit log was re-checked and is intact.\n\nNew entries since the last check: ${rows}\nLatest entry fingerprint: ${headHash}\n\nKeep these emails. They are an independent record: if history in the database is ever edited or deleted, the next check will no longer match the fingerprint above.`
      : `The daily check of the staff audit log FAILED.\n\n${note ?? ""}\n\nThis can mean someone with database access edited or removed audit entries. Review who has deploy and dashboard access, rotate the Convex deploy key, and compare against earlier checkpoint emails.\n\nLatest fingerprint seen: ${headHash}`;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM ?? "Mwalimu AI <onboarding@resend.dev>", to, subject, text }),
      });
    } catch {
      /* the checkpoint is still stored; the admin page shows it */
    }
  },
});
