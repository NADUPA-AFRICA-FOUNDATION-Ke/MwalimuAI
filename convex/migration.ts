import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const record = v.object({
  sourceTable: v.string(), legacyId: v.string(), legacyUserId: v.optional(v.string()),
  checksum: v.string(), payload: v.any(),
});

function requireSecret(secret: string) {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected || secret !== expected) throw new Error("Invalid migration credentials");
}

const normalizedEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : undefined;

const nonEmpty = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;

const sourceUserId = (row: { legacyId: string; legacyUserId?: string; payload: unknown }) => {
  const payload = row.payload as Record<string, unknown>;
  return String(payload.user_id ?? row.legacyUserId ?? row.legacyId);
};

export const findAuthUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const rows = await ctx.db.query("migrationRecords").withIndex("by_source_and_legacy_id", (q) => q.eq("sourceTable", "auth.users")).collect();
    return rows.find((row) => String((row.payload as Record<string, unknown>).email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
  },
});

export const importBatch = mutation({
  args: { secret: v.string(), records: v.array(record) },
  handler: async (ctx, { secret, records }) => {
    requireSecret(secret);
    let inserted = 0;
    let skipped = 0;
    for (const item of records) {
      const existing = await ctx.db.query("migrationRecords").withIndex("by_source_and_legacy_id", (q) => q.eq("sourceTable", item.sourceTable).eq("legacyId", item.legacyId)).unique();
      if (existing?.checksum === item.checksum) { skipped++; continue; }
      if (existing) await ctx.db.patch(existing._id, { ...item, importedAt: Date.now() });
      else await ctx.db.insert("migrationRecords", { ...item, importedAt: Date.now() });
      inserted++;
    }
    return { inserted, skipped };
  },
});

export const counts = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const tables = ["profiles", "modules", "lessons", "learningProgress", "userProgress", "communityPosts", "communityComments", "journalEntries", "toolHistory", "aiConversations", "aiMessages", "goals", "assessmentResults", "activityLog", "toolsUsed", "lessonDiscussions", "notifications", "subscriptions", "certificates", "migrationRecords"] as const;
    const result: Record<string, number> = {};
    for (const table of tables) result[table] = (await ctx.db.query(table).take(10_000)).length;
    return result;
  },
});

export const sourceCounts = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("migrationRecords").take(10_000);
    const result: Record<string, number> = {};
    for (const row of rows) result[row.sourceTable] = (result[row.sourceTable] ?? 0) + 1;
    return result;
  },
});

export const profileAudit = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("migrationRecords").take(10_000);
    const auth = rows.filter((row) => row.sourceTable === "auth.users");
    const sourceProfiles = rows.filter((row) => row.sourceTable === "profiles");
    const profiles = await ctx.db.query("profiles").take(10_000);
    const byLegacy = new Map(profiles.flatMap((profile) =>
      profile.legacySupabaseUserId ? [[profile.legacySupabaseUserId, profile] as const] : []));
    const byEmail = new Map(profiles.filter((profile) => profile.email).map((profile) => [profile.email!.toLowerCase(), profile]));
    const missingAuthProfiles = auth.filter((row) => {
      const payload = row.payload as Record<string, unknown>;
      return !byLegacy.has(row.legacyId) &&
        !(normalizedEmail(payload.email) && byEmail.has(normalizedEmail(payload.email)!));
    }).map((row) => row.legacyId);
    const mismatchedEmails = auth.flatMap((row) => {
      const payload = row.payload as Record<string, unknown>;
      const profile = byLegacy.get(row.legacyId) ?? (typeof payload.email === "string" ? byEmail.get(payload.email.toLowerCase()) : undefined);
      return profile && typeof payload.email === "string" && profile.email?.toLowerCase() !== payload.email.toLowerCase() ? [row.legacyId] : [];
    });
    return { authUsers: auth.length, sourceProfiles: sourceProfiles.length, convexProfiles: profiles.length, missingAuthProfiles, mismatchedEmails };
  },
});

