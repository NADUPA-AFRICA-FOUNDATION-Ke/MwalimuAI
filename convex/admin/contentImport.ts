import { v } from "convex/values";
import type { DatabaseReader } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { staffMutation, staffQuery } from "../lib/staff";
import { validateContent, type ContentKind } from "../lib/contentValidation";
import { insertItem, writeDraftData } from "../lib/contentWrite";
import { fail } from "../lib/errors";

/**
 * Spreadsheet import. The browser reads the workbook and sends content items here; this file re-validates every one,
 * decides whether it is new, changed or unchanged, and (only when everything is valid) saves them as DRAFTS in one
 * transaction. Nothing goes live: the normal review and publish steps still apply. Uploading never deletes or archives.
 */
const kindV = v.union(v.literal("program"), v.literal("module"), v.literal("lesson"), v.literal("quiz"), v.literal("assessment"), v.literal("resources"), v.literal("faq"), v.literal("post"));
const refV = v.object({ kind: kindV, key: v.string() });
const itemV = v.object({ kind: kindV, key: v.string(), parent: v.optional(refV), data: v.any() });
const ROOT = new Set<ContentKind>(["program", "assessment", "resources", "faq", "post"]);
const KEY = /^[a-z0-9][a-z0-9-]{0,59}$/;
const MAX_ITEMS = 300;
const NEEDS_KEY = "needs-assessment";

type Incoming = { kind: ContentKind; key: string; parent?: { kind: ContentKind; key: string }; data: Record<string, any> };
type Status = "new" | "changed" | "unchanged" | "blocked";
type Planned = { kind: ContentKind; key: string; parentRef?: string; programKey: string; existing: Doc<"cmsItems"> | null; data: any; status: Status; note?: string };
type Problem = { kind: ContentKind; key: string; message: string };

const stable = (x: unknown): string =>
  JSON.stringify(x, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1))) : val));
const refKey = (kind: ContentKind, key: string) => `${kind}:${key}`;
const messageOf = (e: unknown) => (e as { data?: { message?: string } }).data?.message ?? (e instanceof Error ? e.message : "Not valid");

/** Fields the spreadsheet does not carry (tags of lessons, a program's accent, files attached to resources) are kept from the existing item. */
function merge(kind: ContentKind, incoming: Record<string, any>, current: Record<string, any> | null) {
  const out: Record<string, any> = { ...incoming };
  if (!current) return out;
  for (const k of Object.keys(current)) if (!(k in out)) out[k] = current[k];
  if (kind === "resources" && Array.isArray(incoming.items) && Array.isArray(current.items)) {
    const old = new Map<string, any>(current.items.map((r: any) => [r.id, r]));
    out.items = incoming.items.map((r: any) => (old.get(r.id)?.file ? { ...r, file: old.get(r.id).file } : r));
  }
  return out;
}

const countOf = (kind: ContentKind, d: any) =>
  kind === "resources" ? (d?.items?.length ?? 0) : kind === "faq" ? (d?.sections ?? []).reduce((n: number, s: any) => n + (s.items?.length ?? 0), 0) : 0;

async function currentData(db: DatabaseReader, i: Doc<"cmsItems">) {
  const draft = i.draftVersionId ? await db.get(i.draftVersionId) : null;
  const live = i.publishedVersionId ? await db.get(i.publishedVersionId) : null;
  return { draft, live, data: (draft ?? live)?.data as Record<string, any> | null };
}

