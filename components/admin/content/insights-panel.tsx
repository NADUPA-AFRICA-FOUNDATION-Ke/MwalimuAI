'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Empty, Loading } from '@/components/admin/common'

const LESSON_FLAG: Record<string, string> = {
  low_completion: 'Far fewer learners finish this than other lessons. It may be too long or unclear.',
  big_drop: 'Many learners stop at this lesson. Check the one before it flows into this one.',
}
const QUIZ_FLAG: Record<string, string> = {
  too_easy: 'Almost everyone gets this right. It tells you little: consider a harder question.',
  too_hard: 'Most learners get this wrong. Check the wording, the answer key and whether the lesson teaches it.',
  wrong_option_popular: 'A wrong option is chosen more than the right one. The answer key or the wording may be wrong.',
}

/** Learner behaviour for one path: where people drop off and how each quiz question performs. */
export function InsightsPanel({ programKey, onOpenItem }: { programKey: string; onOpenItem: (key: string) => void }) {
  const data = useQuery(api.admin.insights.forProgram, { programKey })
  if (!data) return <Loading />
  if (!data.live) return <Empty>Insights appear once this path is live and learners have used it.</Empty>
  const enough = data.enrolled >= data.minSample

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {data.enrolled} learner{data.enrolled === 1 ? ' has' : 's have'} started this path.{' '}
        {enough ? 'Flags below are based on what they actually did.' : `Flags appear once ${data.minSample} learners have started, so small numbers do not mislead you.`}
      </p>

      <section aria-labelledby="ins-lessons">
        <h2 id="ins-lessons" className="mb-2 font-semibold">Lessons: who finishes each one</h2>
        <ol className="divide-y rounded-lg border bg-background text-sm">
          {data.lessons.map((l) => (
            <li key={l.key} className="space-y-1 p-3">
              <div className="grid grid-cols-[1fr_10rem] items-center gap-3 sm:grid-cols-[1fr_16rem]">
                <span className="min-w-0"><span className="block truncate">{l.title}</span><span className="block truncate text-xs text-muted-foreground">{l.module}</span></span>
                <span className="flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="block h-full rounded-full bg-primary" style={{ width: `${l.pct}%` }} /></span>
                  <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{l.pct}%</span>
                </span>
              </div>
              {l.flags.map((f) => (
                <p key={f} className="flex flex-wrap items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                  {LESSON_FLAG[f]}
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onOpenItem(l.key)}>Open this lesson</Button>
                </p>
              ))}
            </li>
          ))}
        </ol>
      </section>

      {([['pre', 'Pre-assessment'], ['post', 'Post-assessment']] as const).map(([kind, title]) => {
        const rows = data[kind]
        if (rows.length === 0) return null
        return (
          <section key={kind} aria-labelledby={`ins-${kind}`}>
            <h2 id={`ins-${kind}`} className="mb-2 font-semibold">{title}: how each question performs</h2>
            <ol className="divide-y rounded-lg border bg-background text-sm">
              {rows.map((q) => (
                <li key={q.index} className="space-y-1 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 flex-1">{q.index + 1}. {q.question}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{q.taken ? `${q.pctCorrect}% correct (${q.taken} answers)` : 'no answers yet'}</span>
                  </div>
                  {q.taken > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Choices: {q.share.map((s, a) => `${'ABCD'[a]} ${s}%${a === q.correct ? ' ✓' : ''}`).join(' · ')}
                    </p>
                  )}
                  {q.flags.map((f) => (
                    <p key={f} className="text-xs text-amber-800 dark:text-amber-200">{QUIZ_FLAG[f]}</p>
                  ))}
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

export type ItemKey = Id<'cmsItems'>
