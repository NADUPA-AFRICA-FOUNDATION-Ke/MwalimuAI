'use client'

import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import Image from 'next/image'
import { Target, Heart, Users, Award, ArrowRight } from 'lucide-react'
import { useFadeIn } from '@/hooks/use-scroll-animations'

const team = [
  {
    name: 'Learning modules',
    role: 'Study at your pace',
    bio: 'Use structured lessons, activities, and quizzes to keep your learning work together.',
    initials: 'LM',
  },
  {
    name: 'AI Coach',
    role: 'Ask teaching questions',
    bio: 'Explore lesson planning, assessment, classroom management, and other teaching questions.',
    initials: 'AI',
  },
  {
    name: 'Teacher tools',
    role: 'Plan and practise',
    bio: 'Open practical tools and resources while you work through a classroom task.',
    initials: 'TT',
  },
  {
    name: 'Progress records',
    role: 'Review your work',
    bio: 'Return to your dashboard to review completed learning activity and choose what comes next.',
    initials: 'PR',
  },
]

const values = [
  {
    icon: Target,
    title: 'Teacher-Centered',
    desc: 'The platform keeps learning, planning, and progress review close to the work teachers are doing.',
  },
  {
    icon: Heart,
    title: 'Quality Education',
    desc: 'Learning content and tools are presented in a clear, practical workspace for CBC teachers.',
  },
  {
    icon: Users,
    title: 'Community',
    desc: 'Discussion and resource-sharing areas give teachers a place to learn with one another.',
  },
  {
    icon: Award,
    title: 'Excellence',
    desc: 'The product should be useful, understandable, and respectful of professional judgment.',
  },
]

const stats = [
  { value: 'Learn',   label: 'Structured modules' },
  { value: 'Ask',     label: 'AI coaching' },
  { value: 'Share',   label: 'Teacher discussions' },
  { value: 'Track',   label: 'Progress records' },
]

export default function AboutPage() {
  const { ref: heroRef, visible: heroVisible } = useFadeIn<HTMLDivElement>(0.1)
  const { ref: storyRef, visible: storyVisible } = useFadeIn<HTMLElement>(0.08)
  const { ref: valuesRef, visible: valuesVisible } = useFadeIn<HTMLElement>(0.08)
  const { ref: teamRef, visible: teamVisible } = useFadeIn<HTMLElement>(0.04)
  const { ref: statsRef, visible: statsVisible } = useFadeIn<HTMLElement>(0.15)

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader activePath="/about" />

      <main>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 hero-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none hero-bg-radial" />
        <div ref={heroRef} className={`relative max-w-4xl mx-auto px-5 md:px-10 pt-12 text-center transition-all duration-700 ${heroVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <h1 className="text-[2.8rem] md:text-[3.6rem] font-black text-white tracking-tight leading-[1.06] mb-5">
            Tools for Kenya&apos;s<br />
            <span className="text-accent">CBC teachers, in one place</span>
          </h1>
          <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-xl mx-auto">
            Mwalimu AI brings learning modules, an AI Coach, teacher tools, community discussions, and progress tracking together.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsRef} className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {stats.map(({ value, label }) => (
              <div key={label}
                className={`py-10 px-6 text-center transition-all duration-700 ${statsVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
                <span className="block text-[2.6rem] md:text-[3rem] font-black text-primary tabular-nums leading-none mb-1.5">{value}</span>
                <span className="block text-sm text-gray-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story / Mission */}
      <section ref={storyRef} className="py-20 md:py-28 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className={`transition-all duration-700 ${storyVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Our Mission</p>
              <h2 className="text-3xl md:text-[2.5rem] font-black tracking-tight text-foreground mb-5 leading-tight">
                Why we built<br />Mwalimu AI
              </h2>
              <div className="space-y-4 text-gray-400 text-base leading-relaxed">
                <p>
                  Teachers often need help with planning, assessment, and classroom decisions while the work is already under way.
                </p>
                <p>
                  Mwalimu AI gives those tasks a shared place: learn through modules, ask the Coach, use
                  the tools, and record progress.
                </p>
                <p>
                  The platform is designed for Kenyan teachers working with CBC content.
                </p>
              </div>
            </div>

            <div className={`relative transition-all duration-700 delay-150 ${storyVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
              <div className="relative rounded-3xl overflow-hidden card-elevated" style={{ boxShadow: 'var(--shadow-xl)' }}>
                <Image
                  src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80"
                  alt="Kenyan classroom"
                  width={800}
                  height={600}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)' }}>
                    <p className="text-xs font-bold text-foreground">Learning support for real classroom work</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Modules, tools, coaching, and progress in one place</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section ref={valuesRef} className="py-20 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className={`text-center mb-14 transition-all duration-700 ${valuesVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Our Values</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground">
              What drives us
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((value, i) => (
              <div key={value.title}
                className={`card-premium rounded-2xl p-7 text-center transition-all duration-700 ${valuesVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}
                style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-[15px] text-foreground mb-2 tracking-tight">{value.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section ref={teamRef} className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className={`text-center mb-14 transition-all duration-700 ${teamVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Inside the platform</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              A place for ongoing practice
            </h2>
            <p className="text-gray-400 text-base max-w-md mx-auto">
              The platform brings these parts together so teachers can move from a question to useful work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((member, i) => (
              <div key={member.name}
                className={`card-premium rounded-2xl p-7 text-center transition-all duration-700 ${teamVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}
                style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <span className="text-xl font-black text-primary">{member.initials}</span>
                </div>
                <h3 className="font-bold text-[15px] text-foreground mb-1 tracking-tight">{member.name}</h3>
                <p className="text-sm font-semibold text-primary mb-3">{member.role}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{member.bio}</p>
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
            Explore the platform<br />
            <span className="text-accent">at your own pace</span>
          </h2>
          <p className="text-white/80 text-base leading-relaxed mb-8 max-w-lg mx-auto">
            Create an account to explore the modules, Coach, tools, community, and progress records.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="text-[15px] px-10 py-6 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-105 active:scale-[0.98] transition-all duration-200 border-0">
              <Link href="/auth/sign-up">
                Create an account <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[15px] px-6 py-6 rounded-2xl">
              <Link href="/contact">
                Contact us
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
