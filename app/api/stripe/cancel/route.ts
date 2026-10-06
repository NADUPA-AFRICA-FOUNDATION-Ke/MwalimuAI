import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { requireAuthUser } from '@/lib/require-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { reportServerError } from '@/lib/report-error'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

/**
 * Ends the signed-in learner's paid plan now (used before deleting an account, so nobody is billed for an
 * account that no longer exists). Ownership comes from their own session, never from the request body.
 */
export async function POST(req: Request) {
  const { userId, error } = await requireAuthUser(req)
  if (error) return error
  const limit = rateLimit(`stripe-cancel:${userId}`, 5, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Billing is not available right now. Please contact support.', code: 'payments_unavailable' }, { status: 503 })

  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !userId) return NextResponse.json({ error: 'Please sign in again.', code: 'unauthenticated' }, { status: 401 })
  const convex = new ConvexHttpClient(url)
  convex.setAuth(req.headers.get('authorization')!.replace(/^Bearer\s+/i, ''))
  try {
    const { subscription } = await convex.query(api.subscriptions.mine, {})
    if (!subscription?.stripeSubscriptionId || subscription.plan === 'free') return NextResponse.json({ ok: true, cancelled: false })
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId).catch((e: unknown) => {
      // Already cancelled on Stripe's side is fine; anything else is a real failure.
      if (!(e instanceof Stripe.errors.StripeInvalidRequestError && /No such subscription|already been canceled/i.test(e.message))) throw e
    })
    await convex.mutation(api.subscriptions.fulfillFromStripe, {
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, legacyUserId: userId, plan: subscription.plan, status: 'canceled',
      stripeCustomerId: subscription.stripeCustomerId, stripeSubscriptionId: subscription.stripeSubscriptionId,
    })
    return NextResponse.json({ ok: true, cancelled: true })
  } catch (e) {
    void reportServerError('api', e, '/api/stripe/cancel')
    return NextResponse.json({ error: 'We could not cancel your plan. Please try again or contact support.', code: 'cancel_failed' }, { status: 502 })
  }
}
