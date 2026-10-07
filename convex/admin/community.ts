import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { staffMutation, staffQuery } from "../lib/staff";
import { notify } from "../lib/notices";
import { fail, notFound } from "../lib/errors";

const excerpt = (s: string, n = 400) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Marks every open report on a post (or one reply) as handled. */
async function closeReports(ctx: MutationCtx, postId: Id<"communityPosts">, commentId: Id<"communityComments"> | undefined, staffId: Id<"staff">, status: "actioned" | "dismissed") {
  const open = await ctx.db.query("communityReports").withIndex("by_post_and_status", (q) => q.eq("postId", postId).eq("status", "open")).take(200);
  let n = 0;
  for (const r of open) {
    if (commentId ? r.commentId !== commentId : r.commentId !== undefined) continue;
    await ctx.db.patch(r._id, { status, resolvedAt: Date.now(), resolvedBy: staffId });
    n++;
  }
  return n;
}

/** Open reports, newest first, grouped by what was reported so the same post is not listed ten times. */
export const reports = staffQuery({
  permission: "community.moderate",
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("communityReports").withIndex("by_status_and_created_at", (q) => q.eq("status", "open")).order("desc").take(300);
    const groups = new Map<string, { key: string; postId: Id<"communityPosts">; commentId?: Id<"communityComments">; reports: Doc<"communityReports">[] }>();
    for (const r of rows) {
      const key = `${r.postId}:${r.commentId ?? ""}`;
      const g = groups.get(key) ?? { key, postId: r.postId, commentId: r.commentId, reports: [] };
      g.reports.push(r);
      groups.set(key, g);
    }
    const out = [];
    for (const g of [...groups.values()].slice(0, 50)) {
      const post = await ctx.db.get(g.postId);
      const comment = g.commentId ? await ctx.db.get(g.commentId) : null;
      const author = comment ?? post;
      out.push({
        key: g.key,
        postId: g.postId,
        commentId: g.commentId ?? null,
        kind: g.commentId ? ("reply" as const) : ("post" as const),
        title: post?.title ?? "(removed)",
        text: excerpt(comment ? comment.body : (post?.content ?? "")),
        authorId: author?.userId ?? null,
        authorName: author?.authorName ?? "",
        county: post?.county ?? "",
        alreadyHidden: comment ? comment.hiddenAt !== undefined : post?.status === "hidden",
        count: g.reports.length,
        reasons: [...new Set(g.reports.map((r) => r.reason))],
        notes: g.reports.map((r) => r.note).filter((n): n is string => Boolean(n)).slice(0, 3),
        latestAt: g.reports[0].createdAt,
        reportIds: g.reports.map((r) => r._id),
      });
    }
    return out.sort((a, b) => b.count - a.count || b.latestAt - a.latestAt);
  },
});

/** Recent posts (active or hidden), for looking through the community without waiting for a report. */
export const posts = staffQuery({
  permission: "community.moderate",
  args: { status: v.union(v.literal("active"), v.literal("hidden")), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("communityPosts").withIndex("by_status_and_created_at", (q) => q.eq("status", args.status)).order("desc").paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((p) => ({
        _id: p._id, title: p.title, text: excerpt(p.content), category: p.category, authorId: p.userId, authorName: p.authorName,
        county: p.county, commentsCount: p.commentsCount, createdAt: p.createdAt, moderationReason: p.moderationReason ?? null,
      })),
    };
  },
});

export const thread = staffQuery({
  permission: "community.moderate",
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw notFound("Post");
    const comments = await ctx.db.query("communityComments").withIndex("by_post_and_created_at", (q) => q.eq("postId", postId)).order("asc").take(200);
    const imgs = async (list: Doc<"communityPosts">["images"]) => {
      const out = [];
      for (const im of list ?? []) out.push({ url: im.status === "removed" ? null : await ctx.storage.getUrl(im.storageId), alt: im.alt, status: im.status, removedReason: im.removedReason ?? null });
      return out;
    };
    const rows = [];
    for (const c of comments) rows.push({ _id: c._id, body: c.body, authorName: c.authorName, authorId: c.userId, hidden: c.hiddenAt !== undefined, createdAt: c.createdAt, images: await imgs(c.images) });
    return {
      post: { _id: post._id, title: post.title, content: post.content, authorName: post.authorName, authorId: post.userId, status: post.status, createdAt: post.createdAt, images: await imgs(post.images) },
      comments: rows,
    };
  },
});

