import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentProfile } from "./lib/auth";

const plan = v.union(v.literal("free"), v.literal("professional"), v.literal("school"));
const paidPlan = v.union(v.literal("professional"), v.literal("school"));
const status = v.union(v.literal("pending"), v.literal("active"), v.literal("trialing"), v.literal("past_due"), v.literal("canceled"), v.literal("incomplete"), v.literal("incomplete_expired"), v.literal("unpaid"), v.literal("paused"));
const subscriptionDoc = v.object({
  _id: v.id("subscriptions"), _creationTime: v.number(), userId: v.id("profiles"), legacyId: v.optional(v.string()),
  plan, status, requestedPlan: v.optional(paidPlan), stripeCustomerId: v.optional(v.string()), stripeSubscriptionId: v.optional(v.string()),
  currentPeriodEnd: v.optional(v.number()), cancelAtPeriodEnd: v.optional(v.boolean()), createdAt: v.number(), updatedAt: v.number(),
});
const entitlement = v.object({ plan, status, isPaid: v.boolean(), requestedPlan: v.optional(paidPlan), currentPeriodEnd: v.optional(v.number()), cancelAtPeriodEnd: v.optional(v.boolean()) });

export const mine = query({
  args: {}, returns: v.object({ subscription: v.union(v.null(), subscriptionDoc), entitlement }),
  handler: async (ctx) => {
    const profile = await requireCurrentProfile(ctx);
    const subscription = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).unique();
    const effectivePlan = subscription?.plan ?? "free";
    const effectiveStatus = subscription?.status ?? "active";
    return { subscription, entitlement: { plan: effectivePlan, status: effectiveStatus,
      isPaid: effectivePlan !== "free" && (effectiveStatus === "active" || effectiveStatus === "trialing"),
      ...(subscription?.requestedPlan ? { requestedPlan: subscription.requestedPlan } : {}),
      ...(subscription?.currentPeriodEnd !== undefined ? { currentPeriodEnd: subscription.currentPeriodEnd } : {}),
      ...(subscription?.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: subscription.cancelAtPeriodEnd } : {}) } };
  },
});

// Records intent only. Billing webhooks must remain the authority for paid access.
export const requestPlanChange = mutation({
  args: { requestedPlan: paidPlan }, returns: v.id("subscriptions"),
  handler: async (ctx, { requestedPlan }) => {
    const profile = await requireCurrentProfile(ctx); const now = Date.now();
    const existing = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).unique();
    if (existing) { await ctx.db.patch(existing._id, { requestedPlan, updatedAt: now }); return existing._id; }
    return await ctx.db.insert("subscriptions", { userId: profile._id, plan: "free", status: "active", requestedPlan, createdAt: now, updatedAt: now });
  },
});

export const fulfillFromStripe = mutation({
  args: { webhookSecret: v.string(), legacyUserId: v.string(), plan: v.string(), status: v.string(), stripeCustomerId: v.optional(v.string()), stripeSubscriptionId: v.optional(v.string()), currentPeriodEnd: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET || args.webhookSecret !== process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Invalid webhook secret");
    const profile = await ctx.db.query("profiles").withIndex("by_legacy_supabase_user_id", (q) => q.eq("legacySupabaseUserId", args.legacyUserId)).unique();
    if (!profile) throw new Error("Profile not found for subscription event");
    const existing = await ctx.db.query("subscriptions").withIndex("by_user", (q) => q.eq("userId", profile._id)).unique();
    const value = { plan: args.plan === "school" ? "school" as const : "professional" as const, status: args.status === "active" ? "active" as const : args.status === "trialing" ? "trialing" as const : args.status === "canceled" ? "canceled" as const : "past_due" as const, ...(args.stripeCustomerId ? { stripeCustomerId: args.stripeCustomerId } : {}), ...(args.stripeSubscriptionId ? { stripeSubscriptionId: args.stripeSubscriptionId } : {}), ...(args.currentPeriodEnd !== undefined ? { currentPeriodEnd: args.currentPeriodEnd } : {}), updatedAt: Date.now() };
    if (existing) { await ctx.db.patch(existing._id, value); return existing._id; }
    return await ctx.db.insert("subscriptions", { userId: profile._id, ...value, createdAt: Date.now() });
  },
});
