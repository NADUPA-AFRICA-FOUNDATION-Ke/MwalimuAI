'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { AnalyticsExport } from '@/components/admin/analytics-export'
import { Empty, Loading, PageHeader, ReasonDialog, selectClass, useRun, useStaff } from '@/components/admin/common'

const fmt = (n: number) => n.toLocaleString()

export default function AnalyticsPage() {
  const { can } = useStaff()
  const [days, setDays] = useState(30)
  const [programId, setProgramId] = useState<string | null>(null)
  const overview = useQuery(api.admin.analytics.overview, {})
  const trend = useQuery(api.admin.analytics.trend, { days })
  const rebuild = useMutation(api.admin.analytics.rebuild)
  const { ok } = useRun()
  const [rebuildOpen, setRebuildOpen] = useState(false)

  if (overview === undefined || trend === undefined) return <Loading />
  const selected = overview.programs.find((p) => p.id === programId) ?? overview.programs.find((p) => p.enrolled > 0) ?? overview.programs[0]
  const peak = Math.max(1, ...trend.map((d) => d.active))
  const avgActive = trend.length ? Math.round(trend.reduce((n, d) => n + d.active, 0) / trend.length) : 0

  return (
    <>
      <PageHeader
        title="Learning analytics"
        description="What learners are studying, how far they get, and how many finish. Figures are kept up to date as learners work, so this page is fast at any size."
        actions={
          can('analytics.rebuild') && (
            <Button size="sm" variant="outline" onClick={() => setRebuildOpen(true)}>Recalculate from source</Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Program starts" value={fmt(overview.totals.enrolments)} />
        <Kpi label="Certificates earned" value={fmt(overview.totals.certificates)} />
        <Kpi label="Overall completion rate" value={`${overview.totals.completionRate}%`} />
        <Kpi label={`Avg active learners / day (${days}d)`} value={fmt(avgActive)} />
      </div>

      <section className="mt-8" aria-labelledby="programs-h">
        <h2 id="programs-h" className="mb-2 font-semibold">Programs</h2>
        {overview.programs.length === 0 ? (
          <Empty>No programs found.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 font-medium">Program</th>
                  <th scope="col" className="p-3 font-medium">Started</th>
                  <th scope="col" className="p-3 font-medium">Completed</th>
                  <th scope="col" className="p-3 font-medium">Completion</th>
                  <th scope="col" className="p-3 font-medium">Avg progress</th>
                  <th scope="col" className="p-3 font-medium">Pre → post test</th>
                  <th scope="col" className="p-3 font-medium">Avg days to finish</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overview.programs.map((p) => (
                  <tr key={p.id} className={p.id === selected?.id ? 'bg-secondary' : undefined}>
                    <td className="p-3">
                      <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => setProgramId(p.id)} aria-pressed={p.id === selected?.id}>
                        {p.title}
                      </button>
                      <div className="text-xs text-muted-foreground">{p.totalLessons} lessons</div>
                    </td>
                    <td className="p-3">{fmt(p.enrolled)}</td>
                    <td className="p-3">{fmt(p.completed)}</td>
                    <td className="p-3"><Bar value={p.completionRate} label={`${p.completionRate}%`} /></td>
                    <td className="p-3"><Bar value={p.avgProgressPct} label={`${p.avgProgressPct}%`} /></td>
                    <td className="p-3">{p.preTaken || p.postTaken ? `${p.avgPrePct}% → ${p.avgPostPct}%` : '—'}</td>
                    <td className="p-3">{p.completed ? p.avgDaysToCertificate : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="mt-8" aria-labelledby="funnel-h">
          <h2 id="funnel-h" className="mb-1 font-semibold">Lesson by lesson: {selected.title}</h2>
          <p className="mb-2 text-sm text-muted-foreground">Share of learners who started this program and completed each lesson. A steep drop shows where learners stall.</p>
          {selected.enrolled === 0 ? (
            <Empty>Nobody has started this program yet.</Empty>
          ) : (
            <ol className="divide-y rounded-lg border bg-background text-sm">
              {selected.funnel.map((l, i) => (
                <li key={l.key} className="grid grid-cols-[1.5rem_1fr_9rem] items-center gap-3 p-3 sm:grid-cols-[1.5rem_1fr_16rem]">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{l.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{l.module}{l.active ? '' : ' · archived'}</span>
                  </span>
                  <Bar value={l.pctOfEnrolled} label={`${fmt(l.completions)} · ${l.pctOfEnrolled}%`} />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className="mt-8" aria-labelledby="trend-h">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="trend-h" className="font-semibold">Active learners per day</h2>
          <select aria-label="Period" className={`${selectClass} w-auto`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <div className="flex h-32 items-end gap-px" role="img" aria-label={`Daily active learners over the last ${days} days. Peak ${peak}, average ${avgActive}.`}>
            {trend.map((d) => (
              <div key={d.date} title={`${d.date}: ${d.active} active, ${d.lessons} did a lesson`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(2, (d.active / peak) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{trend[0]?.date}</span>
            <span>{trend[trend.length - 1]?.date}</span>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-primary">Show as a table</summary>
            <div className="mt-2 max-h-72 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-background text-muted-foreground">
                  <tr><th scope="col" className="p-1.5">Date</th><th scope="col" className="p-1.5">Active</th><th scope="col" className="p-1.5">Did a lesson</th><th scope="col" className="p-1.5">Used a tool</th><th scope="col" className="p-1.5">Assessments</th></tr>
                </thead>
                <tbody className="divide-y">
                  {[...trend].reverse().map((d) => (
                    <tr key={d.date}><td className="p-1.5">{d.date}</td><td className="p-1.5">{d.active}</td><td className="p-1.5">{d.lessons}</td><td className="p-1.5">{d.tools}</td><td className="p-1.5">{d.assessments}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </section>

      <div className="mt-8">
        <AnalyticsExport days={days} programs={overview.programs.map((p) => ({ id: p.id, title: p.title }))} />
      </div>

      <ReasonDialog
        open={rebuildOpen}
        onOpenChange={setRebuildOpen}
        title="Recalculate analytics from source?"
        description="Clears the counters and rebuilds them from every learner's progress and the last 120 days of activity. Figures read low while it runs. Best done when few learners are online."
        confirmLabel="Recalculate"
        onConfirm={(reason) => ok(() => rebuild({ reason }), 'Recalculation started')}
      />
    </>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  )
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">{label}</span>
    </div>
  )
}
