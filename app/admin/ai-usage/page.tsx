'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Bot, Gauge, Power, Users } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, BarChart, Empty, Field, Loading, PageHeader, Panel, ReasonDialog, StatCard, StatGrid, useRun, useStaff } from '@/components/admin/common'

const TOOLS = [
  { key: 'chat', label: 'AI Coach' },
  { key: 'tools', label: 'Tools' },
  { key: 'assignment-review', label: 'Assignment review' },
  { key: 'rehearsal', label: 'Rehearsal' },
  { key: 'detect-ai', label: 'AI detector' },
] as const

/** How much the learner AI tools are used, who uses them most, and the limits that keep the bill predictable. */
export default function AiUsagePage() {
  const { can } = useStaff()
  const data = useQuery(api.admin.aiUsage.overview, {})
  const setLimits = useMutation(api.admin.aiUsage.setLimits)
  const { ok } = useRun()
  const [draft, setDraft] = useState<null | { dailyFree: number; dailyPaid: number; dailyGlobal: number; paused: boolean }>(null)
  const [open, setOpen] = useState(false)
  if (!data) return <Loading />
  const form = draft ?? data.settings
  const today = data.days[data.days.length - 1]
  const usedPct = data.settings.dailyGlobal > 0 ? Math.min(100, Math.round((today.total / data.settings.dailyGlobal) * 100)) : 0
  const limitHit = today.total >= data.settings.dailyGlobal
  const total14 = data.days.reduce((n, d) => n + d.total, 0)
  const byTool = TOOLS.map((t) => ({ ...t, n: data.days.reduce((s, d) => s + (d.byTool[t.key] ?? 0), 0) }))
  const topUser = Math.max(1, ...data.heaviestToday.map((u) => u.count))
  const num = (k: 'dailyFree' | 'dailyPaid' | 'dailyGlobal') => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...form, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })

  return (
    <>
      <PageHeader title="AI usage" description="Requests to the learner AI tools. Each learner has a daily allowance, with a platform-wide ceiling and an emergency stop." />
      <StatGrid>
        <StatCard
          icon={<Bot />}
          label="Requests today"
          value={today.total.toLocaleString()}
          sub={`${usedPct}% of ${data.settings.dailyGlobal.toLocaleString()} platform limit`}
          tone={limitHit ? 'alert' : usedPct >= 80 ? 'warn' : 'default'}
        />
        <StatCard
          icon={<Power />}
          label="Status"
          value={data.settings.paused ? 'Paused' : limitHit ? 'Limit reached' : 'Running'}
          sub={data.settings.paused ? 'emergency stop is on' : limitHit ? 'paused until tomorrow' : 'all tools available'}
          tone={data.settings.paused || limitHit ? 'alert' : 'default'}
        />
        <StatCard icon={<Gauge />} label="Per learner per day" value={`${data.settings.dailyFree} / ${data.settings.dailyPaid}`} sub="free / paid" />
        <StatCard icon={<Users />} label="Last 14 days" value={total14.toLocaleString()} sub="requests in total" />
      </StatGrid>

      <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Requests per day">
          <div className="space-y-4 p-4">
            <BarChart label="Last 14 days" data={data.days.map((d) => ({ key: d.date, value: d.total, title: `${d.date}: ${d.total}` }))} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {byTool.map((t) => (
                <div key={t.key} className="rounded-lg border px-3 py-2">
                  <div className="truncate text-xs text-muted-foreground">{t.label}</div>
                  <div className="font-semibold tabular-nums">{t.n.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-primary">Show as a table</summary>
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr><th scope="col" className="p-2">Date</th><th scope="col" className="p-2">Total</th>{TOOLS.map((t) => <th key={t.key} scope="col" className="p-2">{t.label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...data.days].reverse().map((d) => (
                      <tr key={d.date}><td className="p-2">{d.date}</td><td className="p-2 tabular-nums">{d.total}</td>{TOOLS.map((t) => <td key={t.key} className="p-2 tabular-nums">{d.byTool[t.key]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </Panel>

        <Panel title="Heaviest users today">
          {data.heaviestToday.length === 0 ? (
            <div className="p-4"><Empty icon={<Bot />}>No AI use yet today.</Empty></div>
          ) : (
            <ol className="divide-y text-sm">
              {data.heaviestToday.map((u) => (
                <li key={u.profileId} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{u.name}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(u.count / topUser) * 100}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{u.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {can('staff.manage') && (
        <Panel title="Limits" description="Changes take effect immediately for all learners.">
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Free learner, per day"><Input type="number" min={0} value={form.dailyFree} onChange={num('dailyFree')} /></Field>
              <Field label="Paid learner, per day"><Input type="number" min={0} value={form.dailyPaid} onChange={num('dailyPaid')} /></Field>
              <Field label="Whole platform, per day" hint="AI pauses for everyone when reached."><Input type="number" min={0} value={form.dailyGlobal} onChange={num('dailyGlobal')} /></Field>
            </div>
            <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.paused ? 'border-destructive/50 bg-destructive/5' : ''}`}>
              <input type="checkbox" checked={form.paused} onChange={(e) => setDraft({ ...form, paused: e.target.checked })} />
              Emergency stop: pause AI for all learners
            </label>
            <div className="flex gap-2">
              <Button disabled={!draft} onClick={() => setOpen(true)}>Save limits…</Button>
              {draft && <Button variant="ghost" onClick={() => setDraft(null)}>Discard changes</Button>}
            </div>
          </div>
        </Panel>
      )}
      <ReasonDialog open={open} onOpenChange={setOpen} title="Change AI limits?" description="Takes effect immediately for all learners." confirmLabel="Save" onConfirm={(reason) => ok(async () => { await setLimits({ ...form, reason }); setDraft(null) }, 'Limits saved')} />
    </>
  )
}