export const accountProgressAudit = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("migrationRecords").take(10_000);
    const authRows = rows.filter((row) => row.sourceTable === "auth.users");
    const sourceProgress = rows.filter((row) => row.sourceTable === "learning_progress");
    const profiles = await ctx.db.query("profiles").take(10_000);
    const byLegacy = new Map(profiles.flatMap((profile) =>
      profile.legacySupabaseUserId ? [[profile.legacySupabaseUserId, profile] as const] : []));
    const byEmail = new Map(profiles.flatMap((profile) => {
      const email = normalizedEmail(profile.email);
      return email ? [[email, profile] as const] : [];
    }));
    const currentProgress = await ctx.db.query("learningProgress").take(10_000);
    return authRows.map((row) => {
      const auth = row.payload as Record<string, unknown>;
      const email = normalizedEmail(auth.email);
      const profile = byLegacy.get(row.legacyId) ?? (email ? byEmail.get(email) : undefined);
      const sourceRows = sourceProgress.filter((item) => sourceUserId(item) === row.legacyId);
      const currentRows = profile ? currentProgress.filter((item) => item.userId === profile._id) : [];
      return {
        legacyUserId: row.legacyId,
        email: email ?? null,
        profileId: profile?._id ?? null,
        profileLegacyUserId: profile?.legacySupabaseUserId ?? null,
        migrationStatus: profile?.migrationStatus ?? null,
        sourcePrograms: sourceRows.map((item) => String((item.payload as Record<string, unknown>).program_id ?? "")),
        currentPrograms: currentRows.map((item) => item.programId),
        sourceCompletedLessons: sourceRows.reduce((total, item) => {
          const lessons = (item.payload as Record<string, unknown>).completed_lessons;
          return total + (Array.isArray(lessons) ? lessons.length : 0);
        }, 0),
        currentCompletedLessons: currentRows.reduce((total, item) => total + item.completedLessons.length, 0),
      };
    });
  },
});

export const nativeAccountAudit = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const users = await ctx.db.query("users").take(10_000);
    const accounts = await ctx.db.query("authAccounts").take(10_000);
    const profiles = await ctx.db.query("profiles").take(10_000);
    return accounts.map((account) => {
      const user = users.find((item) => item._id === account.userId);
      const profile = profiles.find((item) =>
        item.authSubject === String(account.userId) ||
        (user?.email && item.email?.toLowerCase() === user.email.toLowerCase()));
      return {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        userId: account.userId,
        email: user?.email ?? null,
        profileId: profile?._id ?? null,
        legacySupabaseUserId: profile?.legacySupabaseUserId ?? null,
        migrationStatus: profile?.migrationStatus ?? null,
      };
    });
  },
});

/**
 * Merge duplicate native Convex users created by an identity migration.
 *
 * This is intentionally migration-secret protected. OAuth account IDs are
 * globally unique, so moving them to the canonical user preserves every
 * provider login. Duplicate sessions are revoked before the duplicate user
 * is removed, which prevents an old JWT from continuing to refer to a deleted
 * identity. Profile records are only relinked when the email has one live,
 * unambiguous profile; ambiguous profile groups are reported for a separate
 * data merge so learning records cannot be attached to the wrong profile.
 */