async function plan(db: DatabaseReader, items: Incoming[]): Promise<{ planned: Planned[]; problems: Problem[] }> {
  const planned: Planned[] = [];
  const problems: Problem[] = [];
  const docs = new Map<string, Doc<"cmsItems"> | null>(); // bundle ref -> existing doc (null when new)
  const programOf = new Map<string, string>();
  const nextOrder = new Map<ContentKind, number>();
  const seen = new Set<string>();

  for (const it of items) {
    const ref = refKey(it.kind, it.key);
    const bad = (message: string) => problems.push({ kind: it.kind, key: it.key, message });
    if (!KEY.test(it.key)) {
      bad(`“${it.key}” is not a valid ID (lowercase letters, numbers and dashes).`);
      continue;
    }
    if (seen.has(ref)) {
      bad("This ID appears twice in the upload.");
      continue;
    }
    seen.add(ref);
    let programKey = it.key;
    let parentDoc: Doc<"cmsItems"> | null = null;
    let parentNew = false;
    let parentRef: string | undefined;
    if (ROOT.has(it.kind)) {
      if (it.parent) {
        bad(`A ${it.kind} has no parent.`);
        continue;
      }
    } else {
      const expected: Partial<Record<ContentKind, ContentKind>> = { module: "program", lesson: "module", quiz: "program" };
      if (!it.parent || it.parent.kind !== expected[it.kind]) {
        bad(`A ${it.kind} must belong to a ${expected[it.kind]}.`);
        continue;
      }
      parentRef = refKey(it.parent.kind, it.parent.key);
      if (!docs.has(parentRef)) {
        bad(`Its ${it.parent.kind} “${it.parent.key}” is not in the upload.`);
        continue;
      }
      parentDoc = docs.get(parentRef) ?? null;
      parentNew = parentDoc === null;
      programKey = programOf.get(parentRef)!;
      if (parentDoc?.archivedAt !== undefined && parentDoc) {
        bad(`Its ${it.parent.kind} is archived. Unarchive it in the studio first.`);
        docs.set(ref, null);
        programOf.set(ref, programKey);
        continue;
      }
    }
    programOf.set(ref, programKey);

    let existing: Doc<"cmsItems"> | null = null;
    if (ROOT.has(it.kind)) {
      existing = await db.query("cmsItems").withIndex("by_program_and_key", (q) => q.eq("programKey", it.key).eq("kind", it.kind).eq("key", it.key)).first();
    } else if (!parentNew) {
      const siblings = await db.query("cmsItems").withIndex("by_parent", (q) => q.eq("parentId", parentDoc!._id)).take(300);
      existing = siblings.find((s) => s.kind === it.kind && s.key === it.key) ?? null;
    }
    docs.set(ref, existing);

    const cur = existing ? await currentData(db, existing) : null;
    const merged = merge(it.kind, it.data, cur?.data ?? null);
    if (merged.orderIndex === undefined) {
      if (existing) merged.orderIndex = existing.orderIndex;
      else {
        if (!nextOrder.has(it.kind)) {
          const same = await db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", it.kind)).take(300);
          nextOrder.set(it.kind, same.reduce((n, s) => Math.max(n, s.orderIndex + 1), 0));
        }
        merged.orderIndex = nextOrder.get(it.kind)!;
        nextOrder.set(it.kind, merged.orderIndex + 1);
      }
    }
    let data: any;
    try {
      data = validateContent(it.kind, merged, true);
    } catch (e) {
      bad(messageOf(e));
      continue;
    }

    let status: Status = "new";
    let note: string | undefined;
    if (existing) {
      let same = false;
      if (cur?.data) {
        try {
          same = stable(validateContent(it.kind, cur.data, true)) === stable(data);
        } catch {
          same = false;
        }
      }
      const draftStatus = cur?.draft?.status;
      if (existing.archivedAt !== undefined) {
        status = "blocked";
        note = "Archived. Unarchive it in the studio before uploading changes.";
      } else if (same) status = "unchanged";
      else if (draftStatus === "in_review" || draftStatus === "approved") {
        status = "blocked";
        note = draftStatus === "in_review" ? "Awaiting review. Withdraw it in the studio to keep editing." : "Already approved. Publish it, or discard it, first.";
      } else status = "changed";
      if (status === "changed" && (it.kind === "resources" || it.kind === "faq")) {
        const before = countOf(it.kind, cur?.data), after = countOf(it.kind, data);
        note = `Replaces the current ${before} ${it.kind === "faq" ? "questions" : "resources"} with ${after}.${after < before ? ` ${before - after} will be removed from the draft.` : ""}`;
      }
    }
    if (status === "blocked") bad(note!);
    planned.push({ kind: it.kind, key: it.key, parentRef, programKey, existing, data, status, note });
  }
  return { planned, problems };
}

const summary = (planned: Planned[]) => ({
  created: planned.filter((p) => p.status === "new").length,
  updated: planned.filter((p) => p.status === "changed").length,
  unchanged: planned.filter((p) => p.status === "unchanged").length,
  blocked: planned.filter((p) => p.status === "blocked").length,
});

function checkBundle(items: unknown[]) {
  if (items.length === 0) throw fail("INVALID_CONTENT", "The upload has nothing to save.");
  if (items.length > MAX_ITEMS) throw fail("INVALID_CONTENT", `An upload can hold up to ${MAX_ITEMS} items. Split it into smaller files.`);
}

