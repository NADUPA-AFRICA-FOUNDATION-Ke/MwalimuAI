'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing-header'
import { BrandMark } from '@/components/brand-mark'

// Everything below the hero is code-split into its own chunk so the initial
// bundle only carries the header + hero — the page becomes interactive sooner
// on slow connections. The sections are still server-rendered (SSR stays on
// by default with next/dynamic), so the HTML arrives complete either way.
const sections = () => import('@/components/marketing/sections')
const StatsSection        = dynamic(() => sections().then(m => m.StatsSection))
const ProductShowcase     = dynamic(() => sections().then(m => m.ProductShowcase))
const FeaturesSection     = dynamic(() => sections().then(m => m.FeaturesSection))
const SplitSection        = dynamic(() => sections().then(m => m.SplitSection))
const ComparisonSection   = dynamic(() => sections().then(m => m.ComparisonSection))
const HowItWorksSection   = dynamic(() => sections().then(m => m.HowItWorksSection))
const TestimonialsSection = dynamic(() => sections().then(m => m.TestimonialsSection))
const FaqSection          = dynamic(() => sections().then(m => m.FaqSection))
const CTASection          = dynamic(() => sections().then(m => m.CTASection))

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <link rel="preconnect" href="https://images.unsplash.com" />

      <MarketingHeader overlay />

      {/* ════════════════════ HERO ══════════════════════════ */}
      <main>
      <section className="relative overflow-hidden pt-[68px] hero-bg" aria-labelledby="home-heading">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none hero-bg-radial" />

        <div className="relative max-w-4xl mx-auto px-5 md:px-10 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up hero-bg-border">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-ping-soft" />
            <span className="text-xs font-semibold text-white">Professional learning for Kenyan CBC teachers</span>
          </div>

          <h1 id="home-heading" className="font-black tracking-tight leading-[1.04] mb-7">
            <span className="block text-[3rem] sm:text-[4.2rem] lg:text-[5.2rem] text-white animate-fade-in animation-delay-100">
              Learn, plan,
            </span>
            <span className="block text-[3rem] sm:text-[4.2rem] lg:text-[5.2rem] text-white animate-fade-in animation-delay-150">
              and reflect.
            </span>
            <span className="block animate-fade-in animation-delay-200">
              <span className="inline-flex flex-col items-stretch gap-1">
                <span className="text-[3rem] sm:text-[4.2rem] lg:text-[5.2rem] text-accent">
                  In one place.
                </span>
                <svg aria-hidden className="w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" fill="none">
                  <path pathLength="1" d="M0 7 C 50 1, 110 9.5, 150 5 C 190 0.5, 250 9, 300 5"
                    style={{ stroke: 'var(--color-accent-bright)' }} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="1" className="animate-hero-underline" />
                </svg>
              </span>
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/80 leading-relaxed mb-10 max-w-lg mx-auto animate-fade-in-up animation-delay-300">
            Mwalimu AI brings learning modules, an AI Coach, teacher tools, community discussions, and progress tracking into one workspace.
          </p>

          <form
            className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto animate-fade-in-up animation-delay-400"
            onSubmit={e => { e.preventDefault(); window.location.href = '/auth/sign-up' }}
            aria-label="Create a Mwalimu AI account"
          >
            <label htmlFor="homepage-email" className="sr-only">Email address</label>
            <input
              id="homepage-email"
              type="email"
              aria-label="Email address"
              aria-describedby="homepage-email-help"
              required
              placeholder="Enter your email"
              className="flex-1 h-12 rounded-xl px-4 text-[14px] font-medium text-foreground placeholder:text-gray-400 bg-white border-0 outline-none focus:ring-2 focus:ring-accent"
            />
            <button type="submit"
              className="h-11 px-5 rounded-xl font-semibold text-[13px] text-white whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: 'var(--primary)' }}>
              Create account →
            </button>
          </form>
          <p className="text-xs text-white/75 mt-3 animate-fade-in-up animation-delay-500">
            <span id="homepage-email-help">Create an account to explore the platform.</span>
          </p>
        </div>

        <div className="h-24 mt-8 hero-bg-fade" />
      </section>

      {/* ════════════════════ SECTIONS ══════════════════════ */}
      <StatsSection />
      <div className="marketing-lazy"><ProductShowcase /></div>
      <div className="marketing-lazy"><FeaturesSection /></div>
      <div className="marketing-lazy"><SplitSection /></div>
      <div className="marketing-lazy"><ComparisonSection /></div>
      <div className="marketing-lazy"><HowItWorksSection /></div>
      <div className="marketing-lazy"><TestimonialsSection /></div>
      <div className="marketing-lazy"><FaqSection /></div>
      <div className="marketing-lazy"><CTASection /></div>
      </main>

      {/* ════════════════════ FOOTER ════════════════════════ */}
      <footer className="bg-foreground py-16">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-5 w-fit">
                <BrandMark className="w-9 h-9" />
                <span className="font-bold text-base text-white tracking-tight">Mwalimu AI</span>
              </Link>
              <p className="text-sm text-white/75 max-w-[200px] leading-relaxed">
                Professional learning tools for Kenyan CBC teachers.
              </p>
            </div>
            {[
              { title: 'Product',   links: [['/features','Features'],['/pricing','Pricing'],['/blog','Blog']] },
              { title: 'Company',   links: [['/about','About'],['/contact','Contact'],['/privacy','Privacy'],['/terms','Terms']] },
              { title: 'Resources', links: [['/docs','Documentation'],['/faq','FAQ'],['/support','Support']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-5">{title}</h4>
                <ul className="space-y-3.5">
                  {links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-white/75 hover:text-white transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/70">&copy; 2026 Mwalimu AI · All rights reserved</p>
            <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-white/75">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/docs"    className="hover:text-white transition-colors">Documentation</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