export const consolidateNativeAccounts = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);

    const users = await ctx.db.query("users").take(10_000);
    const accounts = await ctx.db.query("authAccounts").take(10_000);
    const profiles = await ctx.db.query("profiles").take(10_000);
    const usersByEmail = new Map<string, typeof users>();

    for (const user of users) {
      const email = normalizedEmail(user.email);
      if (!email) continue;
      const group = usersByEmail.get(email) ?? [];
      group.push(user);
      usersByEmail.set(email, group);
    }

    let duplicateEmailGroups = 0;
    let mergedUsers = 0;
    let accountsMoved = 0;
    let sessionsRevoked = 0;
    let profileLinksRepaired = 0;
    const conflicts: Array<{ email: string; userIds: string[]; profileIds: string[] }> = [];

    for (const [email, group] of usersByEmail) {
      if (group.length < 2) continue;
      duplicateEmailGroups++;

      const liveProfiles = profiles.filter((profile) =>
        normalizedEmail(profile.email) === email &&
        !profile.tokenIdentifier.startsWith("retired|") &&
        !profile.authSubject.startsWith("retired|"),
      );
      if (liveProfiles.length > 1) {
        conflicts.push({
          email,
          userIds: group.map((user) => String(user._id)),
          profileIds: liveProfiles.map((profile) => String(profile._id)),
        });
        continue;
      }

      const canonical = [...group].sort((a, b) => {
        const aHasProfile = liveProfiles.some((profile) => profile.authSubject === String(a._id));
        const bHasProfile = liveProfiles.some((profile) => profile.authSubject === String(b._id));
        if (aHasProfile !== bHasProfile) return Number(bHasProfile) - Number(aHasProfile);
        const aAccountCount = accounts.filter((account) => account.userId === a._id).length;
        const bAccountCount = accounts.filter((account) => account.userId === b._id).length;
        if (aAccountCount !== bAccountCount) return bAccountCount - aAccountCount;
        return a._creationTime - b._creationTime;
      })[0];

      for (const duplicate of group) {
        if (duplicate._id === canonical._id) continue;

        for (const account of accounts.filter((item) => item.userId === duplicate._id)) {
          await ctx.db.patch(account._id, { userId: canonical._id });
          accountsMoved++;
        }

        const sessions = await ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", duplicate._id))
          .collect();
        for (const session of sessions) {
          const refreshTokens = await ctx.db
            .query("authRefreshTokens")
            .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
            .collect();
          for (const token of refreshTokens) await ctx.db.delete(token._id);
          await ctx.db.delete(session._id);
          sessionsRevoked++;
        }

        const profile = liveProfiles[0];
        if (profile && profile.authSubject === String(duplicate._id)) {
          await ctx.db.patch(profile._id, {
            authSubject: String(canonical._id),
            migrationStatus: "linked",
            updatedAt: Date.now(),
          });
          profileLinksRepaired++;
        }

        await ctx.db.delete(duplicate._id);
        mergedUsers++;
      }
    }

    return {
      scannedUsers: users.length,
      duplicateEmailGroups,
      mergedUsers,
      accountsMoved,
      sessionsRevoked,
      profileLinksRepaired,
      conflicts,
    };
  },
});

export const profileDetailsAudit = query({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("migrationRecords").take(10_000);
    const authRows = rows.filter((row) => row.sourceTable === "auth.users");
    const sourceProfiles = rows.filter((row) => row.sourceTable === "profiles");
    const profiles = await ctx.db.query("profiles").take(10_000);
    const users = await ctx.db.query("users").take(10_000);
    const details = (value: Record<string, any> | undefined) => value ? ({
      name: value.name ?? value.full_name ?? null,
      school: value.school ?? value.school_name ?? null,
      county: value.county ?? null,
      subjects: Array.isArray(value.subjects) ? value.subjects : [],
      grades: Array.isArray(value.grades) ? value.grades : (Array.isArray(value.grade_levels) ? value.grade_levels : []),
      cbcLevel: value.cbc_level ?? null,
      completed: value.completed ?? value.onboarding_completed ?? null,
    }) : null;
    return authRows.map((row) => {
      const auth = row.payload as Record<string, any>;
      const email = normalizedEmail(auth.email);
      const source = sourceProfiles.find((item) => sourceUserId(item) === row.legacyId);
      const nativeUser = users.find((user) => normalizedEmail(user.email) === email);
      const current = profiles.filter((profile) =>
        (email && normalizedEmail(profile.email) === email) ||
        (nativeUser && profile.authSubject === String(nativeUser._id)) ||
        profile.legacySupabaseUserId === row.legacyId,
      );
      return {
        email: email ?? null,
        source: details(source?.payload as Record<string, any> | undefined),
        current: current.map((profile) => ({
          id: profile._id,
          name: profile.name ?? null,
          school: profile.school ?? null,
          county: profile.county ?? null,
          subjects: profile.subjects,
          grades: profile.grades,
          cbcLevel: profile.cbcLevel,
          completed: profile.completed,
          authSubject: profile.authSubject,
          migrationStatus: profile.migrationStatus ?? null,
        })),
      };
    });
  },
});

