import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { api, internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { assertReason, requireStaff, staffMutation, staffQuery } from "../lib/staff";
import { writeAudit } from "../lib/audit";
import { buildSearchText, normalizePhone } from "../lib/profileSearch";
import { fail, notFound } from "../lib/errors";
import { notify } from "../lib/notices";

const lightProfile = (p: Doc<"profiles">) => ({
  _id: p._id,
  name: p.name,
  email: p.email,
  phone: p.phoneNormalized,
  school: p.school,
  county: p.county,
  status: p.status ?? "active",
  createdAt: p._creationTime,
  completed: p.completed,
});

/**
 * Indexed lookups only: exact email, exact phone, or the profiles search index
 * (name/email/phone/school). With no query it browses newest-first. Never scans.
 */
export const search = staffQuery({
  permission: "users.read",
  args: {
    query: v.optional(v.string()),
    county: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("suspended"), v.literal("deactivated"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const q = args.query?.trim().toLowerCase() ?? "";
    if (q.length > 0) {
      if (q.includes("@")) {
        const exact = await ctx.db
          .query("profiles")
          .withIndex("by_email", (i) => i.eq("email", q))
          .take(10);
        if (exact.length > 0) return { page: exact.map(lightProfile), isDone: true, continueCursor: "" };
      } else if (/^[+\d][\d\s().+-]{6,}$/.test(q)) {
        let phone: string | undefined;
        try {
          phone = normalizePhone(q);
        } catch {
          phone = undefined;
        }
        if (phone) {
          const exact = await ctx.db
            .query("profiles")
            .withIndex("by_phone_normalized", (i) => i.eq("phoneNormalized", phone))
            .take(10);
          if (exact.length > 0) return { page: exact.map(lightProfile), isDone: true, continueCursor: "" };
        }
      }
      const result = await ctx.db
        .query("profiles")
        .withSearchIndex("search_profiles", (s) => {
          let b = s.search("searchText", q);
          if (args.county) b = b.eq("county", args.county);
          if (args.status) b = b.eq("status", args.status);
          return b;
        })
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(lightProfile) };
    }
    if (args.county) {
      throw fail("INVALID_ARGUMENT", "Enter a name, email or phone to filter by county");
    }
    const result = args.status
      ? await ctx.db
          .query("profiles")
          .withIndex("by_status", (i) => i.eq("status", args.status!))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db.query("profiles").order("desc").paginate(args.paginationOpts);
    return { ...result, page: result.page.map(lightProfile) };
  },
});

export const get = staffQuery({
  permission: "users.read",
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const p = await ctx.db.get(profileId);
    if (!p) throw notFound("User");
    const [certificates, progress, subscription] = await Promise.all([
      ctx.db
        .query("certificates")
        .withIndex("by_user", (q) => q.eq("userId", p._id))
        .take(50),
      ctx.db
        .query("learningProgress")
        .withIndex("by_user", (q) => q.eq("userId", p._id))
        .take(100),
      ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", p._id))
        .first(),
    ]);
    // Journals, AI chats and password material are deliberately not exposed here.
    return {
      profile: {
        ...lightProfile(p),
        subjects: p.subjects,
        grades: p.grades,
        cbcLevel: p.cbcLevel,
        lang: p.lang,
        statusReason: p.statusReason,
        statusChangedAt: p.statusChangedAt,
        migrated: Boolean(p.legacySupabaseUserId),
      },
      certificates: certificates.map((c) => ({
        _id: c._id,
        serial: c.serial,
        programId: c.programId,
        programTitle: c.programTitle,
        earnedAt: c.earnedAt,
        revokedAt: c.revokedAt,
        revocationReason: c.revocationReason,
      })),
      progress: progress.map((r) => ({
        programId: r.programId,
        lessonsCompleted: r.completedLessons.length,
        postScore: r.postAssessment ? `${r.postAssessment.score}/${r.postAssessment.total}` : null,
        certificateSerial: r.certificateSerial,
      })),
      plan: subscription
        ? { plan: subscription.plan, status: subscription.status }
        : { plan: "free", status: "active" },
    };
  },
});