/** What an upload would do, without saving anything. */
export const preview = staffQuery({
  permission: "content.edit",
  args: { items: v.array(itemV) },
  handler: async (ctx, args) => {
    checkBundle(args.items);
    const { planned, problems } = await plan(ctx.db, args.items as Incoming[]);
    return { items: planned.map((p) => ({ kind: p.kind, key: p.key, status: p.status, note: p.note })), problems, ...summary(planned) };
  },
});

/** Saves the upload as drafts, all or nothing. */
export const apply = staffMutation({
  permission: "content.edit",
  requireReason: true,
  args: { items: v.array(itemV), reason: v.string(), filename: v.optional(v.string()) },
  handler: async (ctx, args, { staff }, log) => {
    checkBundle(args.items);
    const { planned, problems } = await plan(ctx.db, args.items as Incoming[]);
    if (problems.length) throw fail("INVALID_CONTENT", `Nothing was saved. ${problems[0].key}: ${problems[0].message}${problems.length > 1 ? ` (and ${problems.length - 1} more)` : ""}`);
    const ids = new Map<string, Doc<"cmsItems">>();
    for (const p of planned) {
      const parent = p.parentRef ? (ids.get(p.parentRef) ?? null) : null;
      if (p.parentRef && !parent) throw fail("INVALID_STATE", "A parent was not saved. Nothing was changed.");
      if (p.status === "new") {
        const id = await insertItem(ctx, staff._id, { kind: p.kind, key: p.key, parent, data: p.data });
        ids.set(refKey(p.kind, p.key), (await ctx.db.get(id as Id<"cmsItems">))!);
      } else {
        if (p.status === "changed") await writeDraftData(ctx, staff._id, p.existing!, p.data);
        ids.set(refKey(p.kind, p.key), (await ctx.db.get(p.existing!._id))!);
      }
    }
    const counts = summary(planned);
    const root = planned.find((p) => ROOT.has(p.kind)) ?? planned[0];
    await log({
      action: "content.import",
      targetType: "content",
      targetId: root.key,
      targetLabel: `${root.kind}:${root.key}`,
      after: { file: args.filename ?? null, ...counts, items: planned.filter((p) => p.status === "new" || p.status === "changed").slice(0, 60).map((p) => `${p.status} ${p.kind}:${p.key}`) },
    });
    return { ...counts, programKey: planned.find((p) => p.kind === "program")?.key ?? null };
  },
});

/** The current working copy (draft, else live) of a content area, shaped like an upload, to pre-fill a template. */
export const exportItems = staffQuery({
  permission: "content.read",
  args: { what: v.union(v.literal("path"), v.literal("needs"), v.literal("posts"), v.literal("resources"), v.literal("faq")), key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const roots: Doc<"cmsItems">[] = [];
    if (args.what === "path") {
      if (!args.key) throw fail("INVALID_CONTENT", "Choose a learning path");
      const all = await ctx.db.query("cmsItems").withIndex("by_program_and_key", (q) => q.eq("programKey", args.key!)).take(500);
      if (!all.some((i) => i.kind === "program")) throw fail("NOT_FOUND", "Learning path not found");
      const keyOf = new Map(all.map((i) => [i._id, i]));
      const out = [];
      for (const i of all.filter((x) => x.archivedAt === undefined)) {
        const { data } = await currentData(ctx.db, i);
        if (!data) continue;
        const parent = i.parentId ? keyOf.get(i.parentId) : undefined;
        out.push({ kind: i.kind, key: i.key, ...(parent ? { parent: { kind: parent.kind, key: parent.key } } : {}), data });
      }
      return out;
    }
    if (args.what === "posts") roots.push(...(await ctx.db.query("cmsItems").withIndex("by_kind_and_program", (q) => q.eq("kind", "post")).take(300)));
    else {
      const kind = args.what === "needs" ? "assessment" : args.what;
      const key = args.what === "needs" ? NEEDS_KEY : args.what;
      const one = await ctx.db.query("cmsItems").withIndex("by_program_and_key", (q) => q.eq("programKey", key).eq("kind", kind).eq("key", key)).first();
      if (one) roots.push(one);
    }
    const out = [];
    for (const i of roots.filter((x) => x.archivedAt === undefined)) {
      const { data } = await currentData(ctx.db, i);
      if (data) out.push({ kind: i.kind, key: i.key, data });
    }
    return out;
  },
});