export const repairNativeAccountLinks = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const users = await ctx.db.query("users").take(10_000);
    const accounts = await ctx.db.query("authAccounts").take(10_000);
    const profiles = await ctx.db.query("profiles").take(10_000);
    let repaired = 0;
    for (const account of accounts) {
      const user = users.find((item) => item._id === account.userId);
      const email = normalizedEmail(user?.email);
      if (!email) continue;
      const profile = profiles.find((item) => item.email?.toLowerCase() === email);
      if (!profile || profile.authSubject === String(account.userId)) continue;
      await ctx.db.patch(profile._id, {
        authSubject: String(account.userId),
        migrationStatus: "pending",
        updatedAt: Date.now(),
      });
      repaired++;
    }
    return { repaired };
  },
});

export const consolidateProfilesByEmail = mutation({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, { secret, email: rawEmail }) => {
    requireSecret(secret);
    const email = normalizedEmail(rawEmail);
    if (!email) throw new Error("A valid email is required");

    const users = await ctx.db.query("users").take(10_000);
    const nativeUser = users.find((user) => normalizedEmail(user.email) === email);
    if (!nativeUser) return { status: "no_native_user", merged: 0, movedActivity: 0 };

    const profiles = await ctx.db.query("profiles").take(10_000);
    const candidates = profiles.filter((profile) =>
      profile.authSubject === String(nativeUser._id) || normalizedEmail(profile.email) === email,
    );
    if (candidates.length < 2) return { status: "already_consolidated", merged: 0, movedActivity: 0 };

    const canonical = candidates.find((profile) => profile.legacySupabaseUserId) ??
      candidates.find((profile) => normalizedEmail(profile.email) === email) ?? candidates[0];
    const duplicate = candidates.find((profile) => profile._id !== canonical._id)!;

    const activity = await ctx.db.query("activityLog")
      .withIndex("by_user_and_date", (q) => q.eq("userId", duplicate._id))
      .take(10_000);
    for (const row of activity) await ctx.db.patch(row._id, { userId: canonical._id });

    const useDuplicate = duplicate.updatedAt >= canonical.updatedAt;
    const preferred = useDuplicate ? duplicate : canonical;
    const merged = {
      tokenIdentifier: nonEmpty(preferred.tokenIdentifier) &&
        !preferred.tokenIdentifier.startsWith("migrated|") && !preferred.tokenIdentifier.startsWith("supabase|")
        ? preferred.tokenIdentifier : canonical.tokenIdentifier,
      authSubject: String(nativeUser._id),
      ...(canonical.legacySupabaseUserId ? { legacySupabaseUserId: canonical.legacySupabaseUserId } : {}),
      migrationStatus: "linked" as const,
      email,
      name: nonEmpty(preferred.name) ? preferred.name : canonical.name ?? "",
      ...(nonEmpty(preferred.school) ? { school: preferred.school } : canonical.school !== undefined ? { school: canonical.school } : {}),
      ...(nonEmpty(preferred.county) ? { county: preferred.county } : canonical.county !== undefined ? { county: canonical.county } : {}),
      subjects: preferred.subjects.length > 0 ? preferred.subjects : canonical.subjects,
      grades: preferred.grades.length > 0 ? preferred.grades : canonical.grades,
      cbcLevel: preferred.completed ? preferred.cbcLevel : canonical.cbcLevel,
      lang: preferred.lang,
      completed: Boolean(canonical.completed || duplicate.completed),
      a11ySettings: preferred.a11ySettings,
      lowBandwidth: preferred.lowBandwidth,
      notificationsState: preferred.notificationsState,
      sidebarCollapsed: preferred.sidebarCollapsed,
      ...(preferred.activeSessionId !== undefined ? { activeSessionId: preferred.activeSessionId } : {}),
      updatedAt: Date.now(),
    };
    await ctx.db.patch(canonical._id, merged);
    // Keep the old document auditable but remove it from every live identity
    // lookup. It has no progress records; activity was moved above.
    await ctx.db.patch(duplicate._id, {
      authSubject: `retired|${duplicate._id}`,
      tokenIdentifier: `retired|${duplicate._id}`,
      migrationStatus: "complete",
      updatedAt: Date.now(),
    });
    return { status: "consolidated", merged: 1, movedActivity: activity.length, canonicalId: canonical._id };
  },
});

