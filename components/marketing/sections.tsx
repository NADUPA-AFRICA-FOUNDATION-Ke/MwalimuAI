'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import {
  GraduationCap, ArrowRight, Check, ChevronRight, ChevronDown,
  BrainCircuit, BookMarked, Users, Award, BarChart3, Zap, TrendingUp,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardMockup, AiCoachMockup, ModulesMockup } from './mockups'

/* ── DATA ─────────────────────────────────────────────── */

const features = [
  { icon: BrainCircuit, title: 'AI Coach',            desc: 'Ask teaching and planning questions, then review the suggestions alongside your own professional judgment.', href: '/dashboard/ai-coach',     accent: 'primary' as const },
  { icon: BookMarked,   title: 'Structured Modules',  desc: 'Work through lessons, activities, and quizzes in a clear sequence.', href: '/dashboard/modules',      accent: 'accent'  as const },
  { icon: Users,        title: 'Teacher Community',   desc: 'Post questions, reply to other teachers, and share classroom resources.', href: '/dashboard/community',    accent: 'primary' as const },
  { icon: Award,        title: 'Achievement Badges',  desc: 'See milestone badges and certificates connected to completed learning work.', href: '/dashboard/achievements', accent: 'accent'  as const },
  { icon: Zap,          title: 'Needs Assessment',    desc: 'Answer a short assessment to identify a starting point for your learning.', href: '/dashboard/assessment',   accent: 'primary' as const },
  { icon: BarChart3,    title: 'Progress Tracking',  desc: 'Review completed lessons, assessment results, and learning activity from your dashboard.', href: '/dashboard',              accent: 'accent'  as const },
]

const useCases = [
  {
    title: 'Plan a lesson',
    description: 'Use the AI Coach and teacher tools to work through a lesson idea, activity, or assessment question.',
    link: 'Open AI Coach',
    href: '/dashboard/ai-coach',
  },
  {
    title: 'Study a module',
    description: 'Read a structured lesson, complete its activities, and return to the same place when you are ready to continue.',
    link: 'Browse modules',
    href: '/dashboard/modules',
  },
  {
    title: 'Keep your progress',
    description: 'Use your dashboard to review completed learning work and choose what to work on next.',
    link: 'View dashboard',
    href: '/dashboard',
  },
]

const comparison = [
  { feature: 'Structured lessons',  learn: true,  plan: false, reflect: true },
  { feature: 'AI coaching',         learn: false, plan: true,  reflect: false },
  { feature: 'Teacher discussions', learn: false, plan: true,  reflect: false },
  { feature: 'Needs assessment',    learn: true,  plan: false, reflect: false },
  { feature: 'Progress tracking',   learn: true,  plan: false, reflect: true },
  { feature: 'Saved resources',     learn: true,  plan: true,  reflect: false },
]

const faqs = [
  { q: 'What is Mwalimu AI and who is it for?', a: 'Mwalimu AI is a professional learning platform for Kenyan CBC teachers. It brings together learning modules, an AI Coach, teacher tools, community discussions, and progress tracking.' },
  { q: 'How do I start?',                      a: 'Create an account, complete your profile, and open your dashboard. From there you can choose a module, take the needs assessment, or open the AI Coach.' },
  { q: 'What can I ask the AI Coach?',          a: 'You can ask about lesson planning, assessment, classroom management, teaching strategies, or a specific classroom challenge. Review its suggestions using your own professional judgment and school guidance.' },
  { q: 'Can I use Mwalimu AI on my phone?',     a: 'Yes. The web app is responsive and can be used on a phone, tablet, or computer with a modern browser.' },
  { q: 'Does the AI Coach need an internet connection?', a: 'Yes. A live AI Coach response requires an internet connection. Other platform areas may have different connection requirements.' },
  { q: 'How is my progress stored?',            a: 'Your learning activity is associated with your account so you can review completed work from the dashboard when you sign in.' },
]

/* ── HOOKS ────────────────────────────────────────────── */
import { useFadeIn } from '@/hooks/use-scroll-animations'

/* ── COMPONENTS ───────────────────────────────────────── */

