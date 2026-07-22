'use client'

import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'
import Link from 'next/link'
import { Target, Heart, Users, Award, ArrowRight, Quote } from 'lucide-react'
import { useFadeIn } from '@/hooks/use-scroll-animations'

const team = [
  {
    name: 'Dr. Sarah Kamau',
    role: 'Founder & CEO',
    bio: 'Former teacher and education researcher with 15 years of experience in curriculum development.',
    initials: 'SK',
  },
  {
    name: 'James Ochieng',
    role: 'Head of Content',
    bio: 'Curriculum specialist and former TSC trainer with expertise in CBC implementation.',
    initials: 'JO',
  },
  {
    name: 'Grace Muthoni',
    role: 'Lead Instructional Designer',
    bio: 'Award-winning educator passionate about making learning accessible to all teachers.',
    initials: 'GM',
  },
  {
    name: 'Peter Njoroge',
    role: 'CTO',
    bio: 'EdTech innovator dedicated to leveraging AI for educational transformation.',
    initials: 'PN',
  },
]

const values = [
  {
    icon: Target,
    title: 'Teacher-Centered',
    desc: 'Every feature and piece of content is designed with the busy Kenyan teacher in mind.',
  },
  {
    icon: Heart,
    title: 'Quality Education',
    desc: 'We believe every child deserves a well-prepared teacher who can deliver quality CBC instruction.',
  },
  {
    icon: Users,
    title: 'Community',
    desc: 'Teachers learn best from each other. We foster collaboration and knowledge sharing.',
  },
  {
    icon: Award,
    title: 'Excellence',
    desc: 'We strive for excellence in everything we create, from content to technology.',
  },
]

const stats = [
  { value: '10,000+', label: 'Teachers Trained' },
  { value: '47',      label: 'Counties Reached' },
  { value: '500+',    label: 'Schools Impacted' },
  { value: '4.8★',    label: 'Average Rating'   },
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

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 hero-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none hero-bg-radial" />
        <div ref={heroRef} className={`relative max-w-4xl mx-auto px-5 md:px-10 pt-12 text-center transition-all duration-700 ${heroVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
          <h1 className="text-[2.8rem] md:text-[3.6rem] font-black text-white tracking-tight leading-[1.06] mb-5">
            Empowering Kenya&apos;s<br />
            <span className="text-accent">teachers, one lesson at a time</span>
          </h1>
          <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl mx-auto">
            Mwalimu AI was founded to bridge the gap between Kenya&apos;s CBC reform and the teachers
            who make it work every day.
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
                  Kenya&apos;s transition to Competency-Based Curriculum represents one of the most significant
                  educational reforms in our nation&apos;s history. Yet many teachers feel underprepared and
                  overwhelmed by the changes.
                </p>
                <p>
                  Mwalimu AI was founded to bridge this gap. We combine cutting-edge AI technology with
                  deep expertise in Kenyan education to provide accessible, high-quality professional
                  development that meets teachers where they are.
                </p>
                <p>
                  Our platform serves over 10,000 teachers across all 47 counties, from urban Nairobi
                  schools to rural communities in Turkana.
                </p>
              </div>
            </div>

            <div className={`relative transition-all duration-700 delay-150 ${storyVisible ? 'animate-section-visible' : 'animate-section-hidden'}`}>
              <div className="relative rounded-3xl overflow-hidden card-elevated" style={{ boxShadow: 'var(--shadow-xl)' }}>
                <img
                  src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80"
                  alt="Kenyan classroom"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)' }}>
                    <p className="text-xs font-bold text-foreground">&ldquo;Education is the most powerful weapon&rdquo;</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">— Nelson Mandela</p>
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
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Our Team</p>
            <h2 className="text-3xl md:text-[2.6rem] font-black tracking-tight text-foreground mb-3">
              The people behind Mwalimu AI
            </h2>
            <p className="text-gray-400 text-base max-w-md mx-auto">
              Educators, engineers, and content specialists united by a single mission.
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
            Join our mission<br />
            <span className="text-accent">to transform education</span>
          </h2>
          <p className="text-white/55 text-base leading-relaxed mb-8 max-w-lg mx-auto">
            Be part of the movement. Start your professional development journey today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-[15px] px-10 py-6 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 hover:scale-105 active:scale-[0.98] transition-all duration-200 border-0">
                Get started free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[15px] px-6 py-6 rounded-2xl">
                Partner with us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
