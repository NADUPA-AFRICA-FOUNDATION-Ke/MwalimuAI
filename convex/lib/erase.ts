import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { sha256Hex } from "./audit";

/**
 * Erases a learner in small steps (a few hundred rows at a time, so no single step is too big).
 * Personal content is deleted; the few records that must outlive a person (issued certificates others verify,
 * community threads other people replied to) are anonymised instead. Each call does one batch and says what is next.
 */
export type EraseState = { profileId: Id<"profiles">; phase: number; cursor: string | null };

type Phase =
  | { kind: "delete"; table: string; index: string; field: string }
  | { kind: "anonymize"; table: string; index: string; field: string; patch: Record<string, unknown> }
  | { kind: "tickets" }
  | { kind: "auth" }
  | { kind: "finish" };

const BATCH = 100;
const REMOVED = "[removed]";

const PHASES: Phase[] = [
  { kind: "delete", table: "learningProgress", index: "by_user", field: "userId" },
  { kind: "delete", table: "userProgress", index: "by_user", field: "userId" },
  { kind: "delete", table: "journalEntries", index: "by_user_and_created_at", field: "userId" },
  { kind: "delete", table: "toolHistory", index: "by_user_and_created_at", field: "userId" },
  { kind: "delete", table: "toolsUsed", index: "by_user_and_last_used_at", field: "userId" },
  { kind: "delete", table: "goals", index: "by_user_and_created_at", field: "userId" },
  { kind: "delete", table: "assessmentResults", index: "by_user", field: "userId" },
  { kind: "delete", table: "activityLog", index: "by_user_and_date", field: "userId" },
  { kind: "delete", table: "notifications", index: "by_user_and_created_at", field: "userId" },
  { kind: "delete", table: "aiMessages", index: "by_user_and_created_at", field: "userId" },
  { kind: "delete", table: "aiConversations", index: "by_user_and_updated_at", field: "userId" },
  { kind: "delete", table: "lessonDiscussions", index: "by_user_and_created_at", field: "userId" },
  { kind: "delete", table: "communityPostLikes", index: "by_user_and_post", field: "userId" },
  { kind: "delete", table: "communityReports", index: "by_reporter_and_created_at", field: "reporterId" },
  { kind: "delete", table: "emailLog", index: "by_profile_and_created_at", field: "profileId" },
  { kind: "delete", table: "streakAdjustments", index: "by_profile", field: "profileId" },
  { kind: "delete", table: "subscriptions", index: "by_user", field: "userId" },
  { kind: "anonymize", table: "communityPosts", index: "by_user_and_created_at", field: "userId", patch: { title: REMOVED, content: REMOVED, authorName: "Deleted user", status: "deleted" } },
  { kind: "anonymize", table: "communityComments", index: "by_user_and_created_at", field: "userId", patch: { body: REMOVED, authorName: "Deleted user" } },
  { kind: "anonymize", table: "certificates", index: "by_user", field: "userId", patch: { teacherName: "Deleted learner" } },
  { kind: "tickets" },
  { kind: "auth" },
  { kind: "finish" },
];

/** Does one batch. Returns the next state, or null when everything is erased. */
export async function eraseBatch(ctx: MutationCtx, state: EraseState): Promise<EraseState | null> {
  const phase = PHASES[state.phase];
  if (!phase) return null;
  const next = (cursor: string | null, advance: boolean): EraseState => ({ profileId: state.profileId, phase: state.phase + (advance ? 1 : 0), cursor: advance ? null : cursor });
  const db = ctx.db as any;

  if (phase.kind === "delete" || phase.kind === "anonymize") {
    const page = await db.query(phase.table).withIndex(phase.index, (q: any) => q.eq(phase.field, state.profileId)).paginate({ numItems: BATCH, cursor: state.cursor });
    for (const row of page.page) {
      if (phase.kind === "delete") await db.delete(row._id);
      else await db.patch(row._id, phase.patch);
    }
    return page.isDone ? next(null, true) : next(page.continueCursor, false);
  }

  if (phase.kind === "tickets") {
    const page = await ctx.db.query("tickets").withIndex("by_profile", (q) => q.eq("profileId", state.profileId)).paginate({ numItems: 20, cursor: state.cursor });
    for (const t of page.page) {
      for (const m of await ctx.db.query("ticketMessages").withIndex("by_ticket", (q) => q.eq("ticketId", t._id)).take(500)) await ctx.db.delete(m._id);
      await ctx.db.delete(t._id);
    }
    return page.isDone ? next(null, true) : next(page.continueCursor, false);
  }

  const profile = await ctx.db.get(state.profileId);
  const userId = profile ? ctx.db.normalizeId("users", profile.authSubject) : null;

  if (phase.kind === "auth") {
    if (userId) {
      for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).take(50)) {
        for (const t of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).take(100)) await ctx.db.delete(t._id);
        await ctx.db.delete(s._id);
      }
      for (const a of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).take(20)) {
        for (const c of await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).take(50)) await ctx.db.delete(c._id);
        await ctx.db.delete(a._id);
      }
      if (await ctx.db.get(userId)) await ctx.db.delete(userId);
    }
    return next(null, true);
  }

  // finish: pseudonymise the label on staff audit rows about this person (the hash chain does not cover labels),
  // remove the profile, and record that erasure completed.
  for (const row of await ctx.db.query("auditLog").withIndex("by_target", (q) => q.eq("targetType", "profile").eq("targetId", state.profileId)).take(200))
    if (row.targetLabel) await ctx.db.patch(row._id, { targetLabel: "Deleted user" });
  if (profile) await ctx.db.delete(profile._id);
  await ctx.db.insert("privacyRequests", { kind: "erasure_completed", ref: (await sha256Hex(state.profileId)).slice(0, 32), at: Date.now() });
  return null;
}
