'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { filterPrograms, LOW_COMPLETION_PCT, type ProgramFilter, type ProgramSort } from '@/lib/admin/analytics-filter'
import type { FunctionReturnType } from 'convex/server'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { AnalyticsExport } from '@/components/admin/analytics-export'
import { Empty, Loading, PageHeader, ReasonDialog, selectClass, useRun, useStaff } from '@/components/admin/common'

const fmt = (n: number) => n.toLocaleString()

type Program = FunctionReturnType<typeof api.admin.analytics.overview>['programs'][number]
type Day = FunctionReturnType<typeof api.admin.analytics.trend>[number]

const SERIES: { key: Exclude<keyof Day, 'date'>; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'lessons', label: 'Did a lesson' },
  { key: 'tools', label: 'Used a tool' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'journal', label: 'Journal' },
  { key: 'community', label: 'Community' },
]

const improvement = (p: Program) => (p.preTaken && p.postTaken ? Math.round((p.avgPostPct - p.avgPrePct) * 10) / 10 : null)
const signed = (n: number) => `${n > 0 ? '+' : ''}${n} pts`

export default function AnalyticsPage() {
  const { can } = useStaff()
  const [days, setDays] = useState(30)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProgramFilter>('all')
  const [sort, setSort] = useState<ProgramSort>('title')
  const [series, setSeries] = useState<(typeof SERIES)[number]['key']>('active')
  const overview = useQuery(api.admin.analytics.overview, {})
  const trend = useQuery(api.admin.analytics.trend, { days })
  const rebuild = useMutation(api.admin.analytics.rebuild)
  const { ok } = useRun()
  const [rebuildOpen, setRebuildOpen] = useState(false)

  if (overview === undefined || trend === undefined) return <Loading />
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const shown = filterPrograms(overview.programs, { query, filter, sort })
  const avgActive = trend.length ? Math.round(trend.reduce((n, d) => n + d.active, 0) / trend.length) : 0
  const assignments = overview.programs.reduce((n, p) => n + p.assignments, 0)
  const tested = overview.programs.filter((p) => improvement(p) !== null)
  const avgGain = tested.length ? Math.round((tested.reduce((n, p) => n + improvement(p)!, 0) / tested.length) * 10) / 10 : null
  const seriesLabel = SERIES.find((x) => x.key === series)!.label
  const peak = Math.max(1, ...trend.map((d) => d[series]))
  const periodTotals = SERIES.map((x) => ({ ...x, total: trend.reduce((n, d) => n + d[x.key], 0) }))

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Program starts" value={fmt(overview.totals.enrolments)} />
        <Kpi label="Certificates earned" value={fmt(overview.totals.certificates)} />
        <Kpi label="Overall completion rate" value={`${overview.totals.completionRate}%`} />
        <Kpi label="Assignments submitted" value={fmt(assignments)} />
        <Kpi label="Avg pre → post gain" value={avgGain === null ? '—' : signed(avgGain)} hint="Average across programs with both tests taken" />
        <Kpi label={`Avg active learners / day (${days}d)`} value={fmt(avgActive)} />
      </div>

      <section className="mt-8" aria-labelledby="programs-h">
        <h2 id="programs-h" className="mb-1 font-semibold">Programs</h2>
        <p className="mb-2 text-sm text-muted-foreground">Select a program to see where learners stall, lesson by lesson.</p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programs, modules or lessons"
              aria-label="Search programs, modules or lessons"
              className="pl-8"
            />
          </div>
          <select aria-label="Filter programs" className={`${selectClass} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as ProgramFilter)}>
            <option value="all">All programs</option>
            <option value="started">With learners</option>
            <option value="not_started">No learners yet</option>
            <option value="low_completion">{`Low completion (under ${LOW_COMPLETION_PCT}%)`}</option>
            <option value="has_certificates">With certificates</option>
          </select>
          <select aria-label="Sort programs" className={`${selectClass} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as ProgramSort)}>
            <option value="title">Sort: name</option>
            <option value="enrolled">Sort: most started</option>
            <option value="completion">Sort: highest completion</option>
          </select>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {shown.length} of {overview.programs.length} programs
          </span>
        </div>
        {overview.programs.length === 0 ? (
          <Empty>No programs found.</Empty>
        ) : shown.length === 0 ? (
          <Empty>No programs match your search or filter.</Empty>
        ) : (
          <div className="@container overflow-x-auto rounded-lg border bg-background">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 font-medium">Program</th>
                  <th scope="col" className="p-3 font-medium">Started</th>
                  <th scope="col" className="p-3 font-medium">Completed</th>
                  <th scope="col" className="p-3 font-medium">Completion</th>
                  <th scope="col" className="p-3 font-medium">Avg progress</th>
                  <th scope="col" className="p-3 font-medium">Pre → post test</th>
                  <th scope="col" className="p-3 font-medium">Assignments</th>
                  <th scope="col" className="p-3 font-medium">Avg days to finish</th>
                </tr>
              </thead>
              {shown.map(({ program: p, lessonMatches }) => {
                // A lesson-level search match opens the program so the matching lessons are visible straight away.
                const isOpen = open.has(p.id) !== Boolean(lessonMatches)
                return (
                  <tbody key={p.id} className="border-b last:border-b-0">
                    <tr className={isOpen ? 'bg-secondary' : undefined}>
                      <td className="p-3">
                        <button
                          type="button"
                          className="flex items-start gap-1.5 text-left font-medium text-primary hover:underline"
                          onClick={() => toggle(p.id)}
                          aria-expanded={isOpen}
                          aria-controls={`funnel-${p.id}`}
                        >
                          <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
                          {p.title}
                        </button>
                        <div className="pl-5 text-xs text-muted-foreground">{p.totalLessons} lessons</div>
                      </td>
                      <td className="p-3">{fmt(p.enrolled)}</td>
                      <td className="p-3">{fmt(p.completed)}</td>
                      <td className="p-3"><Bar value={p.completionRate} label={`${p.completionRate}%`} /></td>
                      <td className="p-3"><Bar value={p.avgProgressPct} label={`${p.avgProgressPct}%`} /></td>
                      <td className="p-3">{p.preTaken || p.postTaken ? `${p.avgPrePct}% → ${p.avgPostPct}%` : '—'}</td>
                      <td className="p-3">{fmt(p.assignments)}</td>
                      <td className="p-3">{p.completed ? p.avgDaysToCertificate : '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} id={`funnel-${p.id}`} className="bg-muted/30 p-3">
                          {/* Pinned to the visible width so it is readable while the wide table scrolls sideways on phones. */}
                          <div className="sticky left-3 w-[calc(100cqw-1.5rem)]">
                            <ProgramDetail program={p} only={lessonMatches} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                )
              })}
            </table>
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="trend-h">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="trend-h" className="font-semibold">Daily activity</h2>
          <select aria-label="Period" className={`${selectClass} w-auto`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Activity to chart">
            {periodTotals.map((x) => (
              <button
                key={x.key}
                type="button"
                aria-pressed={series === x.key}
                onClick={() => setSeries(x.key)}
                className={`rounded-md border px-2.5 py-1.5 text-left text-xs ${series === x.key ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
              >
                <span className="block text-muted-foreground">{x.label}</span>
                <span className="block text-sm font-semibold tabular-nums">{fmt(x.total)}</span>
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Totals add up learner-days over the period: a learner counts once per day for each kind of activity.
          </p>
          <div className="flex h-32 items-end gap-px" role="img" aria-label={`${seriesLabel} per day over the last ${days} days. Peak ${peak}.`}>
            {trend.map((d) => (
              <div key={d.date} title={`${d.date}: ${d[series]} ${seriesLabel.toLowerCase()}`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(2, (d[series] / peak) * 100)}%` }} />
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
                  <tr>
                    <th scope="col" className="p-1.5">Date</th>
                    {SERIES.map((x) => <th key={x.key} scope="col" className="p-1.5">{x.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...trend].reverse().map((d) => (
                    <tr key={d.date}>
                      <td className="p-1.5">{d.date}</td>
                      {SERIES.map((x) => <td key={x.key} className="p-1.5">{d[x.key]}</td>)}
                    </tr>
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

/** Lesson funnel for one program, grouped by module, shown inline under its row. */
function ProgramDetail({ program: p, only }: { program: Program; only: Set<string> | null }) {
  const gain = improvement(p)
  const modules: { name: string; lessons: (Program['funnel'][number] & { n: number })[] }[] = []
  p.funnel.forEach((l, i) => {
    if (only && !only.has(l.key)) return
    const last = modules[modules.length - 1]
    if (last && last.name === l.module) last.lessons.push({ ...l, n: i + 1 })
    else modules.push({ name: l.module, lessons: [{ ...l, n: i + 1 }] })
  })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>Pre-test taken: <b className="text-foreground">{fmt(p.preTaken)}</b></span>
        <span>Post-test taken: <b className="text-foreground">{fmt(p.postTaken)}</b></span>
        <span>Improvement: <b className="text-foreground">{gain === null ? '—' : signed(gain)}</b></span>
        <span>Assignments: <b className="text-foreground">{fmt(p.assignments)}</b></span>
        <Link href="/admin/content/insights" className="text-primary hover:underline">Question-level analysis →</Link>
      </div>
      {p.enrolled === 0 ? (
        <Empty>Nobody has started this program yet.</Empty>
      ) : (
        <>
          {only && <p className="text-xs font-medium">Showing the {only.size} lesson{only.size === 1 ? '' : 's'} matching your search.</p>}
          <p className="text-xs text-muted-foreground">Share of learners who started this program and completed each lesson. A steep drop shows where learners stall.</p>
          {modules.map((m) => (
            <div key={m.name + m.lessons[0].key}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.name}</h3>
              <ol className="divide-y rounded-lg border bg-background">
                {m.lessons.map((l) => (
                  <li key={l.key} className="grid grid-cols-[1.5rem_1fr_9rem] items-center gap-3 p-2.5 sm:grid-cols-[1.5rem_1fr_16rem]">
                    <span className="text-xs text-muted-foreground">{l.n}</span>
                    <span className="min-w-0 truncate">{l.title}{l.active ? '' : <span className="text-xs text-muted-foreground"> · archived</span>}</span>
                    <Bar value={l.pctOfEnrolled} label={`${fmt(l.completions)} · ${l.pctOfEnrolled}%`} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4" title={hint}>
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
