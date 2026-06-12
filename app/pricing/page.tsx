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
  Menu,
  X,
  Zap,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { useProfile } from '@/context/profile-context'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 'KES 0',
    period: 'forever',
    description: 'Start your CBC professional development at no cost.',
    icon: BookOpen,
    features: [
      'Access to 3 learning modules',
      'AI Coach (10 messages / day)',
      'Community forum access',
      'Basic progress tracking',
      'Mobile-responsive access',
    ],
    cta: 'Get started free',
    ctaHref: '/auth/sign-up',
    highlighted: false,
    stripeId: null,
  },
  {
    id: 'professional' as const,
    name: 'Professional',
    price: 'KES 500',
    period: 'per month',
    description: 'Full platform access for educators committed to CBC mastery.',
    icon: Sparkles,
    features: [
      'All learning modules',
      'Unlimited AI Coach access',
      'Priority community support',
      'Downloadable resources',
      'Certificate of completion',
      'Advanced progress analytics',
      'Offline content access',
    ],
    cta: 'Start professional',
    ctaHref: null,
    highlighted: true,
    stripeId: 'professional',
  },
  {
    id: 'school' as const,
    name: 'School',
    price: 'KES 3,000',
    period: 'per month',
    description: 'Train your whole staff. One plan, up to 20 teachers.',
    icon: Building2,
    features: [
      'Everything in Professional',
      'Up to 20 teacher accounts',
      'Admin dashboard',
      'School-wide analytics',
      'Custom learning paths',
      'Dedicated support',
      'On-site training workshops',
    ],
    cta: 'Contact sales',
    ctaHref: '/contact',
    highlighted: false,
    stripeId: null,
  },
]

const faqs = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. Upgrade or downgrade whenever you want. Changes take effect at the start of your next billing cycle with no penalties.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept M-Pesa, Visa, Mastercard, and local bank transfers through our secure Stripe-powered checkout.',
  },
  {
    q: 'Is the content aligned with KICD standards?',
    a: 'Every module is designed to the Kenya Institute of Curriculum Development CBC framework and reviewed on a regular basis.',
  },
  {
    q: 'What happens after the free tier?',
    a: 'There are no automatic charges. You stay on the Free plan until you decide to upgrade. No credit card required to start.',
  },
  {
    q: 'Does the School plan include onboarding support?',
    a: 'Yes. Every School subscription includes a dedicated onboarding session and priority support throughout your first 30 days.',
  },
  {
    q: 'Can teachers access content offline?',
    a: 'Offline access is available on Professional and School plans. Downloaded content stays available for 30 days without a connection.',
  },
]

function PricingCard({
  plan,
  onCheckout,
  loading,
}: {
  plan: typeof plans[number]
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
      {/* Most popular badge */}
      {plan.highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg shadow-primary/30 whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            Most popular
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
        <Link href={plan.ctaHref} className="block">
          <Button
            className={cn(
              'w-full rounded-xl font-semibold transition-all',
              plan.highlighted ? 'shadow-lg shadow-primary/25' : 'hover:border-primary/40 hover:bg-primary/4'
            )}
            variant={plan.highlighted ? 'default' : 'outline'}
          >
            {plan.cta}
          </Button>
        </Link>
      ) : null}
    </div>
  )
}

function PricingContent() {
  const searchParams = useSearchParams()
  const { user } = useProfile()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    if (canceled) setError("Payment was canceled. Try again whenever you're ready.")
  }, [canceled])

  const handleCheckout = async (planId: string) => {
    setError(null)
    setLoading(planId)
    try {
      const res = await authedFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          email: user?.email ?? undefined,
        }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not create checkout session.')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Header ── */}
      <header className="glass sticky top-0 z-50 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">

          <Link href="/" className="flex items-center gap-2.5 group">
            <BrandMark className="w-9 h-9 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-bold text-lg tracking-tight">Mwalimu AI</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/features', label: 'Features' },
              { href: '/pricing',  label: 'Pricing'  },
              { href: '/about',    label: 'About'    },
              { href: '/blog',     label: 'Blog'     },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-lg transition-colors group',
                  href === '/pricing'
                    ? 'text-foreground bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                )}
              >
                {label}
                {href === '/pricing' && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden md:block">
              <Button variant="ghost" size="sm" className="font-medium hover:text-primary hover:bg-primary/8 rounded-xl transition-all">
                Log in
              </Button>
            </Link>
            <Link href="/auth/sign-up" className="hidden md:block">
              <Button size="sm" className="font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 px-5">
                Get started
              </Button>
            </Link>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2 hover:bg-muted rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-white/30 ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-3 flex flex-col gap-1">
            {[
              { href: '/features', label: 'Features' },
              { href: '/pricing',  label: 'Pricing'  },
              { href: '/about',    label: 'About'    },
              { href: '/blog',     label: 'Blog'     },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium rounded-xl hover:bg-primary/8 hover:text-foreground text-muted-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3 mt-1 border-t border-border/50">
              <Link href="/auth/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-xl">Log in</Button>
              </Link>
              <Link href="/auth/sign-up" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button className="w-full rounded-xl">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden mesh-bg">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-16 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-20 right-20 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-blob animation-delay-3000" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-blob animation-delay-6000" />
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2.5 glass-subtle border-primary/25 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in-up">
            <Zap className="w-3.5 h-3.5" />
            Simple, transparent pricing
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-5 animate-fade-in animation-delay-100">
            Invest in your teaching.{' '}
            <span className="gradient-text">Start free.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            Every plan includes CBC-aligned content. Upgrade when you&apos;re ready for the full experience.
          </p>
        </div>
      </section>

      {/* ── Error banner ── */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* ── Pricing cards ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-10 -mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 items-start">
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
          Payments processed securely by Stripe. Cancel anytime. No hidden fees.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-24 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Common questions</h2>
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
            <Link href="/faq">
              <Button variant="outline" className="rounded-xl font-medium hover:border-primary/40 hover:bg-primary/4 transition-all">
                Browse FAQ
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="rounded-xl font-medium shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all">
                Contact us
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 bg-muted/20 py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <BrandMark className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-bold tracking-tight">Mwalimu AI</span>
            </Link>
            <p className="text-xs text-muted-foreground order-last md:order-none">
              © 2026 Mwalimu AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy policy</Link>
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
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
