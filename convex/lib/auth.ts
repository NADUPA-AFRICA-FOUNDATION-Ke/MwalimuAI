import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type DatabaseCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: DatabaseCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }
  return identity;
}

export async function getCurrentProfile(ctx: DatabaseCtx) {
  const identity = await requireIdentity(ctx);
  // Convex Auth encodes the native user id and session id in subject as
  // `${userId}|${sessionId}`. The full subject is session-specific and is not
  // a document id, so always resolve the first segment for user/profile links.
  const nativeUserId = identity.subject.split("|")[0];
  // Convex Auth's subject is the native `users` document id. Resolve that
  // document first so migrated profiles can still be found when the JWT does
  // not expose an email claim.
  let nativeUser: { email?: string; emailVerificationTime?: number } | null = null;
  try {
    nativeUser = await ctx.db.get(nativeUserId as Id<"users">);
  } catch {
    // Some non-Convex identity providers use a non-document subject.
  }
  // Only a verified address may match someone else's (e.g. migrated) profile. Password sign-up does not verify the
  // email, so trusting it here let anyone claim a migrated learner's profile by signing up with their address.
  // Verification happens through the reset-password email or a provider that vouches for the address.
  const nativeEmail = nativeUser?.emailVerificationTime ? nativeUser.email?.trim().toLowerCase() : undefined;
  const email = identity.email?.trim().toLowerCase() ?? nativeEmail;
  const candidates = [
    ...(await ctx.db.query("profiles")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .take(20)),
    ...(await ctx.db.query("profiles")
      .withIndex("by_auth_subject", (q) => q.eq("authSubject", nativeUserId))
      .take(20)),
    ...(email
      ? await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).take(20)
      : []),
  ];
  const distinctCandidates = [...new Map(candidates.map((candidate) => [candidate._id, candidate])).values()];
  // A previous auth cutover could have left a native shell and a migrated
  // profile for the same account. Prefer the migrated/email-matching record;
  // never let `.unique()` turn that recoverable state into a query failure.
  const profile = distinctCandidates.sort((a, b) => {
    const aEmail = email && a.email?.trim().toLowerCase() === email ? 1 : 0;
    const bEmail = email && b.email?.trim().toLowerCase() === email ? 1 : 0;
    if (aEmail !== bEmail) return bEmail - aEmail;
    const aLegacy = a.legacySupabaseUserId ? 1 : 0;
    const bLegacy = b.legacySupabaseUserId ? 1 : 0;
    if (aLegacy !== bLegacy) return bLegacy - aLegacy;
    if (a.completed !== b.completed) return Number(b.completed) - Number(a.completed);
    return b.updatedAt - a.updatedAt;
  })[0] ?? null;
  return { identity, profile };
}

export function assertProfileActive(profile: { status?: "active" | "suspended" | "deactivated" }) {
  if (profile.status === "suspended" || profile.status === "deactivated") {
    throw new ConvexError({ code: "ACCOUNT_SUSPENDED", message: "This account is suspended. Please contact support." });
  }
}

/** The sign-in session behind this request (Convex Auth puts `${userId}|${sessionId}` in the subject). */
export const sessionIdOf = (identity: { subject: string }) => identity.subject.split("|")[1] ?? "";

/**
 * One account, one active session. Once a session has claimed the account (sessions.claim), requests from every other
 * session are refused here, so a replaced device is cut off at once instead of when its page notices.
 */
export function assertActiveSession(identity: { subject: string }, profile: { activeAuthSession?: string }) {
  if (profile.activeAuthSession && profile.activeAuthSession !== sessionIdOf(identity)) {
    throw new ConvexError({ code: "SESSION_REPLACED", message: "This account was opened on another device or browser, so you were signed out here." });
  }
}

export async function requireCurrentProfile(ctx: DatabaseCtx) {
  const { identity, profile } = await getCurrentProfile(ctx);
  if (profile === null) {
    throw new ConvexError({
      code: "PROFILE_NOT_PROVISIONED",
      message: "Create the authenticated user's profile before using this feature",
    });
  }
  // Suspension and the one-session rule are enforced here so every learner function honours them, not just the UI.
  assertProfileActive(profile);
  assertActiveSession(identity, profile);
  return profile;
}
