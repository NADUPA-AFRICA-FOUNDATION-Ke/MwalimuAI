'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <link rel="preconnect" href="https://images.unsplash.com" />

      {/* ════════════════════ HEADER ════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="w-9 h-9" />
            <span className={`font-bold text-base tracking-tight transition-colors duration-300 ${scrolled ? 'text-foreground' : 'text-white'}`}>
              Mwalimu AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {[['Features','/features'],['Pricing','/pricing'],['About','/about'],['Blog','/blog']].map(([l,h]) => (
              <Link key={h} href={h}
                className={`px-4 py-2 text-[13.5px] font-medium transition-colors duration-300 rounded-lg hover:bg-white/10 ${scrolled ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60' : 'text-white/75 hover:text-white'}`}>
                {l}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden md:block">
              <Button variant="ghost" size="sm"
                className={`text-[13.5px] h-9 px-4 rounded-lg font-medium transition-colors duration-300 ${scrolled ? 'text-foreground hover:bg-muted/60' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up" className="hidden md:block">
              <Button size="sm"
                className={`text-[13.5px] h-9 px-5 rounded-xl font-semibold transition-all duration-300 ${scrolled ? 'bg-primary text-white btn-primary-glow' : 'bg-accent text-white hover:bg-accent/90'}`}>
                Start free →
              </Button>
            </Link>
            <button onClick={() => setMenuOpen(v => !v)}
              className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? 'hover:bg-muted/60 text-foreground' : 'text-white hover:bg-white/10'}`}
              aria-label="Toggle menu">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className={`md:hidden overflow-hidden transition-all duration-250 ${menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}
          style={{ background: scrolled ? 'rgba(255,255,255,0.96)' : 'var(--hero-bg)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="px-5 py-4 flex flex-col gap-1">
            {[['Features','/features'],['Pricing','/pricing'],['About','/about'],['Blog','/blog']].map(([l,h]) => (
              <Link key={h} href={h} onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${scrolled ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                {l}
              </Link>
            ))}
            <div className="flex gap-2 pt-3 mt-1 border-t border-white/10">
              <Link href="/auth/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-xl h-10">Sign in</Button>
              </Link>
              <Link href="/auth/sign-up" className="flex-1" onClick={() => setMenuOpen(false)}>
                <Button className="w-full rounded-xl h-10 font-semibold">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════ HERO ══════════════════════════ */}
      <section className="relative overflow-hidden pt-[68px] hero-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none hero-bg-radial" />

        <div className="relative max-w-4xl mx-auto px-5 md:px-10 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up hero-bg-border">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-ping-soft" />
            <span className="text-xs font-semibold text-white/80">Built for Kenya&apos;s 300,000+ CBC teachers</span>
          </div>

          <h1 className="font-black tracking-tight leading-[1.04] mb-7">
            <span className="block text-[3rem] sm:text-[4.2rem] lg:text-[5.2rem] text-white animate-fade-in animation-delay-100">
              Great teachers
            </span>
            <span className="block text-[3rem] sm:text-[4.2rem] lg:text-[5.2rem] text-white animate-fade-in animation-delay-150">
              aren&apos;t born.
            </span>
            <span className="block animate-fade-in animation-delay-200">
              <span className="inline-flex flex-col items-stretch gap-1">
                <span className="text-[3rem] sm:text-[4.2rem] lg:text-[5.2rem] text-accent">
                  They&apos;re built.
                </span>
                <svg aria-hidden className="w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none" fill="none">
                  <path pathLength="1" d="M0 7 C 50 1, 110 9.5, 150 5 C 190 0.5, 250 9, 300 5"
                    style={{ stroke: 'var(--accent)' }} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="1" className="animate-hero-underline" />
                </svg>
              </span>
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/55 leading-relaxed mb-10 max-w-lg mx-auto animate-fade-in-up animation-delay-300">
            Mwalimu AI gives Kenya&apos;s CBC teachers a personal AI coach, KICD-aligned learning modules,
            and a community of educators in every county — completely free.
          </p>

          <form
            className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto animate-fade-in-up animation-delay-400"
            onSubmit={e => { e.preventDefault(); window.location.href = '/auth/sign-up' }}
          >
            <input
              type="email"
              placeholder="Enter your school email"
              className="flex-1 h-12 rounded-xl px-4 text-[14px] font-medium text-foreground placeholder:text-gray-400 bg-white border-0 outline-none focus:ring-2 focus:ring-accent"
            />
            <button type="submit"
              className="h-12 px-6 rounded-xl font-semibold text-[14px] text-white whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: 'var(--primary)' }}>
              Get started free →
            </button>
          </form>
          <p className="text-xs text-white/30 mt-3 animate-fade-in-up animation-delay-500">
            Free forever · No credit card required
          </p>
        </div>

        <div className="h-24 mt-8 hero-bg-fade" />
      </section>

      {/* ════════════════════ SECTIONS ══════════════════════ */}
      <StatsSection />
      <ProductShowcase />
      <FeaturesSection />
      <SplitSection />
      <ComparisonSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FaqSection />
      <CTASection />

      {/* ════════════════════ FOOTER ════════════════════════ */}
      <footer className="bg-foreground py-16">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-5 w-fit">
                <BrandMark className="w-9 h-9" />
                <span className="font-bold text-base text-white tracking-tight">Mwalimu AI</span>
              </Link>
              <p className="text-sm text-white/40 max-w-[200px] leading-relaxed">
                Empowering Kenyan teachers with AI-powered CBC professional development.
              </p>
              <div className="flex items-center gap-1 mt-5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" style={{ fill: 'var(--accent)' }} className="w-3.5 h-3.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
                <span className="text-[11px] text-white/30 ml-1.5">4,800+ teachers</span>
              </div>
            </div>
            {[
              { title: 'Product',   links: [['/features','Features'],['/pricing','Pricing'],['/blog','Blog']] },
              { title: 'Company',   links: [['/about','About'],['/contact','Contact'],['/privacy','Privacy']] },
              { title: 'Resources', links: [['/docs','Documentation'],['/faq','FAQ'],['/support','Support']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-5">{title}</h4>
                <ul className="space-y-3.5">
                  {links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-white/45 hover:text-white transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/25">&copy; 2026 Mwalimu AI · All rights reserved · Nairobi, Kenya</p>
            <div className="flex items-center gap-5 text-xs text-white/25">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy policy</Link>
              <Link href="/docs"    className="hover:text-white/60 transition-colors">Documentation</Link>
              <Link href="/contact" className="hover:text-white/60 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
