'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Empty, fmtTime, Loading, PageHeader, Pill, useRun, useStaff } from '@/components/admin/common'

/** Application errors grouped by cause, so a problem is visible before many users have reported it. */
export default function ErrorsPage() {
  const { can } = useStaff()
  const [all, setAll] = useState(false)
  const errors = useQuery(api.admin.errors.list, { includeResolved: all })
  const resolve = useMutation(api.admin.errors.resolve)
  const { run } = useRun()
  const [open, setOpen] = useState<string | null>(null)

  return (
    <>
      <PageHeader title="Errors" description="Problems learners' browsers and the server hit, grouped by cause. The same error is counted, not repeated. Messages are scrubbed of emails, ids and addresses." actions={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />Show resolved</label>} />
      {errors === undefined ? <Loading /> : errors.length === 0 ? <Empty>No open errors.</Empty> : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {errors.map((e) => (
            <li key={e._id} className="space-y-1 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0 flex-1 font-medium break-words">{e.message}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Pill tone={e.count >= 20 ? 'red' : 'amber'}>{e.count}×</Pill>
                  <Pill>{e.source}</Pill>
                  {e.resolved && <Pill tone="green">resolved</Pill>}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{e.route ?? 'no page'} · first {fmtTime(e.firstSeen)} · last {fmtTime(e.lastSeen)}</p>
              <div className="flex gap-2">
                {e.stack && <Button size="sm" variant="ghost" onClick={() => setOpen(open === e._id ? null : e._id)}>{open === e._id ? 'Hide details' : 'Details'}</Button>}
                {!e.resolved && can('staff.manage') && <Button size="sm" variant="outline" onClick={() => void run(() => resolve({ errorId: e._id }), 'Marked resolved. It reopens if it happens again.')}>Mark resolved</Button>}
              </div>
              {open === e._id && e.stack && <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs">{e.stack}</pre>}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
