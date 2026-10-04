'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Empty, fmtTime, Loading, PageHeader, Pill } from '@/components/admin/common'

const TICKET_STATUS: Record<string, { label: string; tone: 'amber' | 'blue' | 'green' }> = {
  open: { label: 'Needs reply', tone: 'amber' },
  pending_user: { label: 'Waiting on learner', tone: 'blue' },
  resolved: { label: 'Resolved', tone: 'green' },
}

const FILTERS = [
  { value: 'open', label: 'Needs reply' },
  { value: 'pending_user', label: 'Waiting on learner' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
] as const

export default function TicketsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('open')
  const tickets = useQuery(api.admin.tickets.list, filter === 'all' ? {} : { status: filter })
  return (
    <>
      <PageHeader title="Support tickets" description="Requests raised by learners from the app. Replies appear in their ticket and in their notifications." />
      <div role="tablist" aria-label="Ticket status" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-9 rounded-full border px-3 text-sm ${filter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {tickets === undefined ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <Empty>No tickets here.</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {tickets.map((t) => (
            <li key={t._id}>
              <Link href={`/admin/tickets/${t._id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.number} · {t.learner.name || t.learner.email} · {t.category} · {fmtTime(t.lastMessageAt)}
                  </div>
                </div>
                <Pill tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
