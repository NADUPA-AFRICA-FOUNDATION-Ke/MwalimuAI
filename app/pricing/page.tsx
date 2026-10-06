'use client'

import { useState, useEffect, Suspense } from 'react'
import { authedFetch } from '@/lib/authed-fetch'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Building2,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import { useProfile } from '@/context/profile-context'
import { describePaymentFailure, type PaymentFailure } from '@/lib/payment-errors'
import { cn } from '@/lib/utils'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { PAID_PLANS, formatKes } from '@/lib/plans'

type Facts = { aiPerDayFree: number; aiPerDayPaid: number; schoolMaxTeachers: number; paths: number } | undefined

/**
 * Every line here is something the product actually does today. Numbers come from the live system
 * (convex/siteFacts.ts) and prices from lib/plans.ts, the same definition the checkout charges from.
 */
function buildPlans(f: Facts) {
  const free = f ? `${f.aiPerDayFree}` : 'a daily allowance of'
  const paid = f ? `${f.aiPerDayPaid}` : 'a higher'
  return [
    {
      id: 'free' as const,
      name: 'Free',
      price: formatKes(0),
      period: 'no payment needed',
      description: 'Everything you need to learn on the platform, with a daily AI allowance.',
      icon: BookOpen,
      features: [
        'All published learning paths: lessons, quizzes, assignments and assessments',
        'A certificate you can verify online when you complete a path',
        f ? `AI Coach and AI tools: ${free} requests a day, resetting at midnight Kenya time` : 'AI Coach and AI tools, with a daily allowance that resets at midnight Kenya time',
        'Needs assessment with learning-path recommendations',
        'Community forum',
        'Progress tracking, streaks and badges',
        'Lessons you can save to your device and read offline',
      ],
      cta: 'Get started free',
      ctaHref: '/auth/sign-up',
      highlighted: false,
      stripeId: null,
    },
    {
      id: 'professional' as const,
      name: PAID_PLANS.professional.name,
      price: formatKes(PAID_PLANS.professional.kes),
      period: `per ${PAID_PLANS.professional.interval}`,
      description: 'A higher daily AI allowance for individual teachers.',
      icon: Sparkles,
      features: [
        'Everything in Free',
        f ? `${paid} AI Coach and AI tool requests a day, instead of ${free}` : 'A higher daily limit on AI Coach and AI tool requests',
        'Cancel from Settings whenever you like',
      ],
      cta: 'Start professional',
      ctaHref: null,
      highlighted: true,
      stripeId: 'professional',
    },
    {
      id: 'school' as const,
      name: PAID_PLANS.school.name,
      price: formatKes(PAID_PLANS.school.kes),
      period: `per ${PAID_PLANS.school.interval}`,
      description: 'For a head teacher who wants to see their staff’s learning progress.',
      icon: Building2,
      features: [
        'Everything in Professional, for the head teacher’s own account',
        f ? `A school dashboard for up to ${f.schoolMaxTeachers} teachers who join with your school code` : 'A school dashboard for teachers who join with your school code',
        'See each teacher’s lessons finished, certificates and last activity',
        'Journals, AI conversations, messages and contact details are never shown to the head teacher',
        'Teachers keep their own plan: the School plan does not raise their AI allowance',
      ],
      cta: 'Ask about the School plan',
      ctaHref: '/contact',
      highlighted: false,
      stripeId: null,
    },
  ]
}
type Plan = ReturnType<typeof buildPlans>[number]

function buildFaqs(f: Facts) {
  return [
    {
      q: 'What do I get by paying?',
      a: f
        ? `Today the Professional plan raises your daily AI allowance from ${f.aiPerDayFree} to ${f.aiPerDayPaid} requests. Learning paths, certificates, the community, progress tracking and offline lessons are the same on every plan. The School plan adds the head-teacher dashboard.`
        : 'The Professional plan raises your daily AI allowance. Learning paths, certificates, the community, progress tracking and offline lessons are the same on every plan. The School plan adds the head-teacher dashboard.',
    },
    {
      q: 'How do I pay?',
      a: `By card on Stripe’s secure checkout page, billed every month in Kenya shillings (${formatKes(PAID_PLANS.professional.kes)} Professional, ${formatKes(PAID_PLANS.school.kes)} School). Your card details go to Stripe; we never see or store them. You need to be signed in to subscribe.`,
    },
    {
      q: 'How do I cancel?',
      a: 'Open Settings → Your plan → Cancel my plan. Cancelling ends the plan straight away and you are not charged again. Your account, progress and certificates stay.',
    },
    {
      q: 'Can my school use the School plan?',
      a: 'Yes. Use the contact form to tell us about your school and our reply appears on your private conversation page. A head teacher on the School plan creates the school in the app, shares its code, and teachers join with it.',
    },
    {
      q: 'Does it work offline?',
      a: 'You can save lessons to your device and read them without a connection. The AI Coach and AI tools always need internet.',
    },
  ]
}

