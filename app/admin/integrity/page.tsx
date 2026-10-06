'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Empty, fmtTime, Loading, PageHeader, Pill } from '@/components/admin/common'

const LABEL: Record<string, string> = {
  copy: 'Copy', cut: 'Cut', paste: 'Paste', drop: 'Drag/drop', context_menu: 'Right-click', select_all: 'Select all',
  print: 'Print/save', screenshot_key: 'Screenshot key', window_blur: 'Left window', tab_hidden: 'Switched tab/app',
  devtools_open: 'Developer tools', large_insert: 'Text inserted, not typed', fullscreen_exit: 'Left full screen',
  second_tab: 'Second tab', assistive_on: 'Assistive input',
}
const KIND: Record<string, string> = { pre: 'Pre-assessment', post: 'Final assessment', needs: 'Needs assessment', assignment: 'Assignment' }
const SERIOUS = new Set(['devtools_open', 'screenshot_key', 'paste', 'large_insert', 'second_tab', 'print'])

export default function IntegrityPage() {
  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const rows = useQuery(api.admin.assessmentIntegrity.recent, { flaggedOnly })
  return (
    <>
      <PageHeader
        title="Assessment security"
        description="Every guarded sitting (quizzes, needs assessment, assignments) and what the learner's browser saw while it was open. Events can have innocent causes, so talk to the learner before acting. Scores are marked on the server and are never changed by these events."
      />
      <div role="tablist" aria-label="Filter" className="mb-4 flex gap-2">
        {[{ v: true, l: 'Flagged only' }, { v: false, l: 'All sittings' }].map((f) => (
          <button key={f.l} role="tab" aria-selected={flaggedOnly === f.v} onClick={() => setFlaggedOnly(f.v)}
            className={`min-h-9 rounded-full border px-3 text-sm ${flaggedOnly === f.v ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>{f.l}</button>
        ))}
      </div>
      {rows === undefined ? <Loading /> : rows.length === 0 ? (
        <Empty>{flaggedOnly ? 'No flagged sittings yet.' : 'No sittings recorded yet.'}</Empty>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((a) => (
            <li key={a._id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/users/${a.profileId}`} className="font-medium text-primary hover:underline">{a.learner}</Link>
                <span className="flex gap-1">
                  {a.assistive && <Pill tone="blue">Assistive input</Pill>}
                  {a.serious.length ? <Pill tone="red">Needs a look</Pill> : <Pill tone="green">No serious flags</Pill>}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {KIND[a.kind] ?? a.kind} · {a.programId} · started {fmtTime(a.startedAt)}{a.submittedAt ? ` · submitted ${fmtTime(a.submittedAt)}` : ''}{a.score !== null ? ` · score ${a.score}/${a.total}` : ''}
              </p>
              {Object.keys(a.flags).length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(a.flags).map(([k, n]) => <Pill key={k} tone={SERIOUS.has(k) ? 'red' : 'gray'}>{LABEL[k] ?? k} × {n}</Pill>)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