// Identity (email, tokens, auth ids), passwords and certificates are intentionally not editable here.
export const updateProfile = staffMutation({
  permission: "profiles.edit",
  requireReason: true,
  args: {
    profileId: v.id("profiles"),
    name: v.optional(v.string()),
    school: v.optional(v.string()),
    county: v.optional(v.string()),
    phone: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    grades: v.optional(v.array(v.string())),
    lang: v.optional(v.union(v.literal("en"), v.literal("sw"))),
    cbcLevel: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
    reason: v.string(),
  },
  handler: async (ctx, args, _staff, log) => {
    const p = await ctx.db.get(args.profileId);
    if (!p) throw notFound("User");
    const patch: Partial<Doc<"profiles">> = {};
    const before: Record<string, unknown> = {},
      after: Record<string, unknown> = {};
    const setField = <K extends "name" | "school" | "county" | "subjects" | "grades" | "lang" | "cbcLevel">(
      key: K,
      value: Doc<"profiles">[K] | undefined,
    ) => {
      if (value === undefined || JSON.stringify(value) === JSON.stringify(p[key])) return;
      (patch as Record<string, unknown>)[key] = value;
      before[key] = p[key] ?? null;
      after[key] = value;
    };
    const text = (x: string | undefined, max = 200) => (x === undefined ? undefined : x.trim().slice(0, max));
    setField("name", text(args.name));
    setField("school", text(args.school));
    setField("county", text(args.county, 60));
    setField(
      "subjects",
      args.subjects?.slice(0, 30).map((s) => s.trim()),
    );
    setField(
      "grades",
      args.grades?.slice(0, 30).map((s) => s.trim()),
    );
    setField("lang", args.lang);
    setField("cbcLevel", args.cbcLevel);
    if (args.phone !== undefined) {
      const normalized = args.phone.trim() === "" ? undefined : normalizePhone(args.phone);
      if (normalized !== p.phoneNormalized) {
        before.phone = p.phoneNormalized ?? null;
        after.phone = normalized ?? null;
        patch.phone = normalized;
        patch.phoneNormalized = normalized;
      }
    }
    if (Object.keys(after).length === 0) throw fail("NO_CHANGES", "Nothing to change");
    const merged = { ...p, ...patch };
    await ctx.db.patch(p._id, { ...patch, searchText: buildSearchText(merged), updatedAt: Date.now() });
    await notify(ctx, p._id, {
      title: "Support updated your profile",
      body: `Changed: ${Object.keys(after).map((k) => (k === "cbcLevel" ? "experience level" : k)).join(", ")}. Check Settings if something looks wrong.`,
      link: "/dashboard/settings",
    });
    await log({
      action: "profile.update",
      targetType: "profile",
      targetId: p._id,
      targetLabel: p.email ?? p.name,
      before,
      after,
    });
    return null;
  },
});

export const setStatus = staffMutation({
  permission: "accounts.suspend",
  requireReason: true,
  args: {
    profileId: v.id("profiles"),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deactivated")),
    reason: v.string(),
  },
  handler: async (ctx, args, _staff, log) => {
    const p = await ctx.db.get(args.profileId);
    if (!p) throw notFound("User");
    const current = p.status ?? "active";
    if (current === args.status) throw fail("NO_CHANGES", `Account is already ${current}`);
    await ctx.db.patch(p._id, {
      status: args.status,
      statusReason: args.reason.trim(),
      statusChangedAt: Date.now(),
      ...(args.status !== "active" ? { activeSessionId: undefined } : {}),
      updatedAt: Date.now(),
    });
    let sessionsRevoked = 0;
    if (args.status !== "active") {
      // Kill sign-in sessions so suspension takes effect immediately, not at token expiry.
      const userId = ctx.db.normalizeId("users", p.authSubject);
      if (userId) {
        for (const session of await ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", userId))
          .take(100)) {
          for (const t of await ctx.db
            .query("authRefreshTokens")
            .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
            .take(100)) {
            await ctx.db.delete(t._id);
          }
          await ctx.db.delete(session._id);
          sessionsRevoked++;
        }
      }
    }
    // Suspended learners can't sign in, so this mainly serves reactivation; it is also kept for their return.
    await notify(ctx, p._id, {
      title: args.status === "active" ? "Your account was reactivated" : "Your account was suspended",
      body: args.status === "active" ? "You can use Mwalimu AI again." : `Reason: ${args.reason.trim()}. Contact support if you think this is a mistake.`,
      link: "/support",
    });
    await log({
      action: "account.set_status",
      targetType: "profile",
      targetId: p._id,
      targetLabel: p.email ?? p.name,
      before: { status: current },
      after: { status: args.status, sessionsRevoked },
    });
    return null;
  },
});

// ── Password reset link: the only way staff touch credentials ────────────
export const logResetLink = internalMutation({
  args: { profileId: v.id("profiles"), reason: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const { staff } = await requireStaff(ctx, "auth.send_reset_link");
    assertReason(args.reason);
    const p = await ctx.db.get(args.profileId);
    if (!p?.email) throw fail("NOT_FOUND", "User has no email on file");
    await writeAudit(ctx, staff, {
      action: "auth.send_reset_link",
      targetType: "profile",
      targetId: p._id,
      targetLabel: p.email,
      reason: args.reason.trim(),
    });
    return p.email;
  },
});

export const sendResetLink = action({
  args: { profileId: v.id("profiles"), reason: v.string() },
  handler: async (ctx, args): Promise<{ sent: true }> => {
    const email = await ctx.runMutation(internal.admin.users.logResetLink, args);
    // Convex Auth's own reset flow emails a single-use link; staff never see or set a password.
    await ctx.runAction(api.auth.signIn, { provider: "password", params: { flow: "reset", email } });
    return { sent: true };
  },
});
