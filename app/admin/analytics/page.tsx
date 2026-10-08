'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Activity, Award, ChevronRight, Search, TrendingUp, Users } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsExport } from '@/components/admin/analytics-export'
import { Empty, Loading, PageHeader, ReasonDialog, selectClass, useRun, useStaff } from '@/components/admin/common'
import { filterPrograms, LOW_COMPLETION_PCT, type ProgramFilter, type ProgramSort } from '@/lib/admin/analytics-filter'

const fmt = (n: number) => n.toLocaleString()
// selectClass is full width; keep that on phones but size to content from sm up.
const compactSelect = selectClass.replace('w-full', 'w-full sm:w-auto')

type Program = FunctionReturnType<typeof api.admin.analytics.overview>['programs'][number]
type Day = FunctionReturnType<typeof api.admin.analytics.trend>[number]
type SeriesKey = Exclude<keyof Day, 'date'>

const SERIES: { key: SeriesKey; label: string }[] = [
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
  const overview = useQuery(api.admin.analytics.overview, {})
  const trend = useQuery(api.admin.analytics.trend, { days })
  const rebuild = useMutation(api.admin.analytics.rebuild)
  const { ok } = useRun()
  const [rebuildOpen, setRebuildOpen] = useState(false)

  if (overview === undefined || trend === undefined) return <Loading />
  const avgActive = trend.length ? Math.round(trend.reduce((n, d) => n + d.active, 0) / trend.length) : 0
  const assignments = overview.programs.reduce((n, p) => n + p.assignments, 0)
  const tested = overview.programs.filter((p) => improvement(p) !== null)
  const avgGain = tested.length ? Math.round((tested.reduce((n, p) => n + improvement(p)!, 0) / tested.length) * 10) / 10 : null

  return (
    <>
      <PageHeader
        title="Learning analytics"
        description="What learners study, how far they get, and how many finish."
        actions={
          can('analytics.rebuild') && (
            <Button size="sm" variant="outline" onClick={() => setRebuildOpen(true)}>Recalculate from source</Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users />} label="Learners started" value={fmt(overview.totals.enrolments)} sub={`across ${overview.programs.length} programs`} />
        <Kpi icon={<Award />} label="Certificates" value={fmt(overview.totals.certificates)} sub={`${overview.totals.completionRate}% completion rate`} />
        <Kpi
          icon={<TrendingUp />}
          label="Avg test score gain"
          value={avgGain === null ? '—' : signed(avgGain)}
          sub={`${fmt(assignments)} assignments submitted`}
        />
        <Kpi icon={<Activity />} label="Active learners / day" value={fmt(avgActive)} sub={`average, last ${days} days`} />
      </div>

      <Tabs defaultValue="programs" className="mt-8">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="activity">Daily activity</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="programs" className="mt-4">
          <ProgramsPanel programs={overview.programs} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityPanel trend={trend} days={days} setDays={setDays} />
        </TabsContent>
        <TabsContent value="export" className="mt-4">
          <AnalyticsExport days={days} programs={overview.programs.map((p) => ({ id: p.id, title: p.title }))} />
        </TabsContent>
      </Tabs>

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

function ProgramsPanel({ programs }: { programs: Program[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProgramFilter>('all')
  const [sort, setSort] = useState<ProgramSort>('title')
  const shown = filterPrograms(programs, { query, filter, sort })
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (programs.length === 0) return <Empty>No programs found.</Empty>
  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
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
        <select aria-label="Filter programs" className={compactSelect} value={filter} onChange={(e) => setFilter(e.target.value as ProgramFilter)}>
          <option value="all">All programs</option>
          <option value="started">With learners</option>
          <option value="not_started">No learners yet</option>
          <option value="low_completion">{`Low completion (under ${LOW_COMPLETION_PCT}%)`}</option>
          <option value="has_certificates">With certificates</option>
        </select>
        <select aria-label="Sort programs" className={compactSelect} value={sort} onChange={(e) => setSort(e.target.value as ProgramSort)}>
          <option value="title">Sort: name</option>
          <option value="enrolled">Sort: most started</option>
          <option value="completion">Sort: highest completion</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {shown.length} of {programs.length} programs
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="p-6"><Empty>No programs match your search or filter.</Empty></div>
      ) : (
        <div className="@container overflow-x-auto">
          <table className="w-full text-left text-sm md:min-w-[40rem]">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Program</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Learners</th>
                <th scope="col" className="w-48 px-4 py-2.5 font-medium">Completion</th>
                <th scope="col" className="hidden w-48 px-4 py-2.5 font-medium md:table-cell">Avg progress</th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Test scores</th>
              </tr>
            </thead>
            {shown.map(({ program: p, lessonMatches }) => {
              // A lesson-level search match opens the program so the matching lessons are visible straight away.
              const isOpen = open.has(p.id) !== Boolean(lessonMatches)
              const gain = improvement(p)
              return (
                <tbody key={p.id} className="border-t">
                  <tr className={`cursor-pointer transition-colors hover:bg-muted/40 ${isOpen ? 'bg-muted/40' : ''}`} onClick={() => toggle(p.id)}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-start gap-1.5 text-left font-medium hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(p.id)
                        }}
                        aria-expanded={isOpen}
                        aria-controls={`funnel-${p.id}`}
                      >
                        <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
                        {p.title}
                      </button>
                      <div className="pl-5 text-xs text-muted-foreground">{p.totalLessons} lessons</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium tabular-nums">{fmt(p.enrolled)}</div>
                      <div className="whitespace-nowrap text-xs text-muted-foreground">{fmt(p.completed)} finished</div>
                    </td>
                    <td className="px-4 py-3"><Bar value={p.completionRate} label={`${p.completionRate}%`} /></td>
                    <td className="hidden px-4 py-3 md:table-cell"><Bar value={p.avgProgressPct} label={`${p.avgProgressPct}%`} /></td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {p.preTaken || p.postTaken ? (
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-muted-foreground">{p.avgPrePct}% → {p.avgPostPct}%</span>
                          {gain !== null && <GainPill gain={gain} />}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} id={`funnel-${p.id}`} className="bg-muted/20 px-4 pb-4 pt-1">
                        {/* Pinned to the visible width so it is readable while the wide table scrolls sideways on phones. */}
                        <div className="sticky left-4 w-[calc(100cqw-2rem)]">
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
    </div>
  )
}

/** Lesson funnel for one program, grouped by module, shown inline under its row. */
function ProgramDetail({ program: p, only }: { program: Program; only: Set<string> | null }) {
  const modules: { name: string; lessons: (Program['funnel'][number] & { n: number })[] }[] = []
  p.funnel.forEach((l, i) => {
    if (only && !only.has(l.key)) return
    const last = modules[modules.length - 1]
    if (last && last.name === l.module) last.lessons.push({ ...l, n: i + 1 })
    else modules.push({ name: l.module, lessons: [{ ...l, n: i + 1 }] })
  })
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Took pre-test" value={fmt(p.preTaken)} />
        <MiniStat label="Took post-test" value={fmt(p.postTaken)} />
        <MiniStat label="Assignments" value={fmt(p.assignments)} />
        <MiniStat label="Avg days to finish" value={p.completed ? String(p.avgDaysToCertificate) : '—'} />
      </dl>
      {p.enrolled === 0 ? (
        <Empty>Nobody has started this program yet.</Empty>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {only ? `${only.size} lesson${only.size === 1 ? '' : 's'} matching your search. ` : ''}
              Share of learners who completed each lesson. A steep drop shows where learners stall.
            </p>
            <Link href="/admin/content/insights" className="text-xs font-medium text-primary hover:underline">Question-level analysis →</Link>
          </div>
          <div className="space-y-3">
            {modules.map((m) => (
              <div key={m.name + m.lessons[0].key}>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{m.name}</h3>
                <ol className="divide-y rounded-lg border bg-background">
                  {m.lessons.map((l) => (
                    <li key={l.key} className="grid grid-cols-[1.5rem_1fr_8rem] items-center gap-3 px-3 py-2 sm:grid-cols-[1.5rem_1fr_14rem]">
                      <span className="text-xs tabular-nums text-muted-foreground">{l.n}</span>
                      <span className="min-w-0 truncate">{l.title}{l.active ? '' : <span className="text-xs text-muted-foreground"> · archived</span>}</span>
                      <Bar value={l.pctOfEnrolled} label={`${l.pctOfEnrolled}%`} title={`${fmt(l.completions)} learners`} />
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityPanel({ trend, days, setDays }: { trend: Day[]; days: number; setDays: (n: number) => void }) {
  const [series, setSeries] = useState<SeriesKey>('active')
  const label = SERIES.find((x) => x.key === series)!.label
  const peak = Math.max(1, ...trend.map((d) => d[series]))
  const avg = trend.length ? Math.round(trend.reduce((n, d) => n + d[series], 0) / trend.length) : 0
  const totals = SERIES.map((x) => ({ ...x, total: trend.reduce((n, d) => n + d[x.key], 0) }))

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Learner-days per activity: each learner counts once a day for each kind of activity.</p>
        <select aria-label="Period" className={compactSelect} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="group" aria-label="Activity to chart">
        {totals.map((x) => (
          <button
            key={x.key}
            type="button"
            aria-pressed={series === x.key}
            onClick={() => setSeries(x.key)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${series === x.key ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
          >
            <span className="block text-xs text-muted-foreground">{x.label}</span>
            <span className="block text-lg font-semibold tabular-nums">{fmt(x.total)}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>{label} per day</span>
          <span>Peak {fmt(peak)} · avg {fmt(avg)}</span>
        </div>
        <div className="relative h-40 border-b border-l">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed" aria-hidden="true" />
          <div className="flex h-full items-end gap-[2px] px-1" role="img" aria-label={`${label} per day over the last ${days} days. Peak ${peak}, average ${avg}.`}>
            {trend.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d[series]}`}
                className="flex-1 rounded-t-sm bg-primary/80 transition-colors hover:bg-primary"
                style={{ height: `${Math.max(1.5, (d[series] / peak) * 100)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>{trend[0]?.date}</span>
          <span>{trend[trend.length - 1]?.date}</span>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-primary">Show as a table</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-background text-muted-foreground">
              <tr>
                <th scope="col" className="p-2">Date</th>
                {SERIES.map((x) => <th key={x.key} scope="col" className="p-2">{x.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...trend].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="p-2">{d.date}</td>
                  {SERIES.map((x) => <td key={x.key} className="p-2 tabular-nums">{d[x.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

function Kpi({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function GainPill({ gain }: { gain: number }) {
  const tone = gain > 0 ? 'bg-primary/10 text-primary' : gain < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{signed(gain)}</span>
}

function Bar({ value, label, title }: { value: number; label: string; title?: string }) {
  return (
    <div className="flex items-center gap-2" title={title}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{label}</span>
    </div>
  )
}