function PricingCard({
  plan,
  onCheckout,
  loading,
}: {
  plan: Plan
  onCheckout: (planId: string) => void
  loading: string | null
}) {
  const isLoading = loading === plan.id

  return (
    <div
      className={cn(
        'glass rounded-2xl p-8 flex flex-col transition-all duration-300 relative',
        plan.highlighted
          ? 'gradient-border hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/15'
          : 'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5'
      )}
    >
      {/* Highlighted plan */}
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg shadow-primary/30 whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            Professional plan
          </div>
        </div>
      )}

      {/* Plan header */}
      <div className={plan.highlighted ? 'pt-3' : ''}>
        <h3 className="text-xl font-bold tracking-tight mb-1">{plan.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mt-6 mb-7 pb-7 border-b border-border/50">
        <div className="flex items-end gap-1.5">
          <span
            className={cn(
              'text-4xl font-bold tracking-tight tabular-nums',
              plan.highlighted ? 'gradient-text' : ''
            )}
          >
            {plan.price}
          </span>
          <span className="text-muted-foreground text-sm pb-1">/ {plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 flex-1 mb-8">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan.stripeId ? (
        <Button
          className={cn(
            'w-full rounded-xl font-semibold transition-all duration-200',
            plan.highlighted ? 'shadow-lg shadow-primary/25 hover:-translate-y-0.5' : ''
          )}
          variant={plan.highlighted ? 'default' : 'outline'}
          onClick={() => onCheckout(plan.id)}
          disabled={!!loading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting…
            </>
          ) : (
            <>
              {plan.cta}
              {plan.highlighted && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </>
          )}
        </Button>
      ) : plan.ctaHref ? (
        <Button asChild
            className={cn(
              'w-full rounded-xl font-semibold transition-all',
              plan.highlighted ? 'shadow-lg shadow-primary/25' : 'hover:border-primary/40 hover:bg-primary/4'
            )}
            variant={plan.highlighted ? 'default' : 'outline'}
          >
            <Link href={plan.ctaHref}>{plan.cta}</Link>
          </Button>
      ) : null}
    </div>
  )
}

function PricingContent() {
  const facts = useQuery(api.siteFacts.facts, {})
  const plans = buildPlans(facts)
  const faqs = buildFaqs(facts)
  const searchParams = useSearchParams()
  const { user } = useProfile()
  const [loading, setLoading] = useState<string | null>(null)
  const [failure, setFailure] = useState<PaymentFailure | null>(null)
  const [lastPlan, setLastPlan] = useState<string | null>(null)

  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    if (canceled) setFailure(describePaymentFailure({ canceled: true }))
  }, [canceled])

  const handleCheckout = async (planId: string) => {
    setFailure(null)
    setLastPlan(planId)
    // Payment is tied to the account: say so up front instead of failing after a round trip.
    if (!user) {
      setFailure(describePaymentFailure({ code: 'unauthenticated' }))
      return
    }
    setLoading(planId)
    try {
      const res = await authedFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email: user?.email ?? undefined }),
      })
      const data = await res.json().catch(() => ({})) as { url?: string; code?: string }
      if (!res.ok || !data.url) {
        setFailure(describePaymentFailure({ status: res.status, code: data.code }))
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch {
      setFailure(describePaymentFailure({ offline: typeof navigator !== 'undefined' && !navigator.onLine }))
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">

      <MarketingHeader activePath="/pricing" />
      <main>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-secondary border-b border-border/70" aria-labelledby="pricing-heading">
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-20 pb-20 text-center">
          <h1 id="pricing-heading" className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
            Plans for individual teachers<br />
            <span className="text-primary">and school teams.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Review the current access options, then choose the plan that fits how you want to use Mwalimu AI.
          </p>
        </div>
      </section>

      {/* ── Checkout notice: what happened, whether money moved, what to do next ── */}
      {failure && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
          <div
            role={failure.tone === 'error' ? 'alert' : 'status'}
            className={cn('rounded-xl border p-4 md:p-5', failure.tone === 'error' ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-secondary')}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className={cn('mt-0.5 h-5 w-5 shrink-0', failure.tone === 'error' ? 'text-destructive' : 'text-muted-foreground')} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{failure.title}</p>
                <p className="mt-1 text-base text-muted-foreground">{failure.message}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {failure.action === 'signin' && (
                    <Button asChild size="lg" className="rounded-xl"><Link href="/auth/login">Sign in</Link></Button>
                  )}
                  {failure.action === 'retry' && lastPlan && lastPlan !== 'free' && (
                    <Button size="lg" className="rounded-xl" onClick={() => handleCheckout(lastPlan)} disabled={loading !== null}>Try again</Button>
                  )}
                  {failure.action === 'support' && (
                    <Button asChild size="lg" className="rounded-xl"><Link href="/support">Contact support</Link></Button>
                  )}
                  {failure.action !== 'support' && failure.tone === 'error' && (
                    <Button asChild size="lg" variant="outline" className="rounded-xl"><Link href="/support">Contact support</Link></Button>
                  )}
                  <Button size="lg" variant="ghost" className="rounded-xl" onClick={() => setFailure(null)}>Dismiss</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pricing cards ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className="sr-only">Available plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              onCheckout={handleCheckout}
              loading={loading}
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Paid checkout is handled through Stripe.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-24" aria-labelledby="pricing-faq-heading">
        <div className="text-center mb-12">
          <h2 id="pricing-faq-heading" className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Common questions</h2>
          <p className="text-muted-foreground">Everything you need to know before signing up.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map(({ q, a }) => (
            <div
              key={q}
              className="glass rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <h3 className="font-semibold text-sm mb-2.5">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-muted-foreground mb-4">Still have questions?</p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline" className="rounded-xl font-medium hover:border-primary/40 hover:bg-primary/4 transition-all">
              <Link href="/faq">Browse FAQ</Link>
            </Button>
            <Button asChild className="rounded-xl font-medium shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
              <Link href="/contact">
                Contact us
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      </main>
      <MarketingFooter />
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
