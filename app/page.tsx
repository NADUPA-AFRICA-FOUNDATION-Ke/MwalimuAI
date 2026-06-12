'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  GraduationCap, ArrowRight, Menu, X, Check, Star, Quote, ChevronRight,
  BookMarked, BrainCircuit, Users, Award, BarChart3, Zap, TrendingUp,
  Home as HomeIcon, BookOpen, MessageSquare, Trophy, Settings, Sparkles,
  CheckCircle2, XCircle, ChevronDown,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

/* ── hooks ─────────────────────────────────────────────── */
function useFadeIn(threshold = 0.08) {
  const ref = useRef<HTMLElement>(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el); return () => obs.disconnect()
  }, [threshold])
  return { ref, visible: v }
}

function useCountUp(to: number, dur = 1400, go = false) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!go) return
    const s = performance.now()
    const f = (now: number) => {
      const p = Math.min((now - s) / dur, 1)
      setN(Math.round((1 - (1 - p) ** 3) * to))
      if (p < 1) requestAnimationFrame(f)
    }
    requestAnimationFrame(f)
  }, [go, to, dur])
  return n
}

/* ── Dashboard mockup ──────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative card-elevated rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 0 80px oklch(0.54 0.14 163 / 0.35), 0 24px 64px rgba(0,0,0,0.40)' }}>

      {/* Browser chrome */}
      <div className="bg-[#1a2420] px-4 py-2.5 flex items-center gap-3 border-b border-white/8">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 mx-2 bg-white/8 rounded-md px-3 py-1 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60" />
          <span className="text-[11px] text-white/40 font-mono">app.mwalimuai.com/dashboard</span>
        </div>
      </div>

      {/* App shell */}
      <div className="flex bg-[#f8faf9]" style={{ height: '440px' }}>

        {/* Sidebar */}
        <div className="w-14 bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-1.5 shrink-0">
          <BrandMark className="w-9 h-9 mb-3" />
          {[
            { Icon: HomeIcon,      active: true  },
            { Icon: BookOpen,      active: false },
            { Icon: MessageSquare, active: false },
            { Icon: Trophy,        active: false },
            { Icon: BarChart3,     active: false },
            { Icon: Settings,      active: false },
          ].map(({ Icon, active }, i) => (
            <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              active ? 'bg-primary/10 text-primary' : 'text-gray-300'
            }`}>
              <Icon className="w-4 h-4" />
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-5 flex flex-col gap-3.5 overflow-hidden">

          {/* Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-gray-900">Good morning, Jane 🌱</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Your AI coach is ready — continue CBC journey.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/12 flex items-center justify-center text-[11px] font-black text-primary">JM</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Lessons', value: '24', color: 'text-primary' },
              { label: 'AI Sessions', value: '12', color: 'text-amber-500' },
              { label: 'Progress', value: '67%', color: 'text-primary' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl p-2.5 border border-gray-100">
                <p className={`text-[17px] font-black leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* AI Chat */}
          <div className="bg-white rounded-xl border border-gray-100 p-3.5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-gray-50">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[11px] font-bold text-gray-800">AI Coach</span>
              <span className="ml-auto text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Online
              </span>
            </div>
            <div className="space-y-2 flex-1">
              <div className="bg-primary/6 rounded-xl rounded-tl-sm px-3 py-2">
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  &ldquo;Great work on CBC Foundations! Ready to practice writing formative assessment rubrics for Grade 4?&rdquo;
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl rounded-tr-sm px-3 py-2 self-end ml-8">
                <p className="text-[11px] text-gray-500">Yes! Show me an example.</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {['View example →', 'Practice more'].map(s => (
                <span key={s} className="text-[10px] bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-gray-500 cursor-pointer">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Module progress */}
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold text-gray-800">CBC Foundations Program</p>
              <span className="text-[11px] font-black text-primary">67%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '67%' }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Module 4 of 6 · Assessment Strategies</p>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── AI Coach mockup ───────────────────────────────────── */
function AiCoachMockup() {
  return (
    <div className="card-elevated rounded-2xl overflow-hidden">
      <div className="bg-muted/60 px-4 py-2.5 border-b border-border/40 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        </div>
        <span className="text-[11px] text-muted-foreground font-mono mx-auto">AI Coach · Mwalimu AI</span>
      </div>
      <div className="bg-background p-5 space-y-3.5" style={{ minHeight: '320px' }}>
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold">Your AI Coach</p>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Always available
            </p>
          </div>
        </div>
        {[
          { from: 'ai', text: "Hello Jane! I see you're working on CBC strand 4. How can I help your classroom today?" },
          { from: 'user', text: "I'm struggling with writing competency-based assessment rubrics for Science." },
          { from: 'ai', text: "Great question! Here's a Grade 4 Science rubric framework aligned to KICD strands. Let's build it together." },
        ].map((m, i) => (
          <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
              m.from === 'ai'
                ? 'bg-primary/8 border border-primary/10 rounded-tl-sm text-foreground'
                : 'bg-primary text-primary-foreground rounded-tr-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <div className="flex-1 bg-muted rounded-xl px-3.5 py-2 text-[11px] text-muted-foreground border border-border/50">
            Ask anything about CBC...
          </div>
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Modules mockup ────────────────────────────────────── */
function ModulesMockup() {
  const mods = [
    { title: 'CBC Foundations', sub: 'Core competencies & strands', pct: 67, status: 'In Progress' },
    { title: 'Assessment Strategies', sub: 'Rubrics, portfolios & formative', pct: 25, status: 'Started' },
    { title: 'Learner-Centred Pedagogy', sub: 'Student-focused methodologies', pct: 0, status: 'Up Next' },
    { title: 'Digital Tools in CBC', sub: 'EdTech integration & platforms', pct: 0, status: 'Locked' },
  ]
  return (
    <div className="card-elevated rounded-2xl overflow-hidden">
      <div className="bg-muted/60 px-4 py-2.5 border-b border-border/40 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        </div>
        <span className="text-[11px] text-muted-foreground font-mono mx-auto">Learning Modules</span>
      </div>
      <div className="bg-background p-5 space-y-3" style={{ minHeight: '320px' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold">Your Learning Path</p>
          <span className="text-[11px] text-primary font-semibold">2 active</span>
        </div>
        {mods.map(({ title, sub, pct, status }) => (
          <div key={title} className="bg-muted/30 rounded-xl p-3.5 border border-border/40">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[12px] font-bold text-foreground">{title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0 ml-2 ${
                status === 'In Progress' ? 'bg-primary/10 text-primary' :
                status === 'Started' ? 'bg-accent/12 text-accent-foreground' :
                'bg-muted text-muted-foreground'
              }`}>{status}</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              {pct > 0 && <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── FAQ item ──────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-56 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
        <p className="text-muted-foreground text-sm leading-relaxed pr-8">{a}</p>
      </div>
    </div>
  )
}

/* ── data ──────────────────────────────────────────────── */
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

const HERO_BG = 'oklch(0.22 0.08 163)'

/* ── main ──────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [activeTab,  setActiveTab]  = useState(0)
  const [scrolled,   setScrolled]   = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const { ref: statsRef,  visible: statsGo }     = useFadeIn(0.2)
  const { ref: featRef,   visible: featVisible }  = useFadeIn(0.04)
  const { ref: splitRef,  visible: splitVisible } = useFadeIn(0.08)
  const { ref: compRef,   visible: compVisible }  = useFadeIn(0.08)
  const { ref: howRef,    visible: howVisible }   = useFadeIn(0.08)
  const { ref: testRef,   visible: testVisible }  = useFadeIn(0.04)
  const { ref: faqRef,    visible: faqVisible }   = useFadeIn(0.08)
  const { ref: ctaRef,    visible: ctaVisible }   = useFadeIn(0.15)

  const teachers  = useCountUp(48, 1400, statsGo)
  const counties  = useCountUp(47, 1200, statsGo)
  const modules   = useCountUp(48, 1300, statsGo)
  const ratingVal = useCountUp(48, 1500, statsGo)

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">

      {/* ════════════════════ HEADER ════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(255,255,255,0.92)'
            : 'transparent',
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

        {/* Mobile dropdown */}
        <div className={`md:hidden overflow-hidden transition-all duration-250 ${menuOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}
          style={{ background: scrolled ? 'rgba(255,255,255,0.96)' : HERO_BG, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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

      {/* ════════════════════ HERO — dark forest green ══════ */}
      <section style={{ background: HERO_BG }} className="relative overflow-hidden pt-[68px]">

        {/* Subtle radial highlight at top-centre */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, oklch(0.54 0.14 163 / 0.30) 0%, transparent 65%)' }} />

        <div className="relative max-w-4xl mx-auto px-5 md:px-10 pt-20 pb-16 md:pt-28 md:pb-20 text-center">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-ping-soft" />
            <span className="text-xs font-semibold text-white/80">Built for Kenya&apos;s 300,000+ CBC teachers</span>
          </div>

          {/* Headline */}
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
                    stroke="oklch(0.74 0.17 62)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="1" className="animate-hero-underline" />
                </svg>
              </span>
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base md:text-lg text-white/55 leading-relaxed mb-10 max-w-lg mx-auto animate-fade-in-up animation-delay-300">
            Mwalimu AI gives Kenya&apos;s CBC teachers a personal AI coach, KICD-aligned learning modules,
            and a community of educators in every county — completely free.
          </p>

          {/* Email CTA */}
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
              style={{ background: 'oklch(0.54 0.14 163)' }}>
              Get started free →
            </button>
          </form>
          <p className="text-xs text-white/30 mt-3 animate-fade-in-up animation-delay-500">
            Free forever · No credit card required
          </p>
        </div>

        {/* Bottom transition to white */}
        <div className="h-24 mt-8" style={{ background: `linear-gradient(to bottom, ${HERO_BG}, white)` }} />
      </section>

      {/* ════════════════════ STATS ═════════════════════════ */}
      <section ref={statsRef} className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {[
              { value: `${(teachers / 10).toFixed(1)}K+`, label: 'Active teachers',  delay: 0   },
              { value: counties,                           label: 'Counties reached', delay: 80  },
              { value: `${modules}+`,                     label: 'Learning modules', delay: 160 },
              { value: `${(ratingVal / 10).toFixed(1)}★`, label: 'Average rating',   delay: 240 },
            ].map(({ value, label, delay }) => (
              <div key={label}
                className={`py-10 px-6 text-center transition-all duration-700 ${statsGo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${delay}ms` }}>
                <span className="block text-[2.6rem] md:text-[3rem] font-black text-primary tabular-nums leading-none mb-1.5">{value}</span>
                <span className="text-sm text-gray-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ PRODUCT SHOWCASE ══════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
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

      {/* ════════════════════ FEATURES ══════════════════════ */}
      <section ref={featRef} className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-5 md:px-10">

          {/* Header row */}
          <div className={`flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14 transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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

          {/* Two-column numbered list */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-gray-100 transition-all duration-700 ${featVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {[features.slice(0, 3), features.slice(3)].map((col, colIdx) => (
              <div key={colIdx} className={colIdx === 1 ? 'lg:pl-12' : 'lg:pr-12'}>
                {col.map(({ icon: Icon, title, desc, href, accent }, rowIdx) => {
                  const num = String(colIdx * 3 + rowIdx + 1).padStart(2, '0')
                  return (
                    <div
                      key={title}
                      className="group flex items-start gap-5 py-8 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 -mx-4 px-4 rounded-xl transition-colors duration-150"
                      style={{ transitionDelay: `${(colIdx * 3 + rowIdx) * 50}ms` }}
                    >
                      {/* Number */}
                      <span className="text-[11px] font-black text-gray-200 tabular-nums mt-1 w-5 shrink-0 select-none">
                        {num}
                      </span>

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${accent === 'primary' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                        <Icon className={`w-5 h-5 ${accent === 'primary' ? 'text-primary' : 'text-accent'}`} />
                      </div>

                      {/* Text */}
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

      {/* ════════════════════ SPLIT — Built for Kenya ═══════ */}
      <section ref={splitRef} className="py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className={`transition-all duration-700 ${splitVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
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

            <div className={`transition-all duration-700 delay-150 ${splitVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}>
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

      {/* ════════════════════ COMPARISON ════════════════════ */}
      <section ref={compRef} className="py-24 bg-gray-50/60">
        <div className="max-w-4xl mx-auto px-5 md:px-10">

          <div className={`text-center mb-12 transition-all duration-700 ${compVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              Why teachers choose Mwalimu AI
            </h2>
            <p className="text-gray-400 text-base max-w-md mx-auto">
              Not all professional development is equal.
            </p>
          </div>

          <div className={`bg-white rounded-3xl overflow-hidden border border-gray-100 transition-all duration-700 ${compVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
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

      {/* ════════════════════ HOW IT WORKS ══════════════════ */}
      <section ref={howRef} className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-5 md:px-10">

          <div className={`text-center mb-16 transition-all duration-700 ${howVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Getting Started</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              Up and running in minutes
            </h2>
            <p className="text-gray-400 text-base">Three steps to a better classroom.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-9 left-[calc(16.67%+44px)] right-[calc(16.67%+44px)] h-px border-t-2 border-dashed border-gray-100" />
            {[
              { num: '01', icon: GraduationCap, title: 'Create your account',       desc: 'Sign up free in under 2 minutes. Complete your teacher profile — no credit card needed.' },
              { num: '02', icon: Zap,           title: 'Take the assessment',        desc: 'A 5-minute diagnostic builds a personalised CBC learning path around your goals.' },
              { num: '03', icon: TrendingUp,    title: 'Start learning & growing',   desc: 'Access AI coaching, modules, and the teacher community — on your phone, offline, at your pace.' },
            ].map(({ num, icon: Icon, title, desc }, i) => (
              <div key={title}
                className={`text-center transition-all duration-700 ${howVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
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

      {/* ════════════════════ TESTIMONIALS ══════════════════ */}
      <section ref={testRef} className="py-24 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-5 md:px-10">

          <div className={`mb-12 transition-all duration-700 ${testVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
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
                className={`bg-white rounded-3xl p-7 flex flex-col border border-gray-100 transition-all duration-700 ${testVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms`, boxShadow: 'var(--shadow-sm)' }}>
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

      {/* ════════════════════ FAQ ═══════════════════════════ */}
      <section ref={faqRef} className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-10">

          <div className={`text-center mb-12 transition-all duration-700 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              Frequently asked questions
            </h2>
            <p className="text-gray-400 text-base">Everything you need to know before getting started.</p>
          </div>

          <div className={`bg-white rounded-3xl px-8 py-2 border border-gray-100 transition-all duration-700 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ boxShadow: 'var(--shadow-md)' }}>
            {faqs.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>

          <div className={`text-center mt-8 transition-all duration-700 delay-200 ${faqVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-sm text-gray-400">
              Still have questions?{' '}
              <Link href="/contact" className="text-primary font-semibold hover:underline underline-offset-4">
                Contact our team →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════ FINAL CTA ═════════════════════ */}
      <section ref={ctaRef} className="py-28 relative overflow-hidden" style={{ background: HERO_BG }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, oklch(0.54 0.14 163 / 0.25) 0%, transparent 65%)' }} />

        <div className={`relative z-10 max-w-2xl mx-auto px-5 md:px-10 text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8 border border-white/15"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
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
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />)}
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
