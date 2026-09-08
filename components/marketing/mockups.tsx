'use client'

import {
  Home as HomeIcon, BookOpen, MessageSquare, Trophy, BarChart3, Settings,
  Sparkles, ArrowRight,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

export function DashboardMockup() {
  return (
    <div className="relative card-elevated rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 0 80px oklch(0.54 0.14 163 / 0.35), 0 24px 64px rgba(0,0,0,0.40)' }}>
      <div className="bg-[#1a2420] px-4 py-2.5 flex items-center gap-3 border-b border-white/8">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 mx-2 bg-white/8 rounded-md px-3 py-1 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60" />
          <span className="text-[11px] text-white/75 font-mono">app.mwalimuai.com/dashboard</span>
        </div>
      </div>

      <div className="flex bg-[#f8faf9]" style={{ height: '440px' }}>
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

        <div className="flex-1 p-5 flex flex-col gap-3.5 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-gray-900">Good morning, Jane</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Your AI coach is ready — continue CBC journey.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/12 flex items-center justify-center text-[11px] font-black text-primary">JM</div>
          </div>

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
                <span key={s} className="text-[10px] bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-gray-500">
                  {s}
                </span>
              ))}
            </div>
          </div>

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

export function AiCoachMockup() {
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

export function ModulesMockup() {
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
                status === 'Started' ? 'bg-accent/12 text-accent' :
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
