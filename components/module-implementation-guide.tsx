import Link from 'next/link'
import { CheckCircle2, ClipboardCheck, ExternalLink, Lightbulb, ListChecks, Target } from 'lucide-react'
import type { ImplementationGuide } from '@/lib/curriculum-guidance'

type ModuleImplementationGuideProps = {
  guide: ImplementationGuide
}

/**
 * A consistent, practical layer shown above the lesson list. It keeps the
 * learning-design pattern visible without forcing every lesson into a card.
 */
export function ModuleImplementationGuide({ guide }: ModuleImplementationGuideProps) {
  return (
    <section aria-label="Implementation lab" className="border-t border-border/40 bg-primary/[0.025] px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Implementation lab</p>
          <h3 className="mt-1 text-base font-bold tracking-tight">{guide.focus}</h3>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Key concepts</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{guide.keyConcepts.join(' · ')}</p>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
              <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              By the end of this module
            </div>
            <ul className="space-y-2">
              {guide.outcomes.map(outcome => (
                <li key={outcome} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
              <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Classroom workflow
            </div>
            <ol className="space-y-2">
              {guide.workflow.map((step, index) => (
                <li key={step} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 text-[11px] font-semibold text-primary" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-l-2 border-accent/70 pl-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Worked classroom scenario
            </div>
            <dl className="space-y-3 text-sm leading-relaxed">
              <div>
                <dt className="font-semibold text-foreground">Context</dt>
                <dd className="text-muted-foreground">{guide.scenario.context}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Teacher action</dt>
                <dd className="text-muted-foreground">{guide.scenario.teacherAction}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Learner evidence</dt>
                <dd className="text-muted-foreground">{guide.scenario.learnerEvidence}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Assessment decision</dt>
                <dd className="text-muted-foreground">{guide.scenario.assessmentDecision}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
            <p className="text-xs font-semibold text-foreground">Practical task: {guide.practicalTask.title}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              {guide.practicalTask.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}
            </ol>
            <p className="mt-3 text-xs font-semibold text-foreground">Collect as evidence</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{guide.practicalTask.evidence.join(' · ')}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-border/40 pt-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="text-xs font-semibold text-foreground">Reflect before you move on</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{guide.reflection}</p>
        </div>
        <div className="md:max-w-[19rem]">
          <p className="text-xs font-semibold text-foreground">Authoritative starting points</p>
          <ul className="mt-1 space-y-1">
            {guide.sources.map(source => (
              <li key={source.url}>
                <Link href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-xs leading-relaxed text-primary underline-offset-2 hover:underline">
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{source.organisation}: {source.title}</span>
                </Link>
                <p className="pl-4 text-[11px] leading-relaxed text-muted-foreground">{source.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