export const restoreProfileDetails = mutation({
  args: {
    secret: v.string(),
    email: v.string(),
    sourceProfileId: v.id("profiles"),
  },
  handler: async (ctx, { secret, email: rawEmail, sourceProfileId }) => {
    requireSecret(secret);
    const email = normalizedEmail(rawEmail);
    if (!email) throw new Error("A valid email is required");
    const source = await ctx.db.get(sourceProfileId);
    const canonical = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (!source || !canonical || !source.tokenIdentifier.startsWith("retired|")) {
      throw new Error("The requested profile repair is not valid");
    }
    await ctx.db.patch(canonical._id, {
      email,
      name: nonEmpty(source.name) ? source.name : canonical.name ?? "",
      ...(nonEmpty(source.school) ? { school: source.school } : {}),
      ...(nonEmpty(source.county) ? { county: source.county } : {}),
      subjects: source.subjects.length > 0 ? source.subjects : canonical.subjects,
      grades: source.grades.length > 0 ? source.grades : canonical.grades,
      cbcLevel: source.completed ? source.cbcLevel : canonical.cbcLevel,
      completed: Boolean(canonical.completed || source.completed),
      authSubject: canonical.authSubject,
      tokenIdentifier: canonical.tokenIdentifier,
      migrationStatus: "linked",
      updatedAt: Date.now(),
    });
    return { status: "restored", canonicalId: canonical._id };
  },
});

