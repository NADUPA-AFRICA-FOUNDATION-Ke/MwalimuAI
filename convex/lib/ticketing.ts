import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { fail } from "./errors";

/** Shared rules for support tickets (learner side, visitor side and staff side use the same ones). */

export const statusV = v.union(v.literal("open"), v.literal("in_progress"), v.literal("pending_user"), v.literal("resolved"), v.literal("closed"));
export const priorityV = v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("urgent"));
export type Priority = "low" | "normal" | "high" | "urgent";

/** Target time to the first staff reply, by priority (shown to staff; see the staff guide). */
export const FIRST_RESPONSE_HOURS: Record<Priority, number> = { urgent: 4, high: 8, normal: 24, low: 72 };
/** Resolved tickets close (become read-only) this long after the last message. */
export const CLOSE_AFTER_MS = 7 * 86_400_000;

export const attachmentInput = v.array(v.object({ storageId: v.id("_storage"), name: v.string() }));
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_FILES = 3;
export const MAX_BYTES = 5 * 1024 * 1024;

/** Checks uploaded files against what the storage system recorded (type and size), not what the browser claimed. */
export async function checkAttachments(ctx: MutationCtx, files: { storageId: Id<"_storage">; name: string }[]) {
  if (files.length > MAX_FILES) throw fail("INVALID_ARGUMENT", `Attach up to ${MAX_FILES} files per message.`);
  const out = [];
  for (const f of files) {
    const meta = await ctx.db.system.get(f.storageId);
    if (!meta) throw fail("INVALID_ARGUMENT", "An attachment did not finish uploading. Please attach it again.");
    const type = meta.contentType ?? "";
    // (A refused upload cannot be deleted here: throwing undoes the whole transaction. Unused files are small.)
    if (!ALLOWED.includes(type)) {
      throw fail("INVALID_ARGUMENT", "Attach photos (JPG, PNG, WebP) or PDF files only.");
    }
    if (meta.size > MAX_BYTES) {
      throw fail("INVALID_ARGUMENT", "Each attachment must be 5 MB or smaller.");
    }
    out.push({ storageId: f.storageId, name: f.name.replace(/[^\w .()-]/g, "_").slice(0, 120) || "attachment", type, size: meta.size });
  }
  return out;
}

/** Messages as shown to people (not staff notes), with short-lived download addresses for their attachments. */
export async function publicMessages(ctx: QueryCtx, ticketId: Id<"tickets">, includeInternal = false) {
  const messages = await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", ticketId)).take(200);
  const out = [];
  for (const m of messages) {
    if (m.internal && !includeInternal) continue;
    const attachments = [];
    for (const a of m.attachments ?? []) attachments.push({ name: a.name, type: a.type, size: a.size, url: await ctx.storage.getUrl(a.storageId) });
    out.push({ _id: m._id, author: m.author, authorLabel: m.authorLabel, body: m.body, internal: m.internal, createdAt: m.createdAt, attachments });
  }
  return out;
}

export const searchTextFor = (t: { number: string; subject: string }, who: string) => `${t.number} ${t.subject} ${who}`.toLowerCase();

/** When the first staff reply is due, or null once someone has replied. */
export function firstResponseDue(t: Doc<"tickets">) {
  if (t.firstResponseAt) return null;
  return t.createdAt + FIRST_RESPONSE_HOURS[t.priority ?? "normal"] * 3_600_000;
}
