'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  GraduationCap, ArrowRight, Check, Star, Quote, ChevronRight, ChevronDown,
  BrainCircuit, BookMarked, Users, Award, BarChart3, Zap, TrendingUp,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardMockup, AiCoachMockup, ModulesMockup } from './mockups'

/* ── DATA ─────────────────────────────────────────────── */

const features = [
  { icon: BrainCircuit, title: 'AI Coach',            desc: 'A personal teaching advisor powered by AI — answers CBC questions, creates rubrics, and adapts to your challenges 24/7.', href: '/dashboard/ai-coach',     accent: 'primary' as const },
  { icon: BookMarked,   title: 'Structured Modules',  desc: 'KICD-mapped self-paced courses for every CBC strand — mobile-first and offline-ready.', href: '/dashboard/modules',      accent: 'accent'  as const },
  { icon: Users,        title: 'Teacher Community',   desc: 'Collaborate with 4,800+ educators across all 47 counties — share resources and solve challenges together.', href: '/dashboard/community',    accent: 'primary' as const },
  { icon: Award,        title: 'Achievement Badges',  desc: 'Earn verifiable certificates tied to real learning outcomes and classroom impact.', href: '/dashboard/achievements', accent: 'accent'  as const },
  { icon: Zap,          title: 'Needs Assessment',    desc: 'A smart diagnostic that builds a fully personalised learning path around your experience and goals.', href: '/dashboard/assessment',   accent: 'primary' as const },
  { icon: BarChart3,    title: 'Progress Analytics',  desc: 'Visual insights into your learning velocity, streak performance, and classroom impact over time.', href: '/dashboard',              accent: 'accent'  as const },
]

const testimonials = [
  {
    quote: 'In just 8 weeks, I went from overwhelmed by CBC assessment to confidently writing competency rubrics for all my subjects.',
    name: 'Jane Muthoni', role: 'Grade 6 Teacher', school: 'Nairobi Primary School',
    img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=80&h=80&q=80',
    result: '40% improvement in assessment quality',
  },
  {
    quote: 'The AI Coach is the first tool that actually understands CBC implementation. It gave me practical advice I could use the very next morning.',
    name: 'Peter Ochieng', role: 'Head of Science', school: 'Kisumu Boys High',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80',
    result: '3× faster lesson planning',
  },
  {
    quote: 'I used to spend every weekend preparing CBC materials alone. Now the community and AI tools save me 6+ hours a week.',
    name: 'Faith Kemunto', role: 'Mathematics Teacher', school: 'Mombasa Girls Secondary',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80',
    result: '6 hours saved every week',
  },
]

const comparison = [
  { feature: 'CBC-specific content',       mwalimu: true,      workshop: false, generic: false },
  { feature: 'Available 24/7',             mwalimu: true,      workshop: false, generic: 'partial' },
  { feature: 'AI personalisation',         mwalimu: true,      workshop: false, generic: false },
  { feature: 'KICD aligned',               mwalimu: true,      workshop: true,  generic: false },
  { feature: 'Free to start',              mwalimu: true,      workshop: false, generic: false },
  { feature: 'Works offline',              mwalimu: true,      workshop: false, generic: false },
  { feature: 'Kenyan teacher community',   mwalimu: true,      workshop: false, generic: false },
  { feature: 'Progress tracking',          mwalimu: true,      workshop: false, generic: 'partial' },
]

