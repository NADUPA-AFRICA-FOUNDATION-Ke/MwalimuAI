'use client'

import Link from 'next/link'
import { BookOpen, MessageSquare, Users, Mail, ChevronRight, Wand2, ClipboardCheck, FileText, FlaskConical } from 'lucide-react'

const CORE_TOOLS = [
  {
    href: '/dashboard/tools/lesson-plan',
    icon: BookOpen,
    accent: 'primary',
    title: 'Lesson Plan Generator',
    desc: 'Enter subject, grade, strand, and topic — get a full CBC lesson plan with objectives, activities, differentiation, and assessment in seconds.',
    tags: ['CBC aligned', 'Differentiated', 'Print / PDF'],
  },
  {
    href: '/dashboard/tools/report-card',
    icon: MessageSquare,
    accent: 'accent',
    title: 'Report Card Comments',
    desc: 'Paste performance notes and receive professional, CBC-aligned report card comments ready to copy — personalised for each learner.',
    tags: ['60–80 words', 'CBC competencies', 'Parent-friendly'],
  },
  {
    href: '/dashboard/tools/differentiation',
    icon: Users,
    accent: 'primary',
    title: 'Differentiation Advisor',
    desc: 'Describe a learner\'s challenge and get practical inclusive teaching strategies grounded in CBC\'s every-learner-succeeds philosophy.',
    tags: ['Inclusive', 'Practical strategies', 'Low-resource'],
  },
  {
    href: '/dashboard/tools/parent-comms',
    icon: Mail,
    accent: 'accent',
    title: 'Parent Communication Helper',
    desc: 'Draft parent meeting notes or formal letters in plain language — warm, clear, and professional without the writing struggle.',
    tags: ['Meeting notes', 'Letters', 'Plain language'],
  },
]

const AI_TOOLS = [
  {
    href: '/dashboard/tools/lesson-rehearsal',
    icon: Users,
    accent: 'accent',
    title: 'AI Lesson Rehearsal',
    desc: 'Type your lesson plan and practice with a simulated class. The AI plays your learners — asking questions, showing confusion, and testing your delivery before the real lesson.',
    tags: ['Interactive', 'Real-time practice', 'Student simulation'],
    badge: 'New',
  },
  {
    href: '/dashboard/tools/assignment-feedback',
    icon: ClipboardCheck,
    accent: 'primary',
    title: 'Assignment Feedback',
    desc: 'Submit a lesson plan, reflective journal, or teaching design. The AI reviews it against CBC professional standards and gives specific, scored feedback.',
    tags: ['CBC scoring', 'Detailed review', 'Professional development'],
    badge: 'New',
  },
  {
    href: '/dashboard/tools/action-research',
    icon: FlaskConical,
    accent: 'accent',
    title: 'Action Research Guide',
    desc: 'Walk through a full classroom action research cycle step by step — identify a problem, design an intervention, collect evidence, and reflect — with AI guidance at each stage.',
    tags: ['5-step guide', 'Evidence-based', 'Printable report'],
    badge: 'New',
  },
  {
    href: '/dashboard/tools/policy-explainer',
    icon: FileText,
    accent: 'primary',
    title: 'Policy Explainer',
    desc: 'Paste any MoE, KICD, or TSC circular or policy document. The AI explains it in plain language, tells you what it means for your classroom, and lists what you need to do.',
    tags: ['Plain language', 'Action steps', 'MoE / KICD / TSC'],
    badge: 'New',
  },
]

function ToolCard({ href, icon: Icon, accent, title, desc, tags, badge }: {
  href: string; icon: typeof BookOpen; accent: string; title: string
  desc: string; tags: string[]; badge?: string
}) {
  return (
    <Link
      href={href}
      className="group glass rounded-2xl p-6 hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1.5 transition-all duration-300 block"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          accent === 'primary'
            ? 'bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10'
            : 'bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10'
        }`}>
          <Icon className={`w-5 h-5 ${accent === 'primary' ? 'text-primary' : 'text-accent'}`} />
        </div>
        {badge && (
          <span className="text-xs font-bold uppercase tracking-wide bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>

      <h2 className="font-bold text-base mb-2 tracking-tight group-hover:text-primary transition-colors duration-200">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{desc}</p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
              {tag}
            </span>
          ))}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 shrink-0 ml-2" />
      </div>
    </Link>
  )
}

export default function ToolsPage() {
  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-secondary text-primary px-3 py-1.5 rounded-full text-sm font-semibold mb-4">
          <Wand2 className="w-3.5 h-3.5" />
          AI Teacher Tools
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Save Time. Teach Better.
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Eight AI-powered tools built for CBC teachers in Kenya. Grounded in KICD standards — reduce admin time and sharpen your practice.
        </p>
      </div>

      {/* Core tools */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Classroom & Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CORE_TOOLS.map(tool => <ToolCard key={tool.href} {...tool} />)}
        </div>
      </div>

      {/* AI-powered tools */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Professional Development AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AI_TOOLS.map(tool => <ToolCard key={tool.href} {...tool} />)}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        All tools use AI — always review outputs before using them with learners or parents.
      </p>
    </div>
  )
}
