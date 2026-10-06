import { ConvexError, v } from "convex/values";
import { getAuthUserId, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const emailOf = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => (await ctx.db.get(userId))?.email?.trim().toLowerCase() ?? null,
});

/** Change your own password from Settings, proving the current one. No email is involved. */
export const changeMine = action({
  args: { current: v.string(), next: v.string() },
  returns: v.null(),
  handler: async (ctx, { current, next }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Please sign in again." });
    if (next.length < 8 || next.length > 200) throw new ConvexError({ code: "INVALID_ARGUMENT", message: "The new password must be at least 8 characters." });
    const email = await ctx.runQuery(internal.passwords.emailOf, { userId });
    if (!email) throw new ConvexError({ code: "NO_PASSWORD", message: "This account does not use a password." });
    try {
      await retrieveAccount(ctx, { provider: "password", account: { id: email, secret: current } });
    } catch {
      throw new ConvexError({ code: "WRONG_PASSWORD", message: "Your current password is not correct." });
    }
    await modifyAccountCredentials(ctx, { provider: "password", account: { id: email, secret: next } });
    return null;
  },
});
