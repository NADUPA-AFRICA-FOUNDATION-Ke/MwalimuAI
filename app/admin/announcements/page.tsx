'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { CalendarClock, Megaphone, Plus, Radio } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Empty, Field, fmtTime, Loading, PageHeader, Panel, Pill, ReasonDialog, Segmented, selectClass, StatCard, StatGrid, useRun } from '@/components/admin/common'

const STATE_TONE = { live: 'green', scheduled: 'blue', ended: 'gray', cancelled: 'gray' } as const
const EMPTY_FORM = { title: '', body: '', link: '', who: 'all' as 'all' | 'custom', counties: [] as string[], levels: [] as string[], ends: '' }

/** Messages to learners' notification bell: everyone, a county, or a level. One row however many people it reaches. */
export default function AnnouncementsPage() {
  const list = useQuery(api.admin.announcements.list, {})
  const tax = useQuery(api.admin.content.taxonomy, {})
  const send = useMutation(api.admin.announcements.send)
  const cancel = useMutation(api.admin.announcements.cancel)
  const { run, ok } = useRun()
  const [form, setForm] = useState(EMPTY_FORM)
  const [composing, setComposing] = useState(false)
  const [view, setView] = useState<'current' | 'past'>('current')
  const [cancelId, setCancelId] = useState<Id<'announcements'> | null>(null)

  if (!list || !tax) return <Loading />
  const toggle = (key: 'counties' | 'levels', v: string) =>
    setForm({ ...form, [key]: form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v] })
  const valid = form.title.trim().length >= 3 && form.body.trim().length >= 5 && (form.who === 'all' || form.counties.length + form.levels.length > 0)
  const live = list.filter((a) => a.state === 'live')
  const scheduled = list.filter((a) => a.state === 'scheduled')
  const shown = list.filter((a) => (view === 'current' ? a.state === 'live' || a.state === 'scheduled' : a.state === 'ended' || a.state === 'cancelled'))

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Messages in learners’ notification bell, for everyone or only certain counties or levels. They can be withdrawn at any time."
        actions={!composing && <Button size="sm" onClick={() => setComposing(true)}><Plus className="mr-1.5 h-4 w-4" />New announcement</Button>}
      />
      <StatGrid cols={3}>
        <StatCard icon={<Radio />} label="Live now" value={live.length} sub="showing in learners’ bell" />
        <StatCard icon={<CalendarClock />} label="Scheduled" value={scheduled.length} sub="not started yet" />
        <StatCard icon={<Megaphone />} label="Sent in total" value={list.length} sub="including ended and withdrawn" />
      </StatGrid>

      {composing && (
        <Panel title="New announcement" className="mb-6">
          <div className="space-y-4 p-4">
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
                  <div className="grid max-h-48 grid-cols-2 gap-x-3 gap-y-1 overflow-auto rounded-lg border p-2 text-sm">
                    {tax.counties.map((c) => <label key={c} className="flex items-center gap-2"><input type="checkbox" checked={form.counties.includes(c)} onChange={() => toggle('counties', c)} />{c}</label>)}
                  </div>
                </fieldset>
                <fieldset><legend className="mb-1 text-sm font-medium">Teaches this level</legend>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border p-2 text-sm">
                    {tax.cbcLevels.map((l) => <label key={l} className="flex items-center gap-2"><input type="checkbox" checked={form.levels.includes(l)} onChange={() => toggle('levels', l)} />{l}</label>)}
                  </div>
                </fieldset>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button disabled={!valid} onClick={async () => {
                const r = await run(() => send({ title: form.title, body: form.body, link: form.link || undefined, all: form.who === 'all', counties: form.counties, levels: form.levels, endsAt: form.ends ? Date.parse(`${form.ends}T23:59:59+03:00`) : undefined }), 'Announcement sent')
                if (r) {
                  setForm(EMPTY_FORM)
                  setComposing(false)
                }
              }}>Send announcement</Button>
              <Button variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
            </div>
          </div>
        </Panel>
      )}

      <div className="mb-3">
        <Segmented
          label="Announcements to show"
          value={view}
          onChange={setView}
          options={[
            { value: 'current', label: 'Live & scheduled', count: live.length + scheduled.length },
            { value: 'past', label: 'Ended & withdrawn', count: list.length - live.length - scheduled.length },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <Empty icon={<Megaphone />}>{view === 'current' ? 'Nothing is showing to learners right now.' : 'No past announcements.'}</Empty>
      ) : (
        <Panel>
          <ul className="divide-y text-sm">
            {shown.map((a) => (
              <li key={a._id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  <span className="flex items-center gap-2">
                    <Pill tone={STATE_TONE[a.state]}>{a.state}</Pill>
                    {(a.state === 'live' || a.state === 'scheduled') && <Button size="sm" variant="ghost" onClick={() => setCancelId(a._id)}>Withdraw…</Button>}
                  </span>
                </div>
                <p className="text-muted-foreground">{a.body}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {a.audience.all ? <Pill tone="blue">Everyone</Pill> : [...a.audience.counties, ...a.audience.levels].map((x) => <Pill key={x}>{x}</Pill>)}
                  <span className="ml-1">{fmtTime(a.startsAt)}{a.endsAt ? ` to ${fmtTime(a.endsAt)}` : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
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
