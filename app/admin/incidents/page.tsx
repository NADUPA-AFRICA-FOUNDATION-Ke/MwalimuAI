'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, ChevronRight, Plus, Siren, Users } from 'lucide-react'
import { Empty, Field, fmtTime, Loading, PageHeader, Panel, ReasonDialog, StatCard, StatGrid, StatusPill, useRun, useStaff } from '@/components/admin/common'

export default function IncidentsPage() {
  const { can } = useStaff()
  const incidents = useQuery(api.admin.incidents.list, {})
  const create = useMutation(api.admin.incidents.create)
  const { run } = useRun()
  const router = useRouter()
  const [form, setForm] = useState({ title: '', description: '', windowStart: '', windowEnd: '' })
  const [dialog, setDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const valid = form.title.trim() && form.windowStart && form.windowEnd && form.windowStart <= form.windowEnd
  const openCount = incidents?.filter((i) => ['draft', 'approved', 'running'].includes(i.status)).length ?? 0
  const done = incidents?.filter((i) => i.status === 'completed').length ?? 0
  const affected = incidents?.reduce((n, i) => n + (i.candidatesReady ? (i.candidateCount ?? 0) : 0), 0) ?? 0

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Bulk streak restoration for outages that hit many learners. Everyone on a streak going into the window who is missing days inside it is restored, after a preview and (above 50 people) a Super Admin's approval."
        actions={can('streaks.restore_bulk') && !creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />New incident</Button>}
      />
      <StatGrid cols={3}>
        <StatCard icon={<Siren />} label="Open incidents" value={incidents ? openCount : '…'} sub="draft, approved or running" tone={openCount ? 'warn' : 'default'} />
        <StatCard icon={<CheckCircle2 />} label="Completed" value={incidents ? done : '…'} />
        <StatCard icon={<Users />} label="Learners affected" value={incidents ? affected.toLocaleString() : '…'} sub="across all incidents" />
      </StatGrid>
      {can('streaks.restore_bulk') && creating && (
        <section className="mb-6 rounded-xl border bg-background p-4">
          <h2 className="mb-3 font-semibold">New incident</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="API outage 12–13 Sep"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Window start">
                <Input
                  type="date"
                  value={form.windowStart}
                  onChange={(e) => setForm({ ...form, windowStart: e.target.value })}
                />
              </Field>
              <Field label="Window end">
                <Input
                  type="date"
                  value={form.windowEnd}
                  onChange={(e) => setForm({ ...form, windowEnd: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="What happened">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dates are Kenya time. The window must be in the past, within 30 days, and at most 14 days long.
          </p>
          <div className="mt-3 flex gap-2">
            <Button disabled={!valid} onClick={() => setDialog(true)}>Create and calculate impact…</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </section>
      )}
      {!incidents ? (
        <Loading />
      ) : incidents.length === 0 ? (
        <Empty icon={<Siren />}>No incidents yet. Create one after an outage to restore affected streaks.</Empty>
      ) : (
        <Panel>
        <ul className="divide-y text-sm">
          {incidents.map((i) => (
            <li key={i._id}>
              <Link
                href={`/admin/incidents/${i._id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><Siren className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.windowStart} → {i.windowEnd} · created {fmtTime(i.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {i.candidatesReady ? `${i.candidateCount ?? 0} affected` : 'calculating…'}
                  </span>
                  <StatusPill status={i.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
        </Panel>
      )}
      <ReasonDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Create incident"
        confirmLabel="Create"
        description="Nothing is restored yet. You'll review the affected users first."
        onConfirm={async (reason) => {
          const id = await run(() => create({ ...form, title: form.title.trim(), reason }), 'Incident created')
          if (id) router.push(`/admin/incidents/${id}`)
          return id !== undefined
        }}
      />
    </>
  )
}