export const promoteCore = mutation({
  args: { secret: v.string() },
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("migrationRecords").take(10_000);
    const bySource = (source: string) => rows.filter((row) => row.sourceTable === source);
    const authRows = bySource("auth.users");
    const authById = new Map(authRows.map((row) => [row.legacyId, row.payload as Record<string, any>]));
    const authByEmail = new Map(authRows.flatMap((row) => {
      const email = normalizedEmail((row.payload as Record<string, unknown>).email);
      return email ? [[email, row.payload as Record<string, any>] as const] : [];
    }));
    const profileByLegacy = new Map<string, any>();
    for (const row of bySource("profiles")) {
      const source = row.payload as Record<string, any>;
      const userId = String(source.user_id ?? row.legacyUserId ?? row.legacyId);
      const sourceEmail = normalizedEmail(source.email) ?? normalizedEmail(source.email_address);
      const auth = authById.get(userId) ?? (sourceEmail ? authByEmail.get(sourceEmail) : undefined) ?? {};
      const authEmail = normalizedEmail(auth.email);
      const email = sourceEmail ?? authEmail;
      const existingByLegacy = await ctx.db.query("profiles")
        .withIndex("by_legacy_supabase_user_id", (q) => q.eq("legacySupabaseUserId", userId)).unique();
      const existing = existingByLegacy ?? (email
        ? await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique()
        : null);
      const hasNativeAuthSubject = existing &&
        existing.authSubject !== existing.legacySupabaseUserId &&
        !existing.authSubject.startsWith("supabase|") &&
        !existing.authSubject.startsWith("migrated|");
      const hasNativeTokenIdentifier = existing &&
        existing.migrationStatus !== "pending" &&
        !existing.tokenIdentifier.startsWith("supabase|") &&
        !existing.tokenIdentifier.startsWith("migrated|");
      const preservesNativeIdentity = Boolean(hasNativeAuthSubject || hasNativeTokenIdentifier);
      const nativeProfile = existing!;
      const value = {
        tokenIdentifier: preservesNativeIdentity ? nativeProfile.tokenIdentifier : `migrated|${userId}`,
        authSubject: preservesNativeIdentity ? nativeProfile.authSubject : `migrated|${userId}`,
        legacySupabaseUserId: userId,
        migrationStatus: preservesNativeIdentity ? (nativeProfile.migrationStatus ?? "linked") : "pending",
        ...(email ? { email } : {}),
        name: preservesNativeIdentity && existing !== null && nonEmpty(existing.name)
          ? existing.name
          : nonEmpty(source.name) ? source.name : nonEmpty(source.full_name) ? source.full_name : existing?.name ?? "",
        ...(preservesNativeIdentity && existing !== null && nonEmpty(existing.school)
          ? { school: existing.school }
          : nonEmpty(source.school) || nonEmpty(source.school_name)
          ? { school: nonEmpty(source.school) ? source.school : source.school_name }
          : existing?.school !== undefined ? { school: existing.school } : {}),
        ...(preservesNativeIdentity && existing !== null && nonEmpty(existing.county)
          ? { county: existing.county }
          : nonEmpty(source.county) ? { county: String(source.county) } : existing?.county !== undefined ? { county: existing.county } : {}),
        subjects: preservesNativeIdentity && existing?.subjects.length
          ? existing.subjects
          : Array.isArray(source.subjects) && source.subjects.length > 0 ? source.subjects : existing?.subjects ?? [],
        grades: preservesNativeIdentity && existing?.grades.length
          ? existing.grades
          : Array.isArray(source.grades ?? source.grade_levels) && (source.grades ?? source.grade_levels).length > 0
          ? source.grades ?? source.grade_levels : existing?.grades ?? [],
        cbcLevel: preservesNativeIdentity && existing?.completed
          ? existing.cbcLevel
          : ["beginner", "intermediate", "advanced"].includes(source.cbc_level) ? source.cbc_level : existing?.cbcLevel ?? "beginner" as const,
        lang: preservesNativeIdentity ? existing?.lang ?? "en" as const : source.lang === "sw" ? "sw" as const : existing?.lang ?? "en" as const,
        completed: Boolean(source.completed ?? source.onboarding_completed ?? existing?.completed),
        a11ySettings: existing?.a11ySettings ?? { textSize: "normal" as const, highContrast: false, reduceMotion: false, dyslexiaFont: false, wideSpacing: false },
        lowBandwidth: source.low_bandwidth ?? existing?.lowBandwidth ?? false,
        notificationsState: source.notifications_state ?? existing?.notificationsState ?? { read: [], dismissed: [] },
        sidebarCollapsed: source.sidebar_collapsed ?? existing?.sidebarCollapsed ?? false,
        ...(source.active_session_id ? { activeSessionId: source.active_session_id } : {}),
        updatedAt: Date.now(),
      };
      const id = existing ? existing._id : await ctx.db.insert("profiles", value);
      if (existing) await ctx.db.patch(id, value);
      profileByLegacy.set(userId, id);
    }
    for (const row of bySource("learning_progress")) {
      const source = row.payload as Record<string, any>;
      const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const existing = await ctx.db.query("learningProgress").withIndex("by_user_and_program", (q) => q.eq("userId", userId).eq("programId", String(source.program_id))).unique();
      const value = { userId, programId: String(source.program_id), completedLessons: source.completed_lessons ?? [], reflections: source.reflections ?? {}, ...(source.pre_assessment ? { preAssessment: source.pre_assessment } : {}), ...(source.post_assessment ? { postAssessment: source.post_assessment } : {}), ...(source.assignment ? { assignment: source.assignment } : {}), ...(source.certificate_earned_at ? { certificateEarnedAt: source.certificate_earned_at } : {}), ...(source.certificate_serial ? { certificateSerial: source.certificate_serial } : {}), cohortJoined: Boolean(source.cohort_joined), updatedAt: Date.now() };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("learningProgress", value);
    }
    for (const row of bySource("tool_outputs")) {
      const source = row.payload as Record<string, any>; const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const clientId = row.legacyId; const existing = await ctx.db.query("toolHistory").withIndex("by_user_and_client_id", (q) => q.eq("userId", userId).eq("clientId", clientId)).unique();
      const value = { userId, clientId, toolId: String(source.tool_id ?? ""), title: String(source.title ?? ""), input: source.input ?? {}, output: String(source.output ?? ""), createdAt: source.created_at ? new Date(source.created_at).getTime() : Date.now() };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("toolHistory", value);
    }
    for (const row of bySource("certificates")) {
      const source = row.payload as Record<string, any>; const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const serial = String(source.serial); const existing = await ctx.db.query("certificates").withIndex("by_serial", (q) => q.eq("serial", serial)).unique();
      const value = { serial, userId, programId: String(source.program_id ?? ""), programTitle: String(source.program_title ?? ""), teacherName: String(source.teacher_name ?? ""), earnedAt: source.earned_at ? new Date(source.earned_at).getTime() : Date.now() };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("certificates", value);
    }
    return { profiles: profileByLegacy.size, learningProgress: bySource("learning_progress").length, toolOutputs: bySource("tool_outputs").length, certificates: bySource("certificates").length };
  },
});

