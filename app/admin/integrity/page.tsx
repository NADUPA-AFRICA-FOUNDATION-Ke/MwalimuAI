'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Accessibility, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Avatar, Empty, fmtTime, Loading, PageHeader, Pill, SearchField, Segmented, StatCard, StatGrid } from '@/components/admin/common'

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
  const [search, setSearch] = useState('')
  const rows = useQuery(api.admin.assessmentIntegrity.recent, { flaggedOnly })
  const q = search.trim().toLowerCase()
  const shown = rows && q ? rows.filter((a) => a.learner.toLowerCase().includes(q) || a.programId.toLowerCase().includes(q)) : rows
  const serious = rows?.filter((a) => a.serious.length > 0).length ?? 0
  const assistive = rows?.filter((a) => a.assistive).length ?? 0

  return (
    <>
      <PageHeader
        title="Assessment security"
        description="What learners' browsers saw during guarded quizzes, needs assessments and assignments. Events can have innocent causes, so talk to the learner before acting. Scores are marked on the server and never changed by these events."
      />
      <StatGrid cols={3}>
        <StatCard icon={<ShieldCheck />} label={flaggedOnly ? 'Flagged sittings' : 'Sittings'} value={rows ? rows.length : '…'} sub="most recent shown" />
        <StatCard icon={<ShieldAlert />} label="Need a look" value={rows ? serious : '…'} sub="paste, screenshot, dev tools, second tab…" tone={serious ? 'alert' : 'default'} />
        <StatCard icon={<Accessibility />} label="Assistive input" value={rows ? assistive : '…'} sub="likely innocent: check before acting" />
      </StatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Filter"
          value={flaggedOnly ? 'flagged' : 'all'}
          onChange={(v) => setFlaggedOnly(v === 'flagged')}
          options={[{ value: 'flagged', label: 'Flagged only' }, { value: 'all', label: 'All sittings' }]}
        />
        <SearchField value={search} onChange={setSearch} placeholder="Search by learner or program" label="Search sittings" />
      </div>

      {shown === undefined ? <Loading /> : shown.length === 0 ? (
        <Empty icon={<ShieldCheck />}>{q ? `No sittings match “${search}”.` : flaggedOnly ? 'No flagged sittings yet.' : 'No sittings recorded yet.'}</Empty>
      ) : (
        <ul className="space-y-3 text-sm">
          {shown.map((a) => (
            <li key={a._id} className={`rounded-xl border border-l-4 bg-background p-4 ${a.serious.length ? 'border-l-destructive' : 'border-l-emerald-500'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={a.learner} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/users/${a.profileId}`} className="font-medium hover:text-primary hover:underline">{a.learner}</Link>
                  <p className="text-xs text-muted-foreground">
                    {KIND[a.kind] ?? a.kind} · {a.programId} · started {fmtTime(a.startedAt)}{a.submittedAt ? ` · submitted ${fmtTime(a.submittedAt)}` : ''}
                  </p>
                </div>
                {a.score !== null && (
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{a.score}/{a.total}</span>
                    <span className="block text-xs text-muted-foreground">score</span>
                  </span>
                )}
                <span className="flex gap-1">
                  {a.assistive && <Pill tone="blue">Assistive input</Pill>}
                  {a.serious.length ? <Pill tone="red">Needs a look</Pill> : <Pill tone="green">No serious flags</Pill>}
                </span>
              </div>
              {Object.keys(a.flags).length > 0 && (
                <p className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
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
