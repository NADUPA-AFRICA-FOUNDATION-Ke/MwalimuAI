'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Archive, Plus, School, Users } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Empty, Field, fmtTime, Loading, PageHeader, Panel, Pill, ReasonDialog, SearchField, StatCard, StatGrid, Toolbar, useRun } from '@/components/admin/common'

/** Schools using the school dashboard. Staff can set one up for a head teacher (pilots, offline invoices). */
export default function SchoolsPage() {
  const schools = useQuery(api.admin.schools.list, {})
  const create = useMutation(api.admin.schools.create)
  const archive = useMutation(api.admin.schools.archive)
  const { ok } = useRun()
  const [form, setForm] = useState({ name: '', county: '', headEmail: '' })
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<'create' | Id<'schools'> | null>(null)
  const valid = form.name.trim().length >= 3 && /\S+@\S+\.\S+/.test(form.headEmail)

  if (schools === undefined) return <Loading />
  const active = schools.filter((s) => !s.archived)
  const members = active.reduce((n, s) => n + s.members, 0)
  const q = search.trim().toLowerCase()
  const shown = q
    ? schools.filter((s) => [s.name, s.county, s.headName, s.headEmail].some((v) => (v ?? '').toLowerCase().includes(q)))
    : schools

  return (
    <>
      <PageHeader
        title="Schools"
        description="Head teachers see how the teachers who joined their school are progressing. Teachers join with a code and can leave any time."
        actions={!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />Set up a school</Button>}
      />
      <StatGrid cols={3}>
        <StatCard icon={<School />} label="Active schools" value={active.length} sub={`${schools.length - active.length} archived`} />
        <StatCard icon={<Users />} label="Teachers in schools" value={members.toLocaleString()} sub="across active schools" />
        <StatCard icon={<Users />} label="Average per school" value={active.length ? Math.round(members / active.length) : 0} sub="teachers" />
      </StatGrid>

      {creating && (
        <Panel title="Set up a school" description="The head teacher gets a join code to share with their teachers." className="mb-6">
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="School name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="County (optional)"><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></Field>
              <Field label="Head teacher's account email" hint="They must already have signed up."><Input type="email" value={form.headEmail} onChange={(e) => setForm({ ...form, headEmail: e.target.value })} /></Field>
            </div>
            <div className="flex gap-2">
              <Button disabled={!valid} onClick={() => setDialog('create')}>Create school…</Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        </Panel>
      )}

      <Panel>
        <Toolbar end={`${shown.length} of ${schools.length} schools`}>
          <SearchField value={search} onChange={setSearch} placeholder="Search by school, county or head teacher" label="Search schools" />
        </Toolbar>
        {schools.length === 0 ? (
          <div className="p-4"><Empty icon={<School />}>No schools yet. Set one up for a head teacher to get started.</Empty></div>
        ) : shown.length === 0 ? (
          <div className="p-4"><Empty>No schools match “{search}”.</Empty></div>
        ) : (
          <ul className="divide-y text-sm">
            {shown.map((s) => (
              <li key={s._id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${s.archived ? 'opacity-60' : ''}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true"><School className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.name}{s.county && <span className="font-normal text-muted-foreground"> · {s.county}</span>}</div>
                  <div className="truncate text-xs text-muted-foreground">Head: {s.headName || s.headEmail} · since {fmtTime(s.createdAt)}</div>
                </div>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{s.members}</span>
                  <span className="block text-xs text-muted-foreground">member{s.members === 1 ? '' : 's'}</span>
                </span>
                {s.archived ? (
                  <Pill>archived</Pill>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setDialog(s._id)} aria-label={`Archive ${s.name}`}>
                    <Archive className="mr-1.5 h-3.5 w-3.5" />Archive…
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog === 'create' ? 'Create this school?' : 'Archive this school?'}
        description={dialog === 'create' ? 'The head teacher gets a join code to share with their teachers.' : 'Teachers can no longer join, and the head loses the dashboard. Nothing is deleted.'}
        confirmLabel="Confirm"
        destructive={dialog !== 'create'}
        onConfirm={(reason) =>
          ok(async () => {
            if (dialog === 'create') {
              await create({ name: form.name, county: form.county || undefined, headEmail: form.headEmail, reason })
              setForm({ name: '', county: '', headEmail: '' })
              setCreating(false)
            } else await archive({ schoolId: dialog as Id<'schools'>, reason })
          }, 'Done')
        }
      />
    </>
  )
}
