import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export type EmailKind = "ticket_reply" | "certificate" | "streak" | "weekly";
const PREF_KEY = { ticket_reply: "tickets", certificate: "certificates", streak: "streak", weekly: "weekly" } as const;
const BULK: EmailKind[] = ["streak", "weekly"]; // nudges are capped; transactional mail is not
const BULK_PER_DAY = 2;
const LEASE_MS = 60_000;

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
function secret() {
  const s = process.env.EMAIL_UNSUB_SECRET ?? process.env.ADMIN_MFA_ENC_KEY;
  if (!s) throw new Error("No secret available to sign unsubscribe links");
  return s;
}

/** A signed, tamper-proof token for one learner, used in unsubscribe links. */
export async function unsubscribeToken(profileId: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${profileId}:email-unsub`));
  return `${profileId}.${hex(sig).slice(0, 40)}`;
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  const [id] = token.split(".");
  if (!id) return null;
  const expected = await unsubscribeToken(id);
  // Constant-time-ish comparison.
  if (expected.length !== token.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0 ? id : null;
}

/**
 * Puts an email on the queue unless the learner opted out, is suspended, has no address, already got this exact
 * email (dedupeKey), or has hit the daily cap for nudges. Returns whether it was queued. Sending happens later,
 * paced, by `emails.drain`.
 */
export async function queueEmail(ctx: MutationCtx, args: { profileId: Id<"profiles">; kind: EmailKind; dedupeKey: string; data: Record<string, unknown> }) {
  const p = await ctx.db.get(args.profileId);
  if (!p?.email || p.status === "suspended" || p.status === "deactivated") return false;
  if (p.notificationPreferences?.email === false) return false;
  if (p.emailPrefs?.[PREF_KEY[args.kind]] === false) return false;
  if (await ctx.db.query("emailLog").withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey)).first()) return false;
  if (BULK.includes(args.kind)) {
    const recent = await ctx.db.query("emailLog").withIndex("by_profile_and_created_at", (q) => q.eq("profileId", p._id).gte("createdAt", Date.now() - 86_400_000)).take(10);
    if (recent.filter((r) => BULK.includes(r.kind) && r.status !== "skipped").length >= BULK_PER_DAY) return false;
  }
  await ctx.db.insert("emailLog", { profileId: p._id, kind: args.kind, dedupeKey: args.dedupeKey, to: p.email, data: args.data, status: "queued", attempts: 0, createdAt: Date.now() });
  await ensureSender(ctx);
  return true;
}

/** Starts the sender unless one is already running (a short lease, so a crashed run does not block forever). */
export async function ensureSender(ctx: MutationCtx) {
  const now = Date.now();
  const lease = await ctx.db.query("emailRuntime").first();
  if (lease && lease.leaseUntil > now) return;
  if (lease) await ctx.db.patch(lease._id, { leaseUntil: now + LEASE_MS });
  else await ctx.db.insert("emailRuntime", { leaseUntil: now + LEASE_MS });
  await ctx.scheduler.runAfter(0, internal.emails.drain, {});
}