export function StatsSection() {
  const { ref, visible } = useFadeIn(0.2)

  const stats = [
    { value: 'Learn',   label: 'Structured modules', delay: 0   },
    { value: 'Ask',     label: 'AI coaching',         delay: 80  },
    { value: 'Share',   label: 'Teacher community',   delay: 160 },
    { value: 'Track',   label: 'Progress records',    delay: 240 },
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
  const tabs = ['AI Coach', 'Dashboard', 'Learning Modules']

  const selectTab = (index: number) => {
    setActiveTab(index)
    requestAnimationFrame(() => document.getElementById(`preview-tab-${index}`)?.focus())
  }

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : null
    if (next !== null) {
      event.preventDefault()
      selectTab(next)
    }
  }

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5 md:px-10">
        <div className={`text-center mb-12 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Product Preview</p>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-4">
            See it in action
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            A focused view of the modules, Coach, and progress tools in the app.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-10 flex-wrap" role="tablist" aria-label="Product previews">
          {tabs.map((tab, i) => (
            <button type="button" key={tab} id={`preview-tab-${i}`} onClick={() => selectTab(i)} onKeyDown={event => handleTabKeyDown(event, i)}
              role="tab" aria-selected={activeTab === i} aria-controls="preview-panel" tabIndex={activeTab === i ? 0 : -1}
              className={`min-h-11 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === i
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div id="preview-panel" className="max-w-2xl mx-auto" role="tabpanel" aria-labelledby={`preview-tab-${activeTab}`} tabIndex={0}>
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
              <Image
                src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80"
                alt="Students in a CBC classroom"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              <div className="absolute bottom-5 left-5 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)' }}>
                <p className="text-xs font-bold text-foreground">Learning support for Kenyan teachers</p>
                <p className="text-[11px] text-gray-400 mt-0.5">for planning, practice, and reflection</p>
              </div>
            </div>
          </div>

          <div className={`transition-all duration-700 delay-150 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <p className="text-xs font-bold text-accent uppercase tracking-widest mb-5">Built for Kenya</p>
            <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight text-foreground mb-5 leading-tight">
              Designed around the<br />real challenges of CBC
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8">
              Mwalimu AI brings learning, planning, and reflection tools into one workspace
              for Kenyan teachers working with CBC content.
            </p>
            <ul className="space-y-4 mb-9">
              {[
                'Structured learning modules',
                'AI Coach and classroom tools',
                'Teacher discussions and shared resources',
                'Progress tracking from your dashboard',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-500">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="rounded-2xl font-semibold border-primary/30 text-primary hover:bg-primary/5 px-6">
              <Link href="/about">
                Our mission <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
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
            One workspace for ongoing learning
            </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Move between learning, planning, discussion, and progress review as your work requires.
          </p>
        </div>

        <div className={`bg-white rounded-3xl overflow-hidden border border-gray-100 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
          style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100">
            <div className="p-5" />
            {['Learn', 'Plan', 'Reflect'].map((h, i) => (
              <div key={h} className={`p-5 text-center border-l border-gray-100 ${i === 0 ? 'bg-primary/4' : ''}`}>
                <p className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-gray-400'}`}>{h}</p>
              </div>
            ))}
          </div>
          {comparison.map(({ feature, learn, plan, reflect }, i) => (
            <div key={feature} className={`grid grid-cols-4 border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
              <div className="p-4 text-sm text-gray-500 font-medium">{feature}</div>
              {[learn, plan, reflect].map((val, j) => (
                <div key={j} className={`p-4 flex items-center justify-center border-l border-gray-50 ${j === 0 ? 'bg-primary/3' : ''}`}>
                  {val === true      && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  {val === false     && <XCircle className="w-5 h-5 text-gray-200" />}
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
    { num: '01', icon: GraduationCap, title: 'Create your account', desc: 'Create an account and complete your teacher profile.' },
    { num: '02', icon: Zap,           title: 'Choose a starting point', desc: 'Answer the needs assessment or open a learning module that fits your next task.' },
    { num: '03', icon: TrendingUp,    title: 'Keep learning', desc: 'Use modules, AI coaching, teacher tools, and discussions at your own pace.' },
  ]

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-5 md:px-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Getting Started</p>
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
            A clear place to begin
          </h2>
          <p className="text-gray-400 text-base">Create a profile, choose a starting point, and keep your work together.</p>
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
          <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground">
            Ways to use the platform
          </h2>
          <p className="text-gray-400 text-base mt-3 max-w-xl">
            Start with the part of your professional learning that needs attention today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {useCases.map(({ title, description, link, href }, i) => (
            <div key={title}
              className={`bg-white rounded-3xl p-7 flex flex-col border border-gray-100 transition-all duration-700 ${visible ? 'animate-section-visible' : 'animate-section-hidden'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="mb-5 flex-1">
                <p className="text-lg font-bold text-foreground mb-3">{title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
              <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:gap-2 transition-all duration-200">
                {link} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
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
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`marketing-faq-answer-${idx}`}
                  className="w-full min-h-11 flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors">{q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                <div id={`marketing-faq-answer-${idx}`} aria-hidden={!isOpen} className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-56 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
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
          <span className="text-sm font-semibold text-white/75">For Kenyan CBC teachers</span>
        </div>

        <h2 className="text-[2.6rem] md:text-[3.4rem] font-black text-white tracking-tight leading-[1.06] mb-5">
          Keep your professional learning<br />
          <span className="text-accent">in one place.</span>
        </h2>

        <p className="text-white/75 text-base leading-relaxed mb-10 max-w-lg mx-auto">
          Create an account to explore the modules, Coach, teacher tools, community discussions, and progress records.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg"
              className="text-[15px] px-10 py-6 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-105 active:scale-[0.98] transition-all duration-200 border-0">
            <Link href="/auth/sign-up">
              Create an account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
