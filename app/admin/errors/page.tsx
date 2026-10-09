'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, Bug, CheckCircle2, Monitor, Server } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Empty, fmtTime, Loading, PageHeader, Panel, Pill, SearchField, Segmented, StatCard, StatGrid, Toolbar, useRun, useStaff } from '@/components/admin/common'

/** Application errors grouped by cause, so a problem is visible before many users have reported it. */
export default function ErrorsPage() {
  const { can } = useStaff()
  const [all, setAll] = useState(false)
  const [search, setSearch] = useState('')
  const errors = useQuery(api.admin.errors.list, { includeResolved: all })
  const resolve = useMutation(api.admin.errors.resolve)
  const { run } = useRun()
  const [open, setOpen] = useState<string | null>(null)

  const q = search.trim().toLowerCase()
  const shown = errors && q ? errors.filter((e) => e.message.toLowerCase().includes(q) || (e.route ?? '').toLowerCase().includes(q)) : errors
  const unresolved = errors?.filter((e) => !e.resolved) ?? []
  const hits = unresolved.reduce((n, e) => n + e.count, 0)
  const server = unresolved.filter((e) => e.source !== 'browser').length

  return (
    <>
      <PageHeader title="Errors" description="Problems learners' browsers and the server hit, grouped by cause. Messages are scrubbed of emails, ids and addresses." />
      <StatGrid>
        <StatCard icon={<Bug />} label="Open error groups" value={errors ? unresolved.length : '…'} tone={unresolved.length ? 'warn' : 'default'} />
        <StatCard icon={<AlertTriangle />} label="Occurrences" value={errors ? hits.toLocaleString() : '…'} sub="across open groups" tone={hits >= 100 ? 'alert' : 'default'} />
        <StatCard icon={<Server />} label="Server & API" value={errors ? server : '…'} sub="open groups" />
        <StatCard icon={<Monitor />} label="Browser" value={errors ? unresolved.length - server : '…'} sub="open groups" />
      </StatGrid>

      <Panel>
        <Toolbar end={shown ? `${shown.length} group${shown.length === 1 ? '' : 's'}` : undefined}>
          <Segmented label="Errors to show" value={all ? 'all' : 'open'} onChange={(v) => setAll(v === 'all')} options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'Include resolved' }]} />
          <SearchField value={search} onChange={setSearch} placeholder="Search message or page" label="Search errors" />
        </Toolbar>
        {shown === undefined ? (
          <div className="px-4"><Loading /></div>
        ) : shown.length === 0 ? (
          <div className="p-4"><Empty icon={<CheckCircle2 />}>{q ? `No errors match “${search}”.` : 'No open errors. All clear.'}</Empty></div>
        ) : (
          <ul className="divide-y text-sm">
            {shown.map((e) => (
              <li key={e._id} className={`space-y-2 border-l-4 px-4 py-3 ${e.resolved ? 'border-l-transparent opacity-70' : e.count >= 20 ? 'border-l-destructive' : 'border-l-amber-400'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 break-words font-medium">{e.message}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Pill tone={e.count >= 20 ? 'red' : 'amber'}>{e.count}×</Pill>
                    <Pill>{e.source}</Pill>
                    {e.resolved && <Pill tone="green">resolved</Pill>}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{e.route ?? 'no page'}</span> · first {fmtTime(e.firstSeen)} · last {fmtTime(e.lastSeen)}
                </p>
                {(e.stack || (!e.resolved && can('staff.manage'))) && (
                  <div className="flex gap-2">
                    {e.stack && <Button size="sm" variant="ghost" aria-expanded={open === e._id} onClick={() => setOpen(open === e._id ? null : e._id)}>{open === e._id ? 'Hide details' : 'Details'}</Button>}
                    {!e.resolved && can('staff.manage') && <Button size="sm" variant="outline" onClick={() => void run(() => resolve({ errorId: e._id }), 'Marked resolved. It reopens if it happens again.')}>Mark resolved</Button>}
                  </div>
                )}
                {open === e._id && e.stack && <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{e.stack}</pre>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
