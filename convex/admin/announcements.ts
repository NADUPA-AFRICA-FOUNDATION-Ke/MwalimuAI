import { v } from "convex/values";
import { staffMutation, staffQuery } from "../lib/staff";
import { fail, notFound } from "../lib/errors";
import { canonicalCounty, canonicalLevel } from "../lib/taxonomy";

export const list = staffQuery({
  permission: "announcements.send",
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("announcements").withIndex("by_start").order("desc").take(50);
    const now = Date.now();
    return rows.map((a) => ({
      _id: a._id,
      title: a.title,
      body: a.body,
      link: a.link ?? null,
      audience: a.audience,
      startsAt: a.startsAt,
      endsAt: a.endsAt ?? null,
      createdAt: a.createdAt,
      state: a.cancelledAt !== undefined ? ("cancelled" as const) : a.startsAt > now ? ("scheduled" as const) : a.endsAt !== undefined && a.endsAt <= now ? ("ended" as const) : ("live" as const),
    }));
  },
});

export const send = staffMutation({
  permission: "announcements.send",
  args: {
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    all: v.boolean(),
    counties: v.array(v.string()),
    levels: v.array(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args, { staff }, log) => {
    const title = args.title.trim();
    const body = args.body.trim();
    if (title.length < 3 || title.length > 120) throw fail("INVALID_CONTENT", "Give the announcement a title of 3–120 characters");
    if (body.length < 5 || body.length > 600) throw fail("INVALID_CONTENT", "Write a message of 5–600 characters");
    const link = args.link?.trim() || undefined;
    if (link && !/^(\/[\w\-./?=&#%]*|https:\/\/[^\s]+)$/.test(link)) throw fail("INVALID_CONTENT", "The link must start with / or https://");
    const counties = args.counties.map((c) => canonicalCounty(c)).filter((c): c is string => Boolean(c));
    const levels = args.levels.map((l) => canonicalLevel(l)).filter((l): l is string => Boolean(l));
    if (!args.all && counties.length === 0 && levels.length === 0) throw fail("INVALID_CONTENT", "Choose who should receive this");
    const now = Date.now();
    const startsAt = args.startsAt && args.startsAt > now ? args.startsAt : now;
    if (args.endsAt !== undefined && args.endsAt <= startsAt) throw fail("INVALID_CONTENT", "The end time must be after the start");
    const id = await ctx.db.insert("announcements", {
      title, body, ...(link ? { link } : {}),
      audience: { all: args.all, counties: args.all ? [] : counties, levels: args.all ? [] : levels },
      startsAt, ...(args.endsAt !== undefined ? { endsAt: args.endsAt } : {}),
      createdBy: staff._id, createdAt: now,
    });
    await log({
      action: "announcement.send",
      targetType: "announcement",
      targetId: id,
      targetLabel: title,
      after: { all: args.all, counties, levels, startsAt, endsAt: args.endsAt ?? null },
    });
    return id;
  },
});

export const cancel = staffMutation({
  permission: "announcements.send",
  requireReason: true,
  args: { announcementId: v.id("announcements"), reason: v.string() },
  handler: async (ctx, args, _staff, log) => {
    const a = await ctx.db.get(args.announcementId);
    if (!a) throw notFound("Announcement");
    if (a.cancelledAt !== undefined) throw fail("NO_CHANGES", "Already cancelled");
    await ctx.db.patch(a._id, { cancelledAt: Date.now() });
    await log({ action: "announcement.cancel", targetType: "announcement", targetId: a._id, targetLabel: a.title });
    return null;
  },
});
