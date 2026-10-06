'use client'

import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import {
  BookOpen, Zap, Users, Award, MessageSquare, TrendingUp,
  Brain, FileText, Globe, Building2, Shield, Smartphone,
  Check, ArrowRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFadeIn } from '@/hooks/use-scroll-animations'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

/**
 * Each entry describes something the product does today; the sentence in `where` says where to find it so a visitor
 * can check. Counts come from the live content (convex/siteFacts.ts), not from copy written here.
 */
function buildFeatures(f: { paths: number; lessons: number } | undefined) {
  return [
    { icon: BookOpen, title: 'Structured learning paths', desc: `Lessons, quizzes, an assignment and a final assessment in a set order.${f && f.paths > 0 ? ` ${f.paths} paths with ${f.lessons} lessons are published today.` : ''}`, where: 'Dashboard → Learn' },
    { icon: Zap, title: 'AI Coach', desc: 'Ask about lesson planning, assessment and classroom situations. Answers can be wrong, so check them against your own judgement and school guidance.', where: 'Dashboard → AI Coach' },
    { icon: Brain, title: 'AI teaching tools', desc: 'Lesson Plan Generator, Report Card Comments, Differentiation Advisor, Parent Communication Helper, AI Lesson Rehearsal, Assignment Feedback, Action Research Guide and Policy Explainer.', where: 'Dashboard → Tools' },
    { icon: MessageSquare, title: 'Needs assessment', desc: 'A short questionnaire that recommends which learning path to start with.', where: 'Dashboard → Assessment' },
    { icon: Award, title: 'Certificates anyone can verify', desc: 'Finish a path and earn a certificate with a serial number. Anyone can check it on the public verification page.', where: '/verify' },
    { icon: TrendingUp, title: 'Progress, streaks and badges', desc: 'See completed lessons and assessment results, keep a learning streak, and collect milestone badges.', where: 'Dashboard → Progress' },
    { icon: Users, title: 'Community forum', desc: 'Post questions, reply to other teachers and share classroom ideas. Staff moderate reported posts.', where: 'Dashboard → Community' },
    { icon: Globe, title: 'English and Kiswahili', desc: 'Switch language in the app. Lessons appear in Kiswahili where a translation has been published, otherwise in English.', where: 'Settings → Language' },
    { icon: Smartphone, title: 'Offline lessons', desc: 'Save a learning path to your device and read its lessons without a connection. The AI Coach and tools always need internet.', where: 'On a learning path → Save for offline' },
    { icon: Building2, title: 'School dashboard', desc: 'On the School plan, a head teacher shares a code and sees teachers’ lessons finished, certificates and last activity. Journals, AI conversations and messages stay private.', where: 'Dashboard → School' },
    { icon: FileText, title: 'Resource library', desc: 'Links to official curriculum, assessment and Ministry of Education sources, so you can read the originals.', where: 'Dashboard → Resources' },
    { icon: Shield, title: 'Your data, your control', desc: 'Download everything we hold about you, or delete your account, from Settings.', where: 'Dashboard → Settings' },
  ]
}

const highlights = [
  { label: 'Learning paths with certificates', icon: BookOpen },
  { label: 'AI Coach and tools', icon: Zap },
  { label: 'Teacher community', icon: Users },
  { label: 'Progress tracking', icon: TrendingUp },
]

export default function FeaturesPage() {
  const facts = useQuery(api.siteFacts.facts, {})
  const features = buildFeatures(facts)
  const { ref: heroRef, visible: heroVisible } = useFadeIn<HTMLDivElement>(0.1)
  const { ref: gridRef, visible: gridVisible } = useFadeIn<HTMLElement>(0.04)

  return (
    <div className="min-h-screen bg-card">

      <MarketingHeader activePath="/features" />

      <main>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 hero-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none hero-bg-radial" />
        <div ref={heroRef} className={`relative max-w-4xl mx-auto px-5 md:px-10 pt-12 text-center transition-all duration-700 ${heroVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <h1 className="text-[2.8rem] md:text-[3.6rem] font-black text-white tracking-tight leading-[1.06] mb-5">
            Learning and planning tools for<br />
            <span className="text-accent">CBC teachers</span>
          </h1>
          <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl mx-auto mb-8">
            Learning paths, an AI Coach and teaching tools, a teacher community, and verifiable certificates, in one web app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="text-sm px-6 py-3 rounded-xl font-bold bg-card text-primary hover:bg-card/95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-0">
              <Link href="/auth/sign-up">
                Create an account <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-card/10 text-sm px-5 py-3 rounded-xl">
              <Link href="/pricing">
                View pricing
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-10">
            {highlights.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 text-white/80 text-sm">
                <Check className="w-4 h-4 text-accent" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section ref={gridRef} className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className={`text-center mb-14 transition-all duration-700 ${gridVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Platform Features</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              Tools built for the way you teach
            </h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Each feature below says where to find it, so you can check it for yourself.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`card-premium rounded-2xl p-7 transition-all duration-700 ${gridVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}
                style={{ transitionDelay: `${(i % 9) * 50}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5.5 h-5.5 text-primary" />
                </div>
                <h3 className="font-bold text-base text-foreground mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                <p className="mt-3 text-xs font-medium text-primary">Where: {feature.where}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 hero-bg relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] pointer-events-none hero-bg-radial" />
        <div className="relative max-w-2xl mx-auto px-5 md:px-10 text-center">
          <h2 className="text-[2.2rem] md:text-[2.8rem] font-black text-white tracking-tight leading-[1.06] mb-4">
            A practical place to keep<br />
            <span className="text-accent">learning</span>
          </h2>
          <p className="text-white/80 text-base leading-relaxed mb-8 max-w-lg mx-auto">
            Create an account to explore the platform.
          </p>
          <Button asChild size="lg" className="text-sm px-6 py-3 rounded-xl font-bold bg-card text-primary hover:bg-card/95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-0">
            <Link href="/auth/sign-up">
              Create an account <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      </main>

      <MarketingFooter />
    </div>
  )
}
