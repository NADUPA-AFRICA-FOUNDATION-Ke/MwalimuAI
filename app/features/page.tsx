'use client'

import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import {
  BookOpen, Zap, Users, Award, MessageSquare, TrendingUp,
  Brain, FileText, Target, Clock, Shield, Smartphone,
  Check, ArrowRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFadeIn } from '@/hooks/use-scroll-animations'

const features = [
  { icon: BookOpen,      title: 'Structured Learning Modules', desc: 'Work through lessons, activities, and quizzes in a clear sequence.' },
  { icon: Zap,           title: 'AI Coach Support',            desc: 'Ask questions about planning, assessment, classroom management, or teaching strategies.' },
  { icon: Users,         title: 'Community Forum',             desc: 'Post questions, reply to other teachers, and share classroom resources.' },
  { icon: Award,         title: 'Achievement Badges',          desc: 'See milestone badges and certificates connected to completed learning work.' },
  { icon: MessageSquare, title: 'Needs Assessment',            desc: 'Answer a short assessment to identify a starting point for your learning.' },
  { icon: TrendingUp,    title: 'Progress Tracking',           desc: 'Review completed lessons, assessment results, and learning activity from your dashboard.' },
  { icon: Brain,         title: 'CBC-Specific Content',         desc: 'Read modules and resources focused on CBC teaching topics.' },
  { icon: FileText,      title: 'Downloadable Resources',      desc: 'Open practical resources, guides, and templates from the resources area.' },
  { icon: Target,        title: 'Competency Mapping',          desc: 'Use competency and level information included in selected learning content.' },
  { icon: Clock,         title: 'Flexible Learning',           desc: 'Return to lessons and tools when your schedule allows.' },
  { icon: Shield,        title: 'Offline Access',              desc: 'Use supported saved content when a connection is unavailable; AI Coach responses still need internet.' },
  { icon: Smartphone,    title: 'Mobile Friendly',             desc: 'Use the responsive web app on a phone, tablet, or computer.' },
]

const highlights = [
  { label: 'Interactive modules',   icon: BookOpen      },
  { label: 'AI coaching',           icon: Zap            },
  { label: 'Community discussions', icon: Users          },
  { label: 'Progress tracking',     icon: TrendingUp    },
]

export default function FeaturesPage() {
  const { ref: heroRef, visible: heroVisible } = useFadeIn<HTMLDivElement>(0.1)
  const { ref: gridRef, visible: gridVisible } = useFadeIn<HTMLElement>(0.04)

  return (
    <div className="min-h-screen bg-white">

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
            Mwalimu AI brings together learning modules, AI coaching, teacher tools, community discussions, and progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="text-[14px] px-6 py-3 rounded-xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-0">
              <Link href="/auth/sign-up">
                Create an account <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[14px] px-5 py-3 rounded-xl">
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
      <section ref={gridRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className={`text-center mb-14 transition-all duration-700 ${gridVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Platform Features</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              Tools built for the way you teach
            </h2>
            <p className="text-gray-400 text-base max-w-lg mx-auto">
              Explore the platform areas available to you.
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
                <h3 className="font-bold text-[15px] text-foreground mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
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
          <Button asChild size="lg" className="text-[14px] px-6 py-3 rounded-xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-0">
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
