'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Empty, fmtTime, Loading, Pill } from '@/components/admin/common'

const LABEL: Record<string, string> = {
  copy: 'Copy attempt', cut: 'Cut attempt', paste: 'Paste attempt', drop: 'Drag/drop attempt', context_menu: 'Right-click',
  select_all: 'Select all', print: 'Print or save attempt', screenshot_key: 'Screenshot key', window_blur: 'Left the window',
  tab_hidden: 'Switched tab/app', devtools_open: 'Developer tools', large_insert: 'Text inserted, not typed',
  fullscreen_exit: 'Left full screen', second_tab: 'Opened in another tab', assistive_on: 'Assistive input on',
}
const SERIOUS = new Set(['devtools_open', 'screenshot_key', 'paste', 'large_insert', 'second_tab'])

/** Each assessment sitting with what was seen while it was open. Evidence for a conversation, not an automatic verdict. */
export function IntegrityTab({ profileId }: { profileId: Id<'profiles'> }) {
  const rows = useQuery(api.admin.assessmentIntegrity.forUser, { profileId })
  if (rows === undefined) return <Loading />
  if (rows.length === 0) return <Empty>No assessment sittings yet.</Empty>
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Events are recorded by the learner&apos;s browser and can have innocent causes (a notification stealing focus, an accessibility tool). Talk to the learner before acting. Scores are marked on the server and are never changed by these events.
      </p>
      <ul className="space-y-3">
        {rows.map((a) => {
          const serious = Object.keys(a.flags).filter((f) => SERIOUS.has(f))
          return (
            <li key={a._id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{a.programId} · {({ pre: 'pre-assessment', post: 'final assessment', needs: 'needs assessment', assignment: 'assignment' } as Record<string, string>)[a.kind] ?? a.kind}</span>
                <span className="flex flex-wrap gap-1">
                  {a.assistive && <Pill tone="blue">Assistive input</Pill>}
                  {serious.length > 0 ? <Pill tone="red">Needs a look</Pill> : <Pill tone="green">No serious flags</Pill>}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Started {fmtTime(a.startedAt)}{a.submittedAt ? ` · submitted ${fmtTime(a.submittedAt)}` : ' · not submitted'}{a.score !== null ? ` · score ${a.score}/${a.total}` : ''}
              </p>
              {Object.keys(a.flags).length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(a.flags).map(([k, n]) => (
                    <Pill key={k} tone={SERIOUS.has(k) ? 'red' : 'gray'}>{LABEL[k] ?? k} × {n}</Pill>
                  ))}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