const asTimestamp = (value: unknown, fallback = Date.now()) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

export const promoteRemaining = mutation({
  args: { secret: v.string() },
  returns: v.record(v.string(), v.number()),
  handler: async (ctx, { secret }) => {
    requireSecret(secret);
    const rows = await ctx.db.query("migrationRecords").take(10_000);
    const bySource = (source: string) => rows.filter((row) => row.sourceTable === source);
    const profiles = await ctx.db.query("profiles").take(10_000);
    const profileByLegacy = new Map(profiles.flatMap((profile) =>
      profile.legacySupabaseUserId ? [[profile.legacySupabaseUserId, profile._id] as const] : []));
    const counts: Record<string, number> = {};
    const increment = (table: string) => { counts[table] = (counts[table] ?? 0) + 1; };

    const conversationByLegacy = new Map<string, Id<"aiConversations">>();
    for (const row of bySource("ai_conversations")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row));
      if (!userId) continue;
      const existing = await ctx.db.query("aiConversations").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const value = { userId, legacyId: row.legacyId, title: String(source.title ?? "New conversation"),
        createdAt: asTimestamp(source.created_at), updatedAt: asTimestamp(source.updated_at, asTimestamp(source.created_at)) };
      const id = existing?._id ?? await ctx.db.insert("aiConversations", value);
      if (existing) await ctx.db.patch(id, value);
      conversationByLegacy.set(row.legacyId, id); increment("aiConversations");
    }
    for (const existing of await ctx.db.query("aiConversations").withIndex("by_legacy_id").take(10_000)) {
      if (existing.legacyId) conversationByLegacy.set(existing.legacyId, existing._id);
    }
    for (const row of bySource("ai_messages")) {
      const source = row.payload as Record<string, unknown>;
      const conversationId = conversationByLegacy.get(String(source.conversation_id ?? ""));
      if (!conversationId) continue;
      const conversation = await ctx.db.get(conversationId); if (!conversation) continue;
      const existing = await ctx.db.query("aiMessages").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const value = { conversationId, userId: conversation.userId, legacyId: row.legacyId,
        role: source.role === "assistant" ? "assistant" as const : "user" as const,
        content: String(source.content ?? ""), createdAt: asTimestamp(source.created_at) };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("aiMessages", value);
      increment("aiMessages");
    }

    const validActivityTypes = new Set(["lesson", "tool", "journal", "community", "login", "assessment"]);
    for (const row of bySource("activity_log")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row));
      const type = String(source.type ?? ""); if (!userId || !validActivityTypes.has(type)) continue;
      const existing = await ctx.db.query("activityLog").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const value = { userId, legacyId: row.legacyId, date: String(source.date ?? "").slice(0, 10),
        type: type as "lesson" | "tool" | "journal" | "community" | "login" | "assessment", createdAt: asTimestamp(source.created_at) };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("activityLog", value);
      increment("activityLog");
    }
    for (const row of bySource("tools_used")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const existing = await ctx.db.query("toolsUsed").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const usedAt = asTimestamp(source.used_at ?? source.created_at);
      const value = { userId, legacyId: row.legacyId, toolId: String(source.tool_id ?? ""), firstUsedAt: usedAt, lastUsedAt: usedAt, useCount: 1 };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("toolsUsed", value);
      increment("toolsUsed");
    }

    for (const row of bySource("journal_entries")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const existing = await ctx.db.query("journalEntries").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const createdAt = asTimestamp(source.created_at); const mood = Number(source.mood ?? 3);
      const value = { userId, legacyId: row.legacyId, clientId: String(source.id ?? row.legacyId),
        entryDate: String(source.entry_date ?? source.created_at ?? new Date(createdAt).toISOString()).slice(0, 10),
        title: String(source.title ?? ""), content: String(source.content ?? ""), mood: Number.isInteger(mood) ? Math.max(1, Math.min(5, mood)) : 3,
        createdAt, updatedAt: asTimestamp(source.updated_at, createdAt) };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("journalEntries", value);
      increment("journalEntries");
    }
    const goalCategories = new Set(["assessment", "pedagogy", "digital", "community", "wellbeing", "other"]);
    for (const row of bySource("goals")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const existing = await ctx.db.query("goals").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const rawCategory = String(source.category ?? "other");
      const milestones = Array.isArray(source.milestones) ? source.milestones.map((item, index) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return { id: String(value.id ?? index), text: String(value.text ?? ""), completed: Boolean(value.completed),
          ...(value.completedAt || value.completed_at ? { completedAt: String(value.completedAt ?? value.completed_at) } : {}) };
      }) : [];
      const value = { userId, legacyId: row.legacyId, title: String(source.title ?? ""),
        category: (goalCategories.has(rawCategory) ? rawCategory : "other") as "assessment" | "pedagogy" | "digital" | "community" | "wellbeing" | "other",
        milestones, createdAt: asTimestamp(source.created_at), updatedAt: asTimestamp(source.updated_at, asTimestamp(source.created_at)) };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("goals", value);
      increment("goals");
    }
    for (const row of bySource("assessment_results")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const existing = await ctx.db.query("assessmentResults").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
      const completedAt = asTimestamp(source.completed_at);
      const value = { userId, legacyId: row.legacyId, responses: source.responses ?? {}, completedAt, updatedAt: completedAt };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("assessmentResults", value);
      increment("assessmentResults");
    }
    for (const row of bySource("lesson_discussions")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row));
      const existing = await ctx.db.query("lessonDiscussions").withIndex("by_legacy_id", (q) => q.eq("legacyId", row.legacyId)).unique();
      const value = { legacyId: row.legacyId, clientId: String(source.id ?? row.legacyId),
        programId: String(source.program_id ?? ""), moduleId: String(source.module_id ?? ""), lessonId: String(source.lesson_id ?? ""),
        author: String(source.author ?? "Teacher"), content: String(source.content ?? ""), isSeed: Boolean(source.is_seed),
        createdAt: asTimestamp(source.created_at), ...(userId ? { userId } : {}) };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("lessonDiscussions", value);
      increment("lessonDiscussions");
    }
    for (const row of bySource("subscriptions")) {
      const source = row.payload as Record<string, unknown>;
      const userId = profileByLegacy.get(sourceUserId(row)); if (!userId) continue;
      const existing = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
      const rawPlan = String(source.plan ?? "free"); const rawStatus = String(source.status ?? "active");
      const plans = new Set(["free", "professional", "school"]); const statuses = new Set(["pending", "active", "trialing", "past_due", "canceled", "incomplete", "incomplete_expired", "unpaid", "paused"]);
      const value = { userId, legacyId: row.legacyId, plan: (plans.has(rawPlan) ? rawPlan : "free") as "free" | "professional" | "school",
        status: (statuses.has(rawStatus) ? rawStatus : "active") as "pending" | "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused",
        ...(source.stripe_customer_id ? { stripeCustomerId: String(source.stripe_customer_id) } : {}),
        ...(source.stripe_subscription_id ? { stripeSubscriptionId: String(source.stripe_subscription_id) } : {}),
        createdAt: asTimestamp(source.created_at), updatedAt: asTimestamp(source.updated_at, asTimestamp(source.created_at)) };
      if (existing) await ctx.db.patch(existing._id, value); else await ctx.db.insert("subscriptions", value);
      increment("subscriptions");
    }
    return counts;
  },
});
