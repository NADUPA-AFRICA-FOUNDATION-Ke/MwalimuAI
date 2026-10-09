import Stripe from 'stripe'
import { PAID_PLANS, amountInSenti, type PaidPlanId } from '@/lib/plans'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/require-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set — Stripe checkout will not work.')
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const PLANS: Record<string, { name: string; amount: number; interval: 'month' | 'year' }> = Object.fromEntries(
  (Object.keys(PAID_PLANS) as PaidPlanId[]).map((id) => [id, { name: PAID_PLANS[id].checkoutName, amount: amountInSenti(id), interval: PAID_PLANS[id].interval }]),
)

export async function POST(req: NextRequest) {
  const { userId, error: authError } = await requireAuthUser(req)
  if (authError) return authError

  const limit = rateLimit(`checkout:${userId}`, 10, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)

  if (!stripe) {
    // Operators see the real reason in the server log; learners get a plain message.
    console.error('[stripe/checkout] STRIPE_SECRET_KEY is not set, so checkout is unavailable.')
    return NextResponse.json(
      { error: 'Online payment is not available right now.', code: 'payments_unavailable' },
      { status: 503 },
    )
  }

  let plan: string
  let customerEmail: string | undefined
  try {
    const body = await req.json()
    plan = body.plan
    customerEmail = body.email
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', code: 'invalid_request' }, { status: 400 })
  }

  const planConfig = PLANS[plan]
  if (!planConfig) {
    return NextResponse.json({ error: 'Unknown plan.', code: 'invalid_request' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // Ties the Stripe session to the authenticated user so the webhook
      // can record fulfillment against the right account.
      client_reference_id: userId ?? undefined,
      metadata: { plan },
      // Stamped on the subscription too, so later lifecycle events (cancel, failed renewal) can find the learner.
      ...(userId ? { subscription_data: { metadata: { legacyUserId: userId, plan } } } : {}),
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'kes',
            product_data: { name: planConfig.name },
            unit_amount: planConfig.amount,
            recurring: { interval: planConfig.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/dashboard?payment=success&plan=${plan}`,
      cancel_url:  `${APP_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    // Log the detail server-side; never echo Stripe internals to the client
    console.error('[stripe/checkout] session creation failed:', err)
    return NextResponse.json({ error: 'Could not start checkout.', code: 'checkout_failed' }, { status: 500 })
  }
}