const faqs = [
  { q: 'What is Mwalimu AI and who is it for?',              a: 'Mwalimu AI is an AI-powered professional development platform built exclusively for Kenyan teachers implementing the Competency-Based Curriculum. Whether you\'re a primary or secondary teacher, newly trained or experienced, the platform adapts to your level and goals.' },
  { q: 'Is Mwalimu AI really free?',                          a: 'Yes — core learning modules, community features, and AI coaching are free. A Professional tier unlocks advanced analytics, unlimited AI sessions, and downloadable certificates.' },
  { q: 'How does the AI Coach work?',                         a: 'Your AI Coach is trained on CBC curriculum content, KICD standards, and Kenyan classroom contexts. Ask it anything — how to write a competency rubric, how to plan a learner-centred lesson, or how to handle a specific student challenge.' },
  { q: 'Is the content aligned with official KICD standards?',a: 'Every module is mapped to KICD strands, sub-strands, and competency levels. Our content team reviews all materials against the official CBC syllabus regularly.' },
  { q: 'Does it work on slow internet connections?',          a: 'Yes. Mwalimu AI is built mobile-first with offline support. Once you\'ve loaded a module you can continue without internet. The AI Coach requires a connection, but all module content is available offline.' },
  { q: 'Can I use Mwalimu AI on my phone?',                   a: 'Absolutely. The platform is designed for smartphones first — most Kenyan teachers access it on Android. It works on any modern browser and can be installed as a PWA for a native-app experience.' },
]

/* ── HOOKS ────────────────────────────────────────────── */
import { useFadeIn } from '@/hooks/use-scroll-animations'
import { useCountUp } from '@/hooks/use-scroll-animations'

/* ── COMPONENTS ───────────────────────────────────────── */

