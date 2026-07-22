'use client'

import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import {
  BookOpen, Zap, Users, Award, MessageSquare, TrendingUp,
  Brain, FileText, Target, Clock, Shield, Smartphone,
  Sparkles, Check, ArrowRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFadeIn } from '@/hooks/use-scroll-animations'

const features = [
  { icon: BookOpen,      title: 'Structured Learning Modules', desc: 'Comprehensive courses covering CBC fundamentals, assessment strategies, differentiated instruction, and modern pedagogy. Learn at your own pace with bite-sized lessons.' },
  { icon: Zap,           title: 'AI Coach Support',            desc: 'Get instant, personalized answers to your teaching questions 24/7. Our AI understands the Kenyan CBC context and provides practical, actionable advice.' },
  { icon: Users,         title: 'Community Forum',            desc: 'Connect with thousands of fellow Kenyan educators. Share resources, discuss challenges, and learn from real classroom experiences across the country.' },
  { icon: Award,         title: 'Achievement Badges',         desc: 'Celebrate your progress with digital badges and certificates. Track milestones and showcase your professional development achievements.' },
  { icon: MessageSquare, title: 'Personalized Assessment',    desc: 'Start with a comprehensive needs assessment that identifies your strengths and areas for growth, then receive a customized learning pathway.' },
  { icon: TrendingUp,    title: 'Progress Tracking',          desc: 'Visual dashboards show your learning journey, completed modules, quiz scores, and overall growth over time.' },
  { icon: Brain,         title: 'CBC-Specific Content',       desc: 'All content is designed specifically for the Kenyan Competency-Based Curriculum, aligned with KICD guidelines and real classroom needs.' },
  { icon: FileText,      title: 'Downloadable Resources',     desc: 'Access lesson plan templates, assessment rubrics, activity guides, and other practical resources you can use immediately in your classroom.' },
  { icon: Target,        title: 'Competency Mapping',         desc: 'Track which CBC core competencies you are developing and how your learning translates to improved student outcomes.' },
  { icon: Clock,         title: 'Flexible Learning',          desc: 'Learn anytime, anywhere. Short modules fit into your busy schedule, whether during breaks, after school, or on weekends.' },
  { icon: Shield,        title: 'Offline Access',             desc: 'Download lessons and resources for offline use. Perfect for areas with limited internet connectivity.' },
  { icon: Smartphone,    title: 'Mobile Friendly',            desc: 'Fully responsive design works seamlessly on smartphones, tablets, and computers. Learn on any device you have.' },
]

const highlights = [
  { label: 'Interactive modules',   icon: BookOpen      },
  { label: 'AI-powered coaching',   icon: Sparkles       },
  { label: 'Community discussions', icon: Users          },
  { label: 'Progress certificates', icon: Award          },
]

export default function FeaturesPage() {
  const { ref: heroRef, visible: heroVisible } = useFadeIn<HTMLDivElement>(0.1)
  const { ref: gridRef, visible: gridVisible } = useFadeIn<HTMLElement>(0.04)

  return (
    <div className="min-h-screen bg-white">

      <MarketingHeader activePath="/features" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 hero-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none hero-bg-radial" />
        <div ref={heroRef} className={`relative max-w-4xl mx-auto px-5 md:px-10 pt-12 text-center transition-all duration-700 ${heroVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <h1 className="text-[2.8rem] md:text-[3.6rem] font-black text-white tracking-tight leading-[1.06] mb-5">
            Everything you need to<br />
            <span className="text-accent">master CBC teaching</span>
          </h1>
          <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl mx-auto mb-8">
            Mwalimu AI brings together AI coaching, structured modules, community support, and progress tracking
            in one platform built for Kenyan teachers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-[15px] px-8 py-6 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-105 active:scale-[0.98] transition-all duration-200 border-0">
                Start free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[15px] px-6 py-6 rounded-2xl">
                View pricing
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 mt-10">
            {highlights.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 text-white/50 text-sm">
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
              Every feature exists because a Kenyan teacher asked for it.
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
            Ready to transform<br />
            <span className="text-accent">your teaching?</span>
          </h2>
          <p className="text-white/55 text-base leading-relaxed mb-8 max-w-lg mx-auto">
            Join thousands of Kenyan teachers already using Mwalimu AI.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="text-[15px] px-10 py-6 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-105 active:scale-[0.98] transition-all duration-200 border-0">
              Create free account <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
