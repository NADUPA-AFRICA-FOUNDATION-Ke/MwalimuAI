'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useConvex, useQuery } from 'convex/react'
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Empty, Loading, PageHeader } from '@/components/admin/common'
import { askAi, type Ideas } from '@/lib/admin/ai-client'

const TYPE: Record<string, string> = { new_path: 'New learning path', improve_lesson: 'Improve a lesson', improve_quiz: 'Improve a quiz', new_resource: 'New resource' }

/** What teachers ask for versus what exists, and AI suggestions for what to build next. */
export default function ContentInsightsPage() {
  const convex = useConvex()
  const demand = useQuery(api.admin.insights.demand, {})
  const [ideas, setIdeas] = useState<Ideas['ideas'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!demand) return <Loading />

  async function suggest() {
    setBusy(true)
    setError(null)
    try {
      const overview = await convex.query(api.admin.analytics.overview, {})
      const lines = [
        `Teachers who completed the needs assessment: ${demand!.total}`,
        ...demand!.questions.filter((q) => ['development_goals', 'cbc_challenges'].includes(q.id)).flatMap((q) => [`"${q.question}" top answers:`, ...q.options.slice(0, 6).map((o) => `  - ${o.text}: ${o.count} (${o.pct}%)`)]),
        'Existing learning paths (started / completed / completion rate / avg progress):',
        ...overview.programs.map((p) => `  - ${p.title}: ${p.enrolled} / ${p.completed} / ${p.completionRate}% / ${p.avgProgressPct}% (${p.totalLessons} lessons)`),
        ...overview.programs.flatMap((p) => p.funnel.filter((l, i, all) => p.enrolled >= 20 && i > 0 && all[i - 1].pctOfEnrolled - l.pctOfEnrolled >= 20).map((l) => `  - Drop-off in "${p.title}" at "${l.title}": ${l.pctOfEnrolled}% of starters complete it`)),
      ]
      const r = await askAi('recommend', { evidence: lines.join('\n') })
      setIdeas(r.ideas)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const enough = demand.total >= demand.minSample
  return (
    <>
      <Link href="/admin/content" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Content
      </Link>
      <PageHeader title="Content insights" description="What teachers say they need, and what to build or fix next." />

      <section className="mb-8 rounded-lg border bg-background p-4" aria-labelledby="ideas-h">
        <h2 id="ideas-h" className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />What should we build next?</h2>
        <p className="mb-3 text-sm text-muted-foreground">The assistant reads teacher demand and how your paths perform, then suggests what to make or improve. It only uses the numbers on this page.</p>
        <Button onClick={suggest} disabled={busy || demand.total === 0}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Thinking…</> : 'Suggest ideas'}</Button>
        {demand.total === 0 && <span className="ml-3 text-sm text-muted-foreground">Needs some completed needs assessments first.</span>}
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        {ideas && (
          <ul className="mt-4 space-y-3">
            {ideas.map((i, n) => (
              <li key={n} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-xs text-muted-foreground">{TYPE[i.type]}</span>
                </div>
                <p className="mt-1">{i.why}</p>
                {i.evidence && <p className="mt-1 text-xs text-muted-foreground">Evidence: {i.evidence}</p>}
                {i.type === 'new_path' && (
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href={`/admin/content?ai=${encodeURIComponent(i.title)}`}>Start this path with AI</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="demand-h">
        <h2 id="demand-h" className="mb-1 font-semibold">What teachers told us</h2>
        <p className="mb-3 text-sm text-muted-foreground">{demand.total} completed the needs assessment.{enough ? '' : ` Percentages are shaky below ${demand.minSample}.`}</p>
        {demand.total === 0 ? (
          <Empty>No answers yet.</Empty>
        ) : (
          <div className="space-y-4">
            {demand.questions.filter((q) => q.options.some((o) => o.count > 0)).map((q) => (
              <div key={q.id} className="rounded-lg border bg-background p-3">
                <h3 className="mb-2 text-sm font-medium">{q.question}</h3>
                <ul className="space-y-1 text-sm">
                  {q.options.map((o) => (
                    <li key={o.text} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                      <span className="min-w-0 truncate">{o.text}</span>
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="block h-full rounded-full bg-primary" style={{ width: `${o.pct}%` }} /></span>
                        <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{o.pct}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
