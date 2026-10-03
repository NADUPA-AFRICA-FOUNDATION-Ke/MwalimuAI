import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroSignupForm } from './hero-signup-form'

/* Landing page sections. Plain HTML with no scroll-reveal: everything is visible on first paint,
   which matters on slow phones. Copy states only what the product does today. */

export function Hero() {
  return (
    <section aria-labelledby="home-heading" className="border-b border-border bg-[var(--hero-bg)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 text-center md:px-6 md:pb-20 md:pt-20">
        <h1 id="home-heading" className="text-[2rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          CBC professional development you can finish{' '}
          <span className="relative inline-block text-accent">
            between lessons
            <svg aria-hidden className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 300 8" preserveAspectRatio="none" fill="none">
              <path d="M2 5 C 60 1, 120 7, 180 4 S 270 2, 298 5" stroke="var(--brand-accent)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          .
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Short lessons with a reflection after each one. An AI coach for lesson plans and report-card comments. A certificate
          anyone can verify. It opens in your phone&apos;s browser, installs like an app, and works in English and Kiswahili.
        </p>
        <HeroSignupForm />
      </div>
    </section>
  )
}

const TASKS = [
  { title: 'Finish a lesson in about 15 minutes', body: 'Each lesson is a short reading with key points and a reflection prompt. Programmes cover CBC foundations, assessment for learning, inclusive education, AI for teachers, STEM integration and teacher wellbeing.' },
  { title: 'Plan tomorrow’s lesson', body: 'Ask the AI coach, or use the lesson-plan and differentiation tools to get a draft you can edit for your learners.' },
  { title: 'Write report-card comments', body: 'Give the learner’s strengths and next steps; get clear, kind comments to review and adjust.' },
  { title: 'Ask a colleague', body: 'Post a question in the teacher community and read how other teachers handle the same problem.' },
  { title: 'Earn a certificate anyone can check', body: 'Complete a programme and its final assessment. Employers and head teachers can confirm the certificate by its serial number.' },
]

export function Tasks() {
  return (
    <section aria-labelledby="tasks-heading" className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-24">
      <div className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-16">
        <h2 id="tasks-heading" className="text-3xl font-bold tracking-tight md:sticky md:top-24 md:self-start md:text-4xl">What you can do with it</h2>
        <ol className="divide-y divide-border border-y border-border">
          {TASKS.map(({ title, body }, i) => (
            <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-3 py-6">
              <span className="font-display text-2xl font-bold tabular-nums text-primary" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function CoachExample() {
  return (
    <section aria-labelledby="coach-heading" className="border-y border-border bg-secondary">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:gap-16 md:px-6 md:py-24">
        <div>
          <h2 id="coach-heading" className="text-3xl font-bold tracking-tight md:text-4xl">An AI coach that starts from the CBC</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Ask about a rubric, a strand, or a learner who is struggling. The coach drafts; you decide. It needs an internet connection to answer.
          </p>
          <Button asChild size="lg" className="mt-6 rounded-xl"><Link href="/auth/sign-up">Try the coach <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
        </div>

        <figure className="rounded-2xl bg-card p-5 shadow-md">
          <figcaption className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
            Example conversation
          </figcaption>
          <div className="space-y-3 text-base leading-relaxed">
            <p className="ml-8 rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">I teach Grade 4 Science. How do I write a rubric for a plant-growth experiment?</p>
            <p className="mr-8 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3">Start with the competency you are assessing, such as observing and recording. Then describe four levels, from &ldquo;needs support&rdquo; to &ldquo;exceeds expectation&rdquo;, in words a learner can understand. Shall I draft one?</p>
          </div>
        </figure>
      </div>
    </section>
  )
}

const STEPS = [
  { title: 'Create your account', body: 'Email and password, or sign in with Google. Tell us your school, county and what you teach.' },
  { title: 'Pick where to start', body: 'Take the five-question check, or open any programme.' },
  { title: 'Learn a little, often', body: 'Your streak, progress and certificates are saved to your account, so you can pick up on any phone.' },
]

export function Steps() {
  return (
    <section aria-labelledby="steps-heading" className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-24">
      <h2 id="steps-heading" className="text-3xl font-bold tracking-tight md:text-4xl">Start in three steps</h2>
      <ol className="mt-8 space-y-8">
        {STEPS.map(({ title, body }, i) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground" aria-hidden="true">{i + 1}</span>
            <div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-1 leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

const FAQS = [
  { q: 'Who is Mwalimu AI for?', a: 'Kenyan teachers working with the Competency-Based Curriculum, from pre-primary to senior school.' },
  { q: 'Does it work on a basic Android phone?', a: 'It runs in the phone’s browser and can be added to the home screen. Pages you have already opened stay available when your connection drops.' },
  { q: 'Do I need internet for the AI coach?', a: 'Yes. The coach needs a connection to answer. Lessons you have opened before can be read offline.' },
  { q: 'Can I use it in Kiswahili?', a: 'The app interface switches between English and Kiswahili. AI answers in Kiswahili can contain mistakes, so check important terms.' },
  { q: 'How do I show my certificate to someone?', a: 'Every certificate has a serial number. Anyone can type it at the verify page to confirm it is genuine.' },
]

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-24">
        <h2 id="faq-heading" className="text-3xl font-bold tracking-tight md:text-4xl">Questions teachers ask</h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="text-2xl text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="mx-auto max-w-3xl px-4 py-14 text-center md:px-6 md:py-24">
      <h2 id="cta-heading" className="text-3xl font-bold tracking-tight md:text-4xl">Make one lesson count this week</h2>
      <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">Create a free account and open your first lesson.</p>
      <Button asChild size="lg" className="mt-6 rounded-xl px-8"><Link href="/auth/sign-up">Create free account</Link></Button>
    </section>
  )
}
