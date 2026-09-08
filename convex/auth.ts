import { convexAuth, createAccount } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import Google from "@auth/core/providers/google";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const normalizedEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : undefined;

const trustedProviderEmail = (provider: { type: string }, profile: {
  emailVerified?: boolean;
}) => Boolean(
  profile.emailVerified === true ||
  provider.type === "email",
);

const googleProvider = Google({
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      emailVerified: profile.email_verified === true,
    };
  },
});

const resetEmail = Email({
  id: "password-reset",
  maxAge: 60 * 30,
  async sendVerificationRequest({ identifier, url }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
    const from = process.env.AUTH_EMAIL_FROM ?? "Mwalimu AI <onboarding@resend.dev>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [identifier],
        subject: "Reset your Mwalimu AI password",
        text: `Reset your password using this link: ${url}`,
        html: `<p>Reset your Mwalimu AI password by clicking the link below.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
      }),
    });
    if (!response.ok) throw new Error(`Password reset email failed (${response.status})`);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({ reset: resetEmail }),
    googleProvider,
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = normalizedEmail(args.profile.email);
      const emailIsTrusted = email !== undefined && trustedProviderEmail(args.provider, args.profile);
      const existingUser = args.existingUserId ? await ctx.db.get(args.existingUserId) : null;

      if (args.existingUserId && !existingUser) {
        throw new Error("The linked authentication account is invalid. Please sign in again.");
      }

      // Never replace the email on an existing native user with a provider
      // value that does not match it. This protects the migrated profile and
      // its learning progress if a provider profile is changed later.
      if (existingUser && email && existingUser.email && normalizedEmail(existingUser.email) !== email) {
        throw new Error("The provider email does not match this account. Please use the original sign-in method.");
      }

      let userId = args.existingUserId;
      if (!userId && email && emailIsTrusted) {
        const matches = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), email))
          .take(2);

        if (matches.length > 1) {
          throw new Error("Multiple accounts share this email. Please contact support so they can be merged safely.");
        }
        userId = matches[0]?._id ?? null;
      }

      // A password sign-up must not create a second native user beside an
      // existing OAuth account. The user can sign in with that provider, or
      // use the password-reset flow after proving ownership of the email.
      if (!userId && args.type === "credentials" && email) {
        const existingEmailUser = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), email))
          .take(1);
        if (existingEmailUser.length > 0) {
          throw new Error("An account with this email already exists. Sign in with your existing provider or reset your password.");
        }
      }

      const userData: Record<string, unknown> = {};
      if (typeof args.profile.name === "string" && args.profile.name.trim()) {
        userData.name = args.profile.name;
      }
      if (typeof args.profile.image === "string" && args.profile.image.trim()) {
        userData.image = args.profile.image;
      }
      if (email && (!existingUser?.email || normalizedEmail(existingUser.email) === email)) {
        userData.email = email;
      }
      if (emailIsTrusted) userData.emailVerificationTime = Date.now();
      if (args.profile.phone && typeof args.profile.phone === "string") {
        userData.phone = args.profile.phone;
        if (args.profile.phoneVerified === true) userData.phoneVerificationTime = Date.now();
      }

      if (userId) {
        await ctx.db.patch(userId, userData);
        return userId;
      }

      return await ctx.db.insert("users", userData as any);
    },
  },
});

// Existing users were migrated with their application data, but password
// hashes cannot be imported into Convex Auth. Provision a native account only
// for an email present in the migration export, so the reset flow can send a
// new Convex password-reset email without exposing a migration secret.
export const provisionMigratedAccount = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    let profile = await ctx.runQuery(internal.profiles.findMigratedByEmail, { email: normalized });
    if (!profile?.legacySupabaseUserId) {
      const migratedUser = await ctx.runQuery(internal.migration.findAuthUserByEmail, { email: normalized });
      if (!migratedUser?.legacyId) return null;
      await ctx.runMutation(internal.profiles.provisionMigrated, { legacyUserId: migratedUser.legacyId, email: normalized });
      profile = await ctx.runQuery(internal.profiles.findMigratedByEmail, { email: normalized });
    }
    const temporarySecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    try {
      await createAccount(ctx, {
        provider: "password",
        account: { id: normalized, secret: temporarySecret },
        profile: { email: normalized },
      });
    } catch (error) {
      // A concurrent request may already have provisioned this account. The
      // following reset attempt will handle it normally.
      if (!(error instanceof Error) || !/already|unique|exists/i.test(error.message)) throw error;
    }
    return true;
  },
});
