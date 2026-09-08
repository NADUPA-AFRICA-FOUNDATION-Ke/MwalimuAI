import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";
import { requireArrayLimit } from "./lib/validation";

const textSize = v.union(v.literal("normal"), v.literal("large"), v.literal("xlarge"), v.literal("xxlarge"));
const a11ySettings = v.object({ textSize, highContrast: v.boolean(), reduceMotion: v.boolean(), dyslexiaFont: v.boolean(), wideSpacing: v.boolean() });
const notificationState = v.object({ read: v.array(v.string()), dismissed: v.array(v.string()) });
const notificationPreferences = v.object({ course: v.boolean(), achievement: v.boolean(), community: v.boolean(), announcement: v.boolean(), email: v.boolean() });
const preferences = v.object({
  lang: v.union(v.literal("en"), v.literal("sw")), a11ySettings, lowBandwidth: v.boolean(), sidebarCollapsed: v.boolean(),
  notificationsState: notificationState, notificationPreferences,
});
const defaults = { course: true, achievement: true, community: true, announcement: true, email: true };

export const mine = query({
  args: {}, returns: preferences,
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    return { lang: profile.lang, a11ySettings: profile.a11ySettings, lowBandwidth: profile.lowBandwidth,
      sidebarCollapsed: profile.sidebarCollapsed, notificationsState: profile.notificationsState,
      notificationPreferences: profile.notificationPreferences ?? defaults };
  },
});

export const update = mutation({
  args: {
    lang: v.optional(v.union(v.literal("en"), v.literal("sw"))), a11ySettings: v.optional(a11ySettings),
    lowBandwidth: v.optional(v.boolean()), sidebarCollapsed: v.optional(v.boolean()),
    notificationsState: v.optional(notificationState), notificationPreferences: v.optional(notificationPreferences),
  },
  returns: preferences,
  handler: async (ctx, args) => {
    const profile = await requireCurrentProfile(ctx);
    if (args.notificationsState) {
      requireArrayLimit(args.notificationsState.read, "notificationsState.read", 1_000);
      requireArrayLimit(args.notificationsState.dismissed, "notificationsState.dismissed", 1_000);
    }
    await ctx.db.patch(profile._id, { ...args, updatedAt: Date.now() });
    return {
      lang: args.lang ?? profile.lang, a11ySettings: args.a11ySettings ?? profile.a11ySettings,
      lowBandwidth: args.lowBandwidth ?? profile.lowBandwidth, sidebarCollapsed: args.sidebarCollapsed ?? profile.sidebarCollapsed,
      notificationsState: args.notificationsState ?? profile.notificationsState,
      notificationPreferences: args.notificationPreferences ?? profile.notificationPreferences ?? defaults,
    };
  },
});
