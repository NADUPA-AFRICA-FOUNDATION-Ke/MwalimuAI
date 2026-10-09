// @vitest-environment node
import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { subscriptionUpdateFromEvent } from "@/lib/stripe-events";

const ev = (type: string, object: Record<string, unknown>) => ({ type, data: { object } }) as unknown as Stripe.Event;
const session = (payment_status: string) => ({ client_reference_id: "learner-1", payment_status, metadata: { plan: "school" }, customer: "cus_1", subscription: "sub_1" });

describe("Stripe events to subscription changes", () => {
  it("grants access on a completed checkout only once it is paid", () => {
    expect(subscriptionUpdateFromEvent(ev("checkout.session.completed", session("paid")))).toMatchObject({ legacyUserId: "learner-1", plan: "school", status: "active", stripeSubscriptionId: "sub_1" });
    expect(subscriptionUpdateFromEvent(ev("checkout.session.completed", session("unpaid")))?.status).toBe("incomplete");
    expect(subscriptionUpdateFromEvent(ev("checkout.session.async_payment_succeeded", session("paid")))?.status).toBe("active");
    expect(subscriptionUpdateFromEvent(ev("checkout.session.async_payment_failed", session("unpaid")))?.status).toBe("incomplete");
  });

  it("passes cancellations and failed renewals on even without learner metadata on the subscription", () => {
    const deleted = subscriptionUpdateFromEvent(ev("customer.subscription.deleted", { id: "sub_1", status: "canceled", metadata: {}, customer: "cus_1" }));
    expect(deleted).toMatchObject({ status: "canceled", stripeSubscriptionId: "sub_1" });
    expect(deleted).not.toHaveProperty("legacyUserId");
    expect(subscriptionUpdateFromEvent(ev("customer.subscription.updated", { id: "sub_1", status: "past_due", metadata: { legacyUserId: "learner-1" } }))).toMatchObject({ legacyUserId: "learner-1", status: "past_due" });
    expect(subscriptionUpdateFromEvent(ev("invoice.paid", {}))).toBeNull();
  });
});
