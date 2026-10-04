'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Empty, fmtTime, Loading, Pill } from '@/components/admin/common'

const TYPE_LABEL: Record<string, string> = {
  lesson: 'Lesson',
  tool: 'Tool',
  journal: 'Journal',
  community: 'Community',
  login: 'Visit',
  assessment: 'Assessment',
}

/** What the learner has done, so support can answer "I did X but it is not showing". Counts only, never private text. */
export function ActivityTab({ profileId }: { profileId: Id<'profiles'> }) {
  const a = useQuery(api.admin.activity.overview, { profileId })
  if (!a) return <Loading />
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Last active" value={a.lastActiveAt ? fmtTime(a.lastActiveAt) : 'Never'} />
        <Stat label="Active days (30d)" value={String(a.activeDays30)} />
        <Stat label="Journal entries" value={String(a.counts.journalEntries)} />
        <Stat label="Community posts" value={String(a.counts.communityPosts)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Last 30 days by type</h2>
        {Object.keys(a.totals).length === 0 ? (
          <Empty>No recorded activity in the last 30 days.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(a.totals).map(([type, n]) => (
              <Pill key={type}>
                {TYPE_LABEL[type] ?? type}: {n}
              </Pill>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Day by day</h2>
        {a.days.length === 0 ? (
          <Empty>No activity recorded in the last 60 days.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {a.days.map((d) => (
              <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="font-mono text-xs">{d.date}</span>
                <span className="flex flex-wrap gap-1">
                  {d.restored ? <Pill tone="blue">Restored by staff</Pill> : d.types.map((t) => <Pill key={t}>{TYPE_LABEL[t] ?? t}</Pill>)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Programs</h2>
        {a.programs.length === 0 ? (
          <Empty>Has not started a program.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {a.programs.map((p) => (
              <li key={p.programId} className="flex flex-wrap justify-between gap-2 p-3">
                <span className="font-medium">{p.programId}</span>
                <span className="text-muted-foreground">
                  {p.lessonsCompleted} lessons{p.lastLesson ? ` · last ${p.lastLesson}` : ''} · updated {fmtTime(p.updatedAt)}
                  {p.certificateSerial ? ` · ${p.certificateSerial}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">AI tools used</h2>
        {a.tools.length === 0 ? (
          <Empty>No tools used.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {a.tools.map((t) => (
              <li key={t.toolId} className="flex flex-wrap justify-between gap-2 p-3">
                <span className="font-medium">{t.toolId}</span>
                <span className="text-muted-foreground">
                  {t.useCount}× · last {fmtTime(t.lastUsedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Support tickets</h2>
        {a.tickets.length === 0 ? (
          <Empty>This learner has not raised a ticket.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {a.tickets.map((t) => (
              <li key={t._id}>
                <Link href={`/admin/tickets/${t._id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50">
                  <span>
                    <span className="font-medium">{t.subject}</span> <span className="text-xs text-muted-foreground">{t.number}</span>
                  </span>
                  <Pill tone={t.status === 'resolved' ? 'green' : t.status === 'open' ? 'amber' : 'blue'}>{t.status.replace('_', ' ')}</Pill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">Journal text, AI chats and tool outputs are private and are not shown here.</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}
