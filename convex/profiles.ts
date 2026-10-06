import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assertProfileActive, getCurrentProfile, requireIdentity, sessionIdOf } from "./lib/auth";
import { buildSearchText } from "./lib/profileSearch";

const profileFields = {
  name: v.optional(v.string()),
  school: v.optional(v.string()),
  county: v.optional(v.string()),
  subjects: v.optional(v.array(v.string())),
  grades: v.optional(v.array(v.string())),
  cbcLevel: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
  lang: v.optional(v.union(v.literal("en"), v.literal("sw"))),
  completed: v.optional(v.boolean()),
  lowBandwidth: v.optional(v.boolean()),
  sidebarCollapsed: v.optional(v.boolean()),
  activeSessionId: v.optional(v.string()),
};

export const me = query({
  args: {},
  handler: async (ctx) => {
    const { identity, profile } = await getCurrentProfile(ctx);
    if (!profile) return null;
    // Whether THIS session holds the account, and which tab of it does. The app signs out or locks itself from this.
    const session = { isActive: !profile.activeAuthSession || profile.activeAuthSession === sessionIdOf(identity), claimed: Boolean(profile.activeAuthSession), activeTabId: profile.activeTabId ?? null };
    return { ...profile, session };
  },
});

export const findMigratedByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email.toLowerCase())).unique();
  },
});

export const provisionMigrated = internalMutation({
  args: { legacyUserId: v.string(), email: v.string() },
  handler: async (ctx, { legacyUserId, email }) => {
    const existing = await ctx.db.query("profiles").withIndex("by_legacy_supabase_user_id", (q) => q.eq("legacySupabaseUserId", legacyUserId)).unique();
    if (existing) return existing._id;
    return await ctx.db.insert("profiles", {
      tokenIdentifier: `migrated|${legacyUserId}`, authSubject: `migrated|${legacyUserId}`, legacySupabaseUserId: legacyUserId,
      migrationStatus: "pending", email: email.toLowerCase(), subjects: [], grades: [], cbcLevel: "beginner", lang: "en", completed: false,
      a11ySettings: { textSize: "normal", highContrast: false, reduceMotion: false, dyslexiaFont: false, wideSpacing: false },
      lowBandwidth: false, notificationsState: { read: [], dismissed: [] }, sidebarCollapsed: false, updatedAt: Date.now(),
      searchText: buildSearchText({ email }),
    });
  },
});

export const upsert = mutation({
  args: profileFields,
  handler: async (ctx, args) => {
    const { identity, profile: existing } = await getCurrentProfile(ctx);
    if (existing) assertProfileActive(existing);
    const now = Date.now();
    const values = {
      tokenIdentifier: identity.tokenIdentifier,
      authSubject: identity.subject.split("|")[0],
      email: identity.email ?? existing?.email,
      subjects: args.subjects ?? existing?.subjects ?? [],
      grades: args.grades ?? existing?.grades ?? [],
      cbcLevel: args.cbcLevel ?? existing?.cbcLevel ?? "beginner" as const,
      lang: args.lang ?? existing?.lang ?? "en" as const,
      completed: args.completed ?? existing?.completed ?? false,
      a11ySettings: existing?.a11ySettings ?? { textSize: "normal" as const, highContrast: false, reduceMotion: false, dyslexiaFont: false, wideSpacing: false },
      lowBandwidth: args.lowBandwidth ?? existing?.lowBandwidth ?? false,
      notificationsState: existing?.notificationsState ?? { read: [], dismissed: [] },
      sidebarCollapsed: args.sidebarCollapsed ?? existing?.sidebarCollapsed ?? false,
      updatedAt: now,
      ...(args.name !== undefined ? { name: args.name } : existing?.name !== undefined ? { name: existing.name } : {}),
      ...(args.school !== undefined ? { school: args.school } : existing?.school !== undefined ? { school: existing.school } : {}),
      ...(args.county !== undefined ? { county: args.county } : existing?.county !== undefined ? { county: existing.county } : {}),
      ...(args.activeSessionId !== undefined ? { activeSessionId: args.activeSessionId } : existing?.activeSessionId !== undefined ? { activeSessionId: existing.activeSessionId } : {}),
    };
    const withSearch = { ...values, searchText: buildSearchText({
      name: values.name, email: values.email, school: values.school, phoneNormalized: existing?.phoneNormalized,
    }) };
    if (existing) { await ctx.db.patch(existing._id, withSearch); return existing._id; }
    return await ctx.db.insert("profiles", withSearch);
  },
});

export const linkMigratedIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const existing = (await getCurrentProfile(ctx)).profile;
    if (!existing) return null;
    await ctx.db.patch(existing._id, {
      tokenIdentifier: identity.tokenIdentifier,
      authSubject: identity.subject.split("|")[0],
      email: identity.email ?? existing.email,
      migrationStatus: "linked",
      updatedAt: Date.now(),
    });
    return existing._id;
  },
});

// Compatibility entry point used by the client preference helpers.
export const updatePreferences = mutation({
  args: {
    lang: v.optional(v.union(v.literal("en"), v.literal("sw"))),
    a11ySettings: v.optional(v.any()), lowBandwidth: v.optional(v.boolean()),
    sidebarCollapsed: v.optional(v.boolean()), notificationsState: v.optional(v.any()),
    notificationPreferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const profile = await requireIdentity(ctx).then(async (identity) =>
      (await getCurrentProfile(ctx)).profile ??
      (() => { throw new Error("Profile not provisioned") })());
    assertProfileActive(profile);
    await ctx.db.patch(profile._id, { ...args, updatedAt: Date.now() });
    return profile._id;
  },
});