export function StatsSection() {
  const { ref, visible, revealed } = useFadeIn(0.2)
  const teachers  = useCountUp(48, 1400, revealed)
  const counties  = useCountUp(47, 1200, revealed)
  const modules   = useCountUp(48, 1300, revealed)
  const ratingVal = useCountUp(48, 1500, revealed)

  const stats = [
    { value: `${(teachers / 10).toFixed(1)}K+`, label: 'Active teachers',  delay: 0   },
    { value: counties,                           label: 'Counties reached', delay: 80  },
    { value: `${modules}+`,                     label: 'Learning modules', delay: 160 },
    { value: `${(ratingVal / 10).toFixed(1)}★`, label: 'Average rating',   delay: 240 },
  ]

  return (
    <section ref={ref} className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-5 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {stats.map(({ value, label, delay }) => (
            <div key={label}
              className={`py-10 px-6 text-center transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
              style={{ transitionDelay: `${delay}ms` }}>
              <span className="block text-[2.6rem] md:text-[3rem] font-black text-primary tabular-nums leading-none mb-1.5">{value}</span>
              <span className="block text-sm text-gray-400 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ProductShowcase() {
  const { ref, visible } = useFadeIn(0.1)
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5 md:px-10">
        <div className={`text-center mb-12 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Product Preview</p>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-4">
            See it in action
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            A purpose-built platform for Kenyan teachers — not adapted from a foreign product.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {['AI Coach', 'Dashboard', 'Learning Modules'].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === i
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          {activeTab === 0 && <AiCoachMockup />}
          {activeTab === 1 && <DashboardMockup />}
          {activeTab === 2 && <ModulesMockup />}
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  const { ref, visible } = useFadeIn(0.04)

  return (
    <section ref={ref} className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className={`flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Platform Features</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground">
              Everything you need<br className="hidden md:block" /> to excel at CBC
            </h2>
          </div>
          <p className="text-gray-400 text-[15px] leading-relaxed max-w-xs md:text-right">
            Tools designed specifically for the way Kenyan teachers learn and grow.
          </p>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-gray-100 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          {[features.slice(0, 3), features.slice(3)].map((col, colIdx) => (
            <div key={colIdx} className={colIdx === 1 ? 'lg:pl-12' : 'lg:pr-12'}>
              {col.map(({ icon: Icon, title, desc, href, accent }, rowIdx) => {
                const num = String(colIdx * 3 + rowIdx + 1).padStart(2, '0')
                return (
                  <div
                    key={title}
                    className="group flex items-start gap-5 py-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 -mx-4 px-4 rounded-xl transition-colors duration-150"
                  >
                    <span className="text-[11px] font-black text-gray-200 tabular-nums mt-1 w-5 shrink-0 select-none">
                      {num}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${accent === 'primary' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                      <Icon className={`w-5 h-5 ${accent === 'primary' ? 'text-primary' : 'text-accent'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] text-foreground mb-1.5 tracking-tight">{title}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed mb-3">{desc}</p>
                      <Link
                        href={href}
                        className={`inline-flex items-center gap-1 text-[12px] font-semibold group-hover:gap-2 transition-all duration-200 ${accent === 'primary' ? 'text-primary' : 'text-accent'}`}
                      >
                        Learn more <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SplitSection() {
  const { ref, visible } = useFadeIn(0.08)

  return (
    <section ref={ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <div className="relative rounded-3xl overflow-hidden aspect-[3/2]" style={{ boxShadow: 'var(--shadow-xl)' }}>
              <img
                src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80"
                alt="Students in a CBC classroom"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              <div className="absolute bottom-5 left-5 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)' }}>
                <p className="text-xs font-bold text-foreground">300,000+ teachers in Kenya</p>
                <p className="text-[11px] text-gray-400 mt-0.5">deserve world-class support</p>
              </div>
            </div>
          </div>

          <div className={`transition-all duration-700 delay-150 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <p className="text-xs font-bold text-accent uppercase tracking-widest mb-5">Built for Kenya</p>
            <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight text-foreground mb-5 leading-tight">
              Designed around the<br />real challenges of CBC
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8">
              Mwalimu AI was built by educators who lived through Kenya&apos;s CBC transition.
              Every feature exists because a teacher asked for it.
            </p>
            <ul className="space-y-4 mb-9">
              {[
                'All content mapped to KICD strands and sub-strands',
                'Available in English and Swahili',
                'Works on low-bandwidth networks and offline',
                'Trusted by teachers across all 47 counties',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/about">
              <Button variant="outline" className="rounded-2xl font-semibold border-primary/30 text-primary hover:bg-primary/5 px-6">
                Our mission <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ComparisonSection() {
  const { ref, visible } = useFadeIn(0.08)

  return (
    <section ref={ref} className="py-24 bg-gray-50/60">
      <div className="max-w-4xl mx-auto px-5 md:px-10">
        <div className={`text-center mb-12 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
            Why teachers choose Mwalimu AI
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Not all professional development is equal.
          </p>
        </div>

        <div className={`bg-white rounded-3xl overflow-hidden border border-gray-100 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
          style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100">
            <div className="p-5" />
            {['Mwalimu AI','Workshops','Generic Courses'].map((h, i) => (
              <div key={h} className={`p-5 text-center border-l border-gray-100 ${i === 0 ? 'bg-primary/4' : ''}`}>
                <p className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-gray-400'}`}>{h}</p>
                {i === 0 && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-semibold mt-1 inline-block">Best choice</span>}
              </div>
            ))}
          </div>
          {comparison.map(({ feature, mwalimu, workshop, generic }, i) => (
            <div key={feature} className={`grid grid-cols-4 border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
              <div className="p-4 text-sm text-gray-500 font-medium">{feature}</div>
              {[mwalimu, workshop, generic].map((val, j) => (
                <div key={j} className={`p-4 flex items-center justify-center border-l border-gray-50 ${j === 0 ? 'bg-primary/3' : ''}`}>
                  {val === true      && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  {val === false     && <XCircle className="w-5 h-5 text-gray-200" />}
                  {val === 'partial' && <span className="text-[11px] font-semibold text-gray-300">Partial</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorksSection() {
  const { ref, visible } = useFadeIn(0.08)

  const steps = [
    { num: '01', icon: GraduationCap, title: 'Create your account',       desc: 'Sign up free in under 2 minutes. Complete your teacher profile — no credit card needed.' },
    { num: '02', icon: Zap,           title: 'Take the assessment',        desc: 'A 5-minute diagnostic builds a personalised CBC learning path around your goals.' },
    { num: '03', icon: TrendingUp,    title: 'Start learning & growing',   desc: 'Access AI coaching, modules, and the teacher community — on your phone, offline, at your pace.' },
  ]

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-5 md:px-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Getting Started</p>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
            Up and running in minutes
          </h2>
          <p className="text-gray-400 text-base">Three steps to a better classroom.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-9 left-[calc(16.67%+44px)] right-[calc(16.67%+44px)] h-px border-t-2 border-dashed border-gray-100" />
          {steps.map(({ num, icon: Icon, title, desc }, i) => (
            <div key={title}
              className={`text-center transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
              style={{ transitionDelay: `${i * 130}ms` }}>
              <div className="relative inline-flex mb-6">
                <div className="w-[72px] h-[72px] bg-primary rounded-3xl flex items-center justify-center"
                  style={{ boxShadow: 'var(--shadow-primary)' }}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent border-2 border-white flex items-center justify-center text-[11px] font-black text-white">
                  {num.slice(-1)}
                </span>
              </div>
              <h3 className="font-bold text-[15px] mb-2.5 tracking-tight text-foreground">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-[220px] mx-auto">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsSection() {
  const { ref, visible } = useFadeIn(0.04)

  return (
    <section ref={ref} className="py-24 bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className={`mb-12 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <div className="flex gap-0.5 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-accent text-accent" />)}
          </div>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground">
            Real teachers. Real results.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map(({ quote, name, role, school, img, result }, i) => (
            <div key={name}
              className={`bg-white rounded-3xl p-7 flex flex-col border border-gray-100 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="mb-5 flex-1">
                <Quote className="w-7 h-7 text-primary/15 mb-4" />
                <p className="text-sm text-gray-500 leading-relaxed">&ldquo;{quote}&rdquo;</p>
              </div>
              <div className="bg-primary/6 rounded-xl px-4 py-2.5 mb-5">
                <p className="text-[11px] text-primary font-bold">✦ {result}</p>
              </div>
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-accent text-accent" />)}
              </div>
              <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                <img src={img} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-foreground">{name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{role} · {school}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FaqSection() {
  const { ref, visible } = useFadeIn(0.08)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-5 md:px-10">
        <div className={`text-center mb-12 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-gray-400 text-base">Everything you need to know before getting started.</p>
        </div>

        <div className={`bg-white rounded-3xl px-8 py-2 border border-gray-100 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
          style={{ boxShadow: 'var(--shadow-md)' }}>
          {faqs.map(({ q, a }, idx) => {
            const isOpen = openIdx === idx
            return (
              <div key={q} className="border-b border-border/50 last:border-0">
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors">{q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-56 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
                  <p className="text-muted-foreground text-sm leading-relaxed pr-8">{a}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className={`text-center mt-8 transition-all duration-700 delay-200 ${visible ? 'animate-section-visible' : 'opacity-0'}`}>
          <p className="text-sm text-gray-400">
            Still have questions?{' '}
            <Link href="/contact" className="text-primary font-semibold hover:underline underline-offset-4">
              Contact our team →
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export function CTASection() {
  const { ref, visible } = useFadeIn(0.15)

  return (
    <section ref={ref} className="py-28 relative overflow-hidden hero-bg">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none hero-bg-radial" />

      <div className={`relative z-10 max-w-2xl mx-auto px-5 md:px-10 text-center transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8 hero-bg-border">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-ping-soft" />
          <span className="text-sm font-semibold text-white/75">Free for every Kenyan teacher</span>
        </div>

        <h2 className="text-[2.6rem] md:text-[3.4rem] font-black text-white tracking-tight leading-[1.06] mb-5">
          Your students deserve<br />
          <span className="text-accent">a confident teacher.</span>
        </h2>

        <p className="text-white/55 text-base leading-relaxed mb-10 max-w-lg mx-auto">
          Every module you complete, every AI session you have, every colleague you connect with —
          it all shows up in your classroom the next morning.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/sign-up">
            <Button size="lg"
              className="text-[15px] px-10 py-6 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-105 active:scale-[0.98] transition-all duration-200 border-0">
              Start teaching better — free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <div className="text-white/40 text-sm flex items-center gap-1.5">
            <Check className="w-4 h-4" /> No credit card required
          </div>
        </div>
      </div>
    </section>
  )
}
