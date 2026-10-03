import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'

export const metadata: Metadata = {
  title: 'Features',
  description: 'Lessons, an AI coach, teacher tools, community and verifiable certificates for Kenyan CBC teachers.',
}

const GROUPS = [
  {
    title: 'Learn',
    items: [
      ['Structured learning modules', 'Work through lessons, activities and quizzes in a clear order. Each lesson ends with a reflection prompt.'],
      ['Needs assessment', 'Answer five short questions to find a sensible starting point.'],
      ['CBC-specific content', 'Modules and resources written around CBC teaching topics, with competency and level information on selected content.'],
      ['Flexible pace', 'Leave a lesson and come back to the same place on any phone.'],
    ],
  },
  {
    title: 'Plan and teach',
    items: [
      ['AI coach', 'Ask about planning, assessment, classroom management or a specific learner. Review every suggestion with your own judgement.'],
      ['Teacher tools', 'Lesson plans, differentiation, parent messages, report-card comments and more, each as a short guided form.'],
      ['Downloadable resources', 'Guides and templates you can open from the resources area.'],
    ],
  },
  {
    title: 'Connect and prove it',
    items: [
      ['Teacher community', 'Post questions, reply to colleagues and share classroom resources.'],
      ['Progress and badges', 'See completed lessons, assessment results and milestone badges on your dashboard.'],
      ['Verifiable certificates', 'Finish a programme and its final assessment. Anyone can confirm the certificate by its serial number.'],
      ['Works on your phone', 'Installs like an app. Pages you have opened stay available offline; the AI coach needs a connection.'],
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader activePath="/features" />
      <main className="flex-1">
        <section className="border-b border-border bg-[var(--hero-bg)]">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center md:px-6 md:py-20">
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
              Learning and planning tools for <span className="text-accent">CBC teachers</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Everything below is in the app today. Start with whichever part of your week needs it most.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="rounded-xl px-8"><Link href="/auth/sign-up">Create free account</Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl px-8"><Link href="/pricing">See pricing</Link></Button>
            </div>
          </div>
        </section>

        {GROUPS.map(({ title, items }, i) => (
          <section key={title} aria-labelledby={`group-${i}`} className={i % 2 ? 'border-y border-border bg-secondary' : ''}>
            <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-[1fr_2fr] md:gap-16 md:px-6 md:py-20">
              <h2 id={`group-${i}`} className="text-3xl font-bold tracking-tight md:sticky md:top-24 md:self-start">{title}</h2>
              <dl className="space-y-7">
                {items.map(([name, body]) => (
                  <div key={name}>
                    <dt className="text-xl font-semibold">{name}</dt>
                    <dd className="mt-1.5 leading-relaxed text-muted-foreground">{body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ))}
      </main>
      <MarketingFooter />
    </div>
  )
}
