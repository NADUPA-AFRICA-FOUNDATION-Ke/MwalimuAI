'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Empty, Field, fmtTime, Loading, PageHeader, Pill, ReasonDialog, selectClass, useRun } from '@/components/admin/common'

const STATE_TONE = { live: 'green', scheduled: 'blue', ended: 'gray', cancelled: 'gray' } as const

/** Messages to learners' notification bell: everyone, a county, or a level. One row however many people it reaches. */
export default function AnnouncementsPage() {
  const list = useQuery(api.admin.announcements.list, {})
  const tax = useQuery(api.admin.content.taxonomy, {})
  const send = useMutation(api.admin.announcements.send)
  const cancel = useMutation(api.admin.announcements.cancel)
  const { run, ok } = useRun()
  const [form, setForm] = useState({ title: '', body: '', link: '', who: 'all' as 'all' | 'custom', counties: [] as string[], levels: [] as string[], ends: '' })
  const [cancelId, setCancelId] = useState<Id<'announcements'> | null>(null)

  if (!list || !tax) return <Loading />
  const toggle = (key: 'counties' | 'levels', v: string) =>
    setForm({ ...form, [key]: form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v] })
  const valid = form.title.trim().length >= 3 && form.body.trim().length >= 5 && (form.who === 'all' || form.counties.length + form.levels.length > 0)

  return (
    <>
      <PageHeader title="Announcements" description="Send a message to learners’ notification bell. It reaches everyone, or only certain counties or levels, and can be withdrawn." />
      <section className="mb-8 space-y-4 rounded-lg border bg-background p-4" aria-labelledby="new-ann">
        <h2 id="new-ann" className="font-semibold">New announcement</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title"><Input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New lessons on inclusive classrooms" /></Field>
          <Field label="Link (optional)" hint="A page in the app like /dashboard/learning, or https://"><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></Field>
        </div>
        <Field label="Message" hint={`${form.body.length}/600`}><Textarea rows={3} maxLength={600} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Who gets it">
            <select className={selectClass} value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value as 'all' | 'custom' })}>
              <option value="all">Every learner</option>
              <option value="custom">Certain counties or levels</option>
            </select>
          </Field>
          <Field label="Stop showing on (optional)"><Input type="date" value={form.ends} onChange={(e) => setForm({ ...form, ends: e.target.value })} /></Field>
        </div>
        {form.who === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset><legend className="mb-1 text-sm font-medium">Counties</legend>
              <div className="grid max-h-48 grid-cols-2 gap-x-3 gap-y-1 overflow-auto rounded-md border p-2 text-sm">
                {tax.counties.map((c) => <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={form.counties.includes(c)} onChange={() => toggle('counties', c)} />{c}</label>)}
              </div>
            </fieldset>
            <fieldset><legend className="mb-1 text-sm font-medium">Teaches this level</legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border p-2 text-sm">
                {tax.cbcLevels.map((l) => <label key={l} className="flex items-center gap-2"><input type="checkbox" checked={form.levels.includes(l)} onChange={() => toggle('levels', l)} />{l}</label>)}
              </div>
            </fieldset>
          </div>
        )}
        <Button disabled={!valid} onClick={async () => {
          const r = await run(() => send({ title: form.title, body: form.body, link: form.link || undefined, all: form.who === 'all', counties: form.counties, levels: form.levels, endsAt: form.ends ? Date.parse(`${form.ends}T23:59:59+03:00`) : undefined }), 'Announcement sent')
          if (r) setForm({ title: '', body: '', link: '', who: 'all', counties: [], levels: [], ends: '' })
        }}>Send announcement</Button>
      </section>

      <h2 className="mb-2 font-semibold">Recent</h2>
      {list.length === 0 ? <Empty>No announcements yet.</Empty> : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {list.map((a) => (
            <li key={a._id} className="space-y-1 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{a.title}</span>
                <span className="flex items-center gap-2">
                  <Pill tone={STATE_TONE[a.state]}>{a.state}</Pill>
                  {(a.state === 'live' || a.state === 'scheduled') && <Button size="sm" variant="ghost" onClick={() => setCancelId(a._id)}>Withdraw…</Button>}
                </span>
              </div>
              <p className="text-muted-foreground">{a.body}</p>
              <p className="text-xs text-muted-foreground">
                {a.audience.all ? 'Everyone' : [...a.audience.counties, ...a.audience.levels].join(', ')} · {fmtTime(a.startsAt)}{a.endsAt ? ` to ${fmtTime(a.endsAt)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog
        open={cancelId !== null}
        onOpenChange={(o) => !o && setCancelId(null)}
        title="Withdraw this announcement?"
        description="It disappears from learners' notifications."
        confirmLabel="Withdraw"
        destructive
        onConfirm={(reason) => ok(() => cancel({ announcementId: cancelId!, reason }), 'Withdrawn')}
      />
    </>
  )
}
