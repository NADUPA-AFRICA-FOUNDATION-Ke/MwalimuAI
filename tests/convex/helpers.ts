/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";

export const modules = import.meta.glob("../../convex/**/*.ts");
export const newTest = () => convexTest(schema, modules);
export type T = ReturnType<typeof newTest>;
export type Role = "super_admin" | "content_manager" | "support_agent" | "viewer";

let counter = 0;
const blankProfile = {
  subjects: [],
  grades: [],
  cbcLevel: "beginner" as const,
  lang: "en" as const,
  completed: true,
  a11ySettings: {
    textSize: "normal" as const,
    highContrast: false,
    reduceMotion: false,
    dyslexiaFont: false,
    wideSpacing: false,
  },
  lowBandwidth: false,
  notificationsState: { read: [], dismissed: [] },
  sidebarCollapsed: false,
};

/** A signed-in staff member whose session has already passed the MFA challenge. */
export async function makeStaff(t: T, role: Role, opts: { mfa?: boolean } = {}) {
  const n = ++counter;
  const email = `${role}${n}@mwalimu.test`;
  const { userId, staffId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, emailVerificationTime: Date.now() });
    const staffId = await ctx.db.insert("staff", {
      email,
      role,
      status: "active",
      updatedAt: Date.now(),
      ...(opts.mfa === false ? {} : { mfaEnrolledAt: Date.now() }),
    });
    if (opts.mfa !== false)
      await ctx.db.insert("staffSessions", { staffId, authSessionId: `sess${n}`, verifiedAt: Date.now() });
    return { userId, staffId };
  });
  const as = t.withIdentity({ subject: `${userId}|sess${n}`, tokenIdentifier: `test|${userId}`, email });
  return { as, staffId, email, userId };
}

/** A learner (not staff) with a profile, signed in. */
export async function makeLearner(t: T, over: Record<string, unknown> = {}) {
  const n = ++counter;
  const email = `learner${n}@school.test`;
  const { userId, profileId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, emailVerificationTime: Date.now() });
    const profileId = await ctx.db.insert("profiles", {
      ...blankProfile,
      tokenIdentifier: `test|${userId}`,
      authSubject: userId,
      email,
      name: `Learner ${n}`,
      searchText: `learner ${n} ${email}`,
      updatedAt: Date.now(),
      ...over,
    });
    return { userId, profileId: profileId as Id<"profiles"> };
  });
  const as = t.withIdentity({ subject: `${userId}|lsess${n}`, tokenIdentifier: `test|${userId}`, email });
  return { as, userId, profileId, email };
}

export const days = (ago: number) => new Date(Date.now() + 3 * 3600_000 - ago * 86_400_000).toISOString().slice(0, 10);

export async function addActivity(t: T, profileId: Id<"profiles">, dateKeys: string[]) {
  await t.run(async (ctx) => {
    for (const date of dateKeys)
      await ctx.db.insert("activityLog", { userId: profileId, date, type: "lesson", createdAt: Date.now() });
  });
}
