import type Stripe from 'stripe'

export type SubscriptionUpdate = {
  legacyUserId?: string
  plan: string
  status: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: number
}

/**
 * Turns a verified Stripe event into the subscription change to record, or null when the event changes nothing.
 * - A completed Checkout only grants access once Stripe says it is paid; delayed payment methods report the result
 *   later through async_payment_succeeded / async_payment_failed.
 * - Subscription updates and deletions carry the learner id stamped at checkout, and otherwise the subscription id, so
 *   cancellations, failed renewals and disputes made in Stripe reach the app.
 */
export function subscriptionUpdateFromEvent(event: Stripe.Event): SubscriptionUpdate | null {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (!session.client_reference_id) return null
      const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
      const status = event.type === 'checkout.session.async_payment_failed' ? 'incomplete' : paid ? 'active' : 'incomplete'
      return {
        legacyUserId: session.client_reference_id,
        plan: session.metadata?.plan ?? 'professional',
        status,
        ...(typeof session.customer === 'string' ? { stripeCustomerId: session.customer } : {}),
        ...(typeof session.subscription === 'string' ? { stripeSubscriptionId: session.subscription } : {}),
      }
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription & { current_period_end?: number }
      const legacyUserId = typeof sub.metadata?.legacyUserId === 'string' && sub.metadata.legacyUserId ? sub.metadata.legacyUserId : undefined
      return {
        ...(legacyUserId ? { legacyUserId } : {}),
        plan: sub.metadata?.plan ?? 'professional',
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : undefined,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: (sub.current_period_end ?? 0) * 1000,
      }
    }
    default:
      return null
  }
}
