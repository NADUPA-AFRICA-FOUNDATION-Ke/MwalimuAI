import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentProfile } from "./lib/auth";
import { fail } from "./lib/errors";
import { notify } from "./lib/notices";
import { stripMetadata } from "./lib/imageSafety";

/**
 * Photos in community discussions. Server rules: JPEG/PNG/WebP only, 5 MB each, 4 per post and 2 per reply,
 * alt text required. After posting, each photo has its hidden metadata (GPS location etc.) removed and, when an
 * AI key is configured, is screened. Until then only the author sees it.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const imagesInput = v.array(v.object({ storageId: v.id("_storage"), alt: v.string() }));
type Img = NonNullable<Doc<"communityPosts">["images"]>[number];

export async function checkImages(ctx: MutationCtx, images: { storageId: Id<"_storage">; alt: string }[] | undefined, max: number): Promise<Img[]> {
  if (!images?.length) return [];
  if (images.length > max) throw fail("INVALID_ARGUMENT", `Up to ${max} photos here.`);
  const out: Img[] = [];
  for (const im of images) {
    const meta = await ctx.db.system.get(im.storageId);
    if (!meta) throw fail("INVALID_ARGUMENT", "A photo did not finish uploading. Remove it and try again.");
    if (!IMAGE_TYPES.includes(meta.contentType ?? "")) throw fail("INVALID_ARGUMENT", "Photos must be JPG, PNG or WebP.");
    if (meta.size > MAX_IMAGE_BYTES) throw fail("INVALID_ARGUMENT", "Each photo must be 5 MB or less.");
    const alt = im.alt.trim();
    if (alt.length < 3 || alt.length > 200) throw fail("INVALID_ARGUMENT", "Describe each photo in a few words (for teachers using screen readers).");
    out.push({ storageId: im.storageId, alt, status: "pending" });
  }
  return out;
}

/** Image addresses for a viewer: everyone sees "ok" photos; the author also sees their own pending ones. */
export async function shownImages(ctx: QueryCtx, images: Img[] | undefined, isAuthor: boolean) {
  const out = [];
  for (const im of images ?? []) {
    if (im.status === "removed" || (im.status === "pending" && !isAuthor)) continue;
    out.push({ url: await ctx.storage.getUrl(im.storageId), alt: im.alt, pending: im.status === "pending" });
  }
  return out;
}

export const uploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCurrentProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const target = v.union(v.object({ kind: v.literal("post"), id: v.id("communityPosts") }), v.object({ kind: v.literal("comment"), id: v.id("communityComments") }));

export const pending = internalQuery({
  args: { target },
  handler: async (ctx, { target }) => {
    const doc = await ctx.db.get(target.id);
    const out = [];
    for (const [index, im] of (doc?.images ?? []).entries()) out.push({ index, storageId: im.storageId, status: im.status, type: (await ctx.db.system.get(im.storageId))?.contentType ?? "" });
    return out;
  },
});

/** Strip metadata and screen each pending photo, then record the outcome. */
export const sanitize = internalAction({
  args: { target },
  handler: async (ctx, { target }) => {
    const items = await ctx.runQuery(internal.communityImages.pending, { target });
    for (const it of items) {
      if (it.status !== "pending") continue;
      const blob = await ctx.storage.get(it.storageId);
      if (!blob) { await ctx.runMutation(internal.communityImages.settle, { target, index: it.index, outcome: { removed: "The file could not be read." } }); continue; }
      const clean = stripMetadata(new Uint8Array(await blob.arrayBuffer()), it.type);
      if (!clean) { await ctx.runMutation(internal.communityImages.settle, { target, index: it.index, outcome: { removed: "The file is not a valid photo." } }); continue; }
      const newId = await ctx.storage.store(new Blob([clean as BlobPart], { type: it.type }));
      const verdict = await screen(await ctx.storage.getUrl(newId));
      await ctx.runMutation(internal.communityImages.settle, { target, index: it.index, outcome: verdict ? { removed: verdict, storageId: newId } : { storageId: newId } });
    }
  },
});

/**
 * Optional automated screening with a vision model. Returns a reason to remove, or null when the photo is fine
 * or screening is not configured (then staff rely on reports).
 */
async function screen(url: string | null): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || !url) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        max_tokens: 60,
        messages: [{ role: "user", content: [
          { type: "text", text: "You screen photos posted in a professional forum for Kenyan teachers. Reply with exactly one word: OK, or one of NUDITY, VIOLENCE, CHILD_FACE (a clearly identifiable child's face), PERSONAL_DATA (readable ID card, phone number list, learner names with marks), HATE. Classroom work, documents and diagrams are OK." },
          { type: "image_url", image_url: { url } },
        ] }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const word = String((await res.json())?.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
    const reasons: Record<string, string> = {
      NUDITY: "It appears to contain nudity.", VIOLENCE: "It appears to show violence.", HATE: "It appears to contain hateful content.",
      CHILD_FACE: "It appears to show a child's face. Please crop or blur learners' faces.", PERSONAL_DATA: "It appears to show personal information, such as names with marks or ID details.",
    };
    const hit = Object.keys(reasons).find((k) => word.startsWith(k));
    return hit ? reasons[hit] : null;
  } catch {
    return null; // a screening outage must not block teachers; reports still work
  }
}

export const settle = internalMutation({
  args: { target, index: v.number(), outcome: v.object({ storageId: v.optional(v.id("_storage")), removed: v.optional(v.string()) }) },
  handler: async (ctx, { target, index, outcome }) => {
    const doc = await ctx.db.get(target.id);
    if (!doc?.images?.[index]) { if (outcome.storageId) await ctx.storage.delete(outcome.storageId); return; }
    const images = [...doc.images];
    const old = images[index];
    if (outcome.storageId) await ctx.storage.delete(old.storageId);
    images[index] = { ...old, ...(outcome.storageId ? { storageId: outcome.storageId } : {}), status: outcome.removed ? "removed" : "ok", ...(outcome.removed ? { removedReason: outcome.removed } : {}) };
    await ctx.db.patch(doc._id, { images });
    if (outcome.removed) {
      const postId = target.kind === "post" ? target.id : (doc as Doc<"communityComments">).postId;
      await notify(ctx, doc.userId, { title: "A photo was not published", body: `${outcome.removed} The rest of your ${target.kind === "post" ? "post" : "reply"} is published.`, link: "/dashboard/community" });
      await ctx.db.insert("staffNotices", { kind: "image_flagged", title: "Photo removed by automatic screening", body: `${outcome.removed} Check the thread in Community moderation.`, link: `/admin/community?post=${postId}`, createdAt: Date.now() });
    }
  },
});
