import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { subscriptionUpdateFromEvent } from '@/lib/stripe-events'

/**
 * Stripe fulfillment webhook.
 *
 * Records subscriptions in the `subscriptions` table (created by
 * scripts/013_security_hardening.sql) so plan entitlements can be checked
 * server-side instead of trusting a ?payment=success URL.
 *
 * Setup: Stripe Dashboard → Developers → Webhooks → add endpoint
 *   https://<your-domain>/api/stripe/webhook
 * with events: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, customer.subscription.updated,
 * customer.subscription.deleted. Put the signing secret in
 * STRIPE_WEBHOOK_SECRET.
 */

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const convexUrl = process.env.CONVEX_URL
  if (!convexUrl) return NextResponse.json({ error: 'Convex is not configured.' }, { status: 503 })
  const convex = new ConvexHttpClient(convexUrl)

  try {
    const update = subscriptionUpdateFromEvent(event)
    if (update) await convex.mutation(api.subscriptions.fulfillFromStripe, { webhookSecret: WEBHOOK_SECRET, ...update })
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