export const hidePost = staffMutation({
  permission: "community.moderate",
  requireReason: true,
  args: { postId: v.id("communityPosts"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw notFound("Post");
    if (post.status !== "active") throw fail("NO_CHANGES", "That post is already hidden");
    await ctx.db.patch(post._id, { status: "hidden", moderatedAt: Date.now(), moderatedBy: staff._id, moderationReason: args.reason.trim() });
    const closed = await closeReports(ctx, post._id, undefined, staff._id, "actioned");
    await notify(ctx, post.userId, { title: "A post of yours was hidden", body: `“${excerpt(post.title, 80)}” was hidden by our team: ${args.reason.trim()}. Contact support if you think this was a mistake.`, link: "/dashboard/support" });
    await log({ action: "community.hide_post", targetType: "community_post", targetId: post._id, targetLabel: post.title, before: { status: "active" }, after: { status: "hidden", reportsClosed: closed } });
    return null;
  },
});

export const restorePost = staffMutation({
  permission: "community.moderate",
  requireReason: true,
  args: { postId: v.id("communityPosts"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw notFound("Post");
    if (post.status !== "hidden") throw fail("NO_CHANGES", "That post is not hidden");
    await ctx.db.patch(post._id, { status: "active", moderatedAt: undefined, moderatedBy: undefined, moderationReason: undefined });
    await log({ action: "community.restore_post", targetType: "community_post", targetId: post._id, targetLabel: post.title, before: { status: "hidden" }, after: { status: "active" } });
    return null;
  },
});

export const hideComment = staffMutation({
  permission: "community.moderate",
  requireReason: true,
  args: { commentId: v.id("communityComments"), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const c = await ctx.db.get(args.commentId);
    if (!c) throw notFound("Reply");
    if (c.hiddenAt !== undefined) throw fail("NO_CHANGES", "That reply is already hidden");
    await ctx.db.patch(c._id, { hiddenAt: Date.now(), hiddenBy: staff._id, hiddenReason: args.reason.trim() });
    const closed = await closeReports(ctx, c.postId, c._id, staff._id, "actioned");
    await notify(ctx, c.userId, { title: "A reply of yours was hidden", body: `Our team hid a reply: ${args.reason.trim()}. Contact support if you think this was a mistake.`, link: "/dashboard/support" });
    await log({ action: "community.hide_reply", targetType: "community_comment", targetId: c._id, targetLabel: excerpt(c.body, 60), after: { reportsClosed: closed } });
    return null;
  },
});

export const restoreComment = staffMutation({
  permission: "community.moderate",
  requireReason: true,
  args: { commentId: v.id("communityComments"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const c = await ctx.db.get(args.commentId);
    if (!c) throw notFound("Reply");
    if (c.hiddenAt === undefined) throw fail("NO_CHANGES", "That reply is not hidden");
    await ctx.db.patch(c._id, { hiddenAt: undefined, hiddenBy: undefined, hiddenReason: undefined });
    await log({ action: "community.restore_reply", targetType: "community_comment", targetId: c._id, targetLabel: excerpt(c.body, 60) });
    return null;
  },
});

/** The reports were reviewed and the content is fine. */
export const dismiss = staffMutation({
  permission: "community.moderate",
  requireReason: true,
  args: { postId: v.id("communityPosts"), commentId: v.optional(v.id("communityComments")), reason: v.string() },
  handler: async (ctx, args, { staff }, log) => {
    const closed = await closeReports(ctx, args.postId, args.commentId, staff._id, "dismissed");
    if (closed === 0) throw fail("NO_CHANGES", "There are no open reports on this");
    await log({ action: "community.dismiss_reports", targetType: args.commentId ? "community_comment" : "community_post", targetId: args.commentId ?? args.postId, after: { dismissed: closed } });
    return null;
  },
});

/** Take one photo down (the post or reply stays). The file is deleted; the author is told why. */
export const removeImage = staffMutation({
  permission: "community.moderate",
  requireReason: true,
  args: { postId: v.id("communityPosts"), commentId: v.optional(v.id("communityComments")), index: v.number(), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const doc = args.commentId ? await ctx.db.get(args.commentId) : await ctx.db.get(args.postId);
    if (!doc || (args.commentId && (doc as Doc<"communityComments">).postId !== args.postId)) throw notFound("Post");
    const im = doc.images?.[args.index];
    if (!im || im.status === "removed") throw fail("NO_CHANGES", "That photo is already removed");
    const images = [...doc.images!];
    images[args.index] = { ...im, status: "removed", removedReason: args.reason.trim() };
    await ctx.db.patch(doc._id, { images });
    await ctx.storage.delete(im.storageId);
    await notify(ctx, doc.userId, { title: "A photo of yours was removed", body: `Our team removed a photo: ${args.reason.trim()}. Contact support if you think this was a mistake.`, link: "/dashboard/support" });
    await log({ action: "community.remove_image", targetType: args.commentId ? "community_comment" : "community_post", targetId: doc._id, targetLabel: im.alt, before: { status: im.status }, after: { status: "removed" } });
    return null;
  },
});
