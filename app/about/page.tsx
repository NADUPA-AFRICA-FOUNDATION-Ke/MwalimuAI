import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'

export const metadata: Metadata = {
  title: 'About',
  description: 'Why Mwalimu AI exists and how we think about professional learning for Kenyan CBC teachers.',
}

const PRINCIPLES = [
  ['Start from the classroom', 'Learning, planning and progress sit close to the work a teacher is doing, so a lesson idea and the lesson on your phone are one step apart.'],
  ['Plain and practical', 'Lessons are short, tools are guided forms, and the language is the language of the staffroom.'],
  ['Teachers learn from teachers', 'The community is a place to ask a real question and read how a colleague handled it.'],
  ['Your judgement comes first', 'The AI coach drafts and suggests. You decide what is right for your learners.'],
]

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader activePath="/about" />
      <main className="flex-1">
        <section className="border-b border-border bg-[var(--hero-bg)]">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center md:px-6 md:py-20">
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl">
              Professional learning that <span className="text-accent">fits a teacher&apos;s day</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Mwalimu AI is a learning platform for Kenyan teachers working with the Competency-Based Curriculum.
            </p>
          </div>
        </section>

        <section aria-labelledby="why-heading" className="mx-auto max-w-[var(--reading-max)] px-4 py-12 md:py-20">
          <h2 id="why-heading" className="text-3xl font-bold tracking-tight">Why we built it</h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>Teachers often need help with planning, assessment and classroom decisions while the work is already under way, and training that arrives as a long course or a distant workshop rarely meets that moment.</p>
            <p>Mwalimu AI gives those tasks one place: learn through short modules, ask the coach, use the tools, and keep a record of what you have completed.</p>
            <p>It is designed for Kenyan teachers working with CBC content, on the phone most of us already carry.</p>
          </div>
        </section>

        <section aria-labelledby="principles-heading" className="border-y border-border bg-secondary">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-[1fr_2fr] md:gap-16 md:px-6 md:py-20">
            <h2 id="principles-heading" className="text-3xl font-bold tracking-tight md:sticky md:top-24 md:self-start">How we think about it</h2>
            <dl className="space-y-7">
              {PRINCIPLES.map(([title, body]) => (
                <div key={title}>
                  <dt className="text-xl font-semibold">{title}</dt>
                  <dd className="mt-1.5 leading-relaxed text-muted-foreground">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 text-center md:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Try it for one lesson</h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-muted-foreground">Create a free account and open your first programme.</p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rounded-xl px-8"><Link href="/auth/sign-up">Create free account</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-8"><Link href="/contact">Contact us</Link></Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
