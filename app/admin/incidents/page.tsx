'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Empty,
  Field,
  fmtTime,
  Loading,
  PageHeader,
  ReasonDialog,
  StatusPill,
  useRun,
  useStaff,
} from '@/components/admin/common'

export default function IncidentsPage() {
  const { can } = useStaff()
  const incidents = useQuery(api.admin.incidents.list, {})
  const create = useMutation(api.admin.incidents.create)
  const { run } = useRun()
  const router = useRouter()
  const [form, setForm] = useState({ title: '', description: '', windowStart: '', windowEnd: '' })
  const [dialog, setDialog] = useState(false)
  const valid = form.title.trim() && form.windowStart && form.windowEnd && form.windowStart <= form.windowEnd

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Bulk streak restoration for outages that hit many learners. Everyone who was on a streak going into the window and is missing days inside it is restored, after a preview and (above 50 people) a Super Admin's approval."
      />
      {can('streaks.restore_bulk') && (
        <section className="mb-8 rounded-lg border bg-background p-4">
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
          <Button className="mt-3" disabled={!valid} onClick={() => setDialog(true)}>
            Create and calculate impact…
          </Button>
        </section>
      )}
      {!incidents ? (
        <Loading />
      ) : incidents.length === 0 ? (
        <Empty>No incidents yet.</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {incidents.map((i) => (
            <li key={i._id}>
              <Link
                href={`/admin/incidents/${i._id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/30"
              >
                <div>
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
