'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Empty, Field, Loading, PageHeader, Pill, ReasonDialog, useRun, useStaff } from '@/components/admin/common'

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
  const peak = Math.max(1, ...data.days.map((d) => d.total))
  const today = data.days[data.days.length - 1]
  const num = (k: 'dailyFree' | 'dailyPaid' | 'dailyGlobal') => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...form, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })

  return (
    <>
      <PageHeader title="AI usage" description="Requests to the learner AI tools (AI Coach, tools, assignment review, lesson rehearsal, AI detector). Each learner has a daily allowance, and there is a platform-wide ceiling and an emergency stop." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background p-4"><div className="text-xs text-muted-foreground">Requests today</div><div className="mt-1 text-2xl font-bold">{today.total.toLocaleString()}</div><div className="text-xs text-muted-foreground">of {data.settings.dailyGlobal.toLocaleString()} platform limit</div></div>
        <div className="rounded-lg border bg-background p-4"><div className="text-xs text-muted-foreground">Status</div><div className="mt-1">{data.settings.paused ? <Pill tone="red">Paused for everyone</Pill> : today.total >= data.settings.dailyGlobal ? <Pill tone="red">Platform limit reached</Pill> : <Pill tone="green">Running</Pill>}</div></div>
        <div className="rounded-lg border bg-background p-4"><div className="text-xs text-muted-foreground">Per learner per day</div><div className="mt-1 text-sm">Free {data.settings.dailyFree} · Paid {data.settings.dailyPaid}</div></div>
      </div>

      <section className="mb-8" aria-labelledby="ai-days">
        <h2 id="ai-days" className="mb-2 font-semibold">Last 14 days</h2>
        <div className="rounded-lg border bg-background p-3">
          <div className="flex h-28 items-end gap-1" role="img" aria-label={`AI requests per day for 14 days, peak ${peak}`}>
            {data.days.map((d) => <div key={d.date} title={`${d.date}: ${d.total}`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(2, (d.total / peak) * 100)}%` }} />)}
          </div>
          <details className="mt-3 text-sm"><summary className="cursor-pointer text-primary">Show as a table</summary>
            <table className="mt-2 w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th scope="col" className="p-1.5">Date</th><th scope="col" className="p-1.5">Total</th><th scope="col" className="p-1.5">Coach</th><th scope="col" className="p-1.5">Tools</th><th scope="col" className="p-1.5">Assignment review</th><th scope="col" className="p-1.5">Rehearsal</th><th scope="col" className="p-1.5">Detector</th></tr></thead>
              <tbody className="divide-y">{[...data.days].reverse().map((d) => <tr key={d.date}><td className="p-1.5">{d.date}</td><td className="p-1.5">{d.total}</td><td className="p-1.5">{d.byTool.chat}</td><td className="p-1.5">{d.byTool.tools}</td><td className="p-1.5">{d.byTool['assignment-review']}</td><td className="p-1.5">{d.byTool.rehearsal}</td><td className="p-1.5">{d.byTool['detect-ai']}</td></tr>)}</tbody></table>
          </details>
        </div>
      </section>

      <section className="mb-8" aria-labelledby="ai-heavy">
        <h2 id="ai-heavy" className="mb-2 font-semibold">Heaviest users today</h2>
        {data.heaviestToday.length === 0 ? <Empty>No AI use yet today.</Empty> : (
          <ul className="divide-y rounded-lg border bg-background text-sm">{data.heaviestToday.map((u) => <li key={u.profileId} className="flex justify-between gap-2 p-3"><span>{u.name}</span><span className="tabular-nums text-muted-foreground">{u.count} requests</span></li>)}</ul>
        )}
      </section>

      {can('staff.manage') && (
        <section className="space-y-3 rounded-lg border bg-background p-4" aria-labelledby="ai-limits">
          <h2 id="ai-limits" className="font-semibold">Limits</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Free learner, per day"><Input type="number" min={0} value={form.dailyFree} onChange={num('dailyFree')} /></Field>
            <Field label="Paid learner, per day"><Input type="number" min={0} value={form.dailyPaid} onChange={num('dailyPaid')} /></Field>
            <Field label="Whole platform, per day" hint="AI pauses for everyone when reached."><Input type="number" min={0} value={form.dailyGlobal} onChange={num('dailyGlobal')} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.paused} onChange={(e) => setDraft({ ...form, paused: e.target.checked })} />Emergency stop: pause AI for all learners</label>
          <Button disabled={!draft} onClick={() => setOpen(true)}>Save limits…</Button>
        </section>
      )}
      <ReasonDialog open={open} onOpenChange={setOpen} title="Change AI limits?" description="Takes effect immediately for all learners." confirmLabel="Save" onConfirm={(reason) => ok(async () => { await setLimits({ ...form, reason }); setDraft(null) }, 'Limits saved')} />
    </>
  )
}
