'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Empty, Field, fmtTime, Loading, PageHeader, Pill, ReasonDialog, useRun } from '@/components/admin/common'

/** Schools using the school dashboard. Staff can set one up for a head teacher (pilots, offline invoices). */
export default function SchoolsPage() {
  const schools = useQuery(api.admin.schools.list, {})
  const create = useMutation(api.admin.schools.create)
  const archive = useMutation(api.admin.schools.archive)
  const { ok } = useRun()
  const [form, setForm] = useState({ name: '', county: '', headEmail: '' })
  const [dialog, setDialog] = useState<'create' | Id<'schools'> | null>(null)
  const valid = form.name.trim().length >= 3 && /\S+@\S+\.\S+/.test(form.headEmail)
  return (
    <>
      <PageHeader title="Schools" description="Head teachers see how the teachers who joined their school are progressing. Teachers join with a code and can leave any time." />
      <section className="mb-8 space-y-3 rounded-lg border bg-background p-4">
        <h2 className="font-semibold">Set up a school</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="School name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="County (optional)"><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></Field>
          <Field label="Head teacher's account email" hint="They must already have signed up."><Input type="email" value={form.headEmail} onChange={(e) => setForm({ ...form, headEmail: e.target.value })} /></Field>
        </div>
        <Button disabled={!valid} onClick={() => setDialog('create')}>Create school…</Button>
      </section>
      {schools === undefined ? <Loading /> : schools.length === 0 ? <Empty>No schools yet.</Empty> : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {schools.map((s) => (
            <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <div className="font-medium">{s.name}{s.county ? ` · ${s.county}` : ''}</div>
                <div className="text-xs text-muted-foreground">Head: {s.headName || s.headEmail} · {s.members} member{s.members === 1 ? '' : 's'} · since {fmtTime(s.createdAt)}</div>
              </div>
              <span className="flex items-center gap-2">
                {s.archived ? <Pill>archived</Pill> : <Button size="sm" variant="ghost" onClick={() => setDialog(s._id)}>Archive…</Button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog === 'create' ? 'Create this school?' : 'Archive this school?'}
        description={dialog === 'create' ? 'The head teacher gets a join code to share with their teachers.' : 'Teachers can no longer join, and the head loses the dashboard. Nothing is deleted.'}
        confirmLabel="Confirm"
        destructive={dialog !== 'create'}
        onConfirm={(reason) =>
          ok(async () => {
            if (dialog === 'create') { await create({ name: form.name, county: form.county || undefined, headEmail: form.headEmail, reason }); setForm({ name: '', county: '', headEmail: '' }) }
            else await archive({ schoolId: dialog as Id<'schools'>, reason })
          }, 'Done')
        }
      />
    </>
  )
}
