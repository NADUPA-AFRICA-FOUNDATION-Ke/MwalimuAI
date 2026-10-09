'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { AlertTriangle, Clock, Hourglass, Inbox, LifeBuoy, MessageSquareReply } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Avatar, compactSelect, Empty, fmtTime, Loading, PageHeader, Panel, Pill, SearchField, Segmented, StatCard, StatGrid, Toolbar } from '@/components/admin/common'
import { PRIORITY_LABEL, STATUS_TONE, TICKET_CATEGORIES, type TicketPriority, type TicketStatus } from '@/lib/support'

const STATUS_STAFF: Record<TicketStatus, string> = { open: 'Needs reply', in_progress: 'In progress', pending_user: 'Waiting on user', resolved: 'Resolved', closed: 'Closed' }
const FILTERS = [
  { value: 'active', label: 'Needs work' },
  { value: 'pending_user', label: 'Waiting on user' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
] as const
const PRIORITY_TONE: Record<TicketPriority, 'red' | 'amber' | 'gray' | 'blue'> = { urgent: 'red', high: 'amber', normal: 'gray', low: 'blue' }

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export default function TicketsPage() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]['value']>('active')
  const [priority, setPriority] = useState<'' | TicketPriority>('')
  const [category, setCategory] = useState('')
  const [mine, setMine] = useState(false)
  const [search, setSearch] = useState('')
  const q = useDebounced(search, 300)
  const counts = useQuery(api.admin.tickets.counts, {})
  const tickets = useQuery(api.admin.tickets.list, {
    ...(status !== 'all' ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(mine ? { mine: true } : {}),
    ...(q.trim() ? { search: q.trim() } : {}),
  })

  return (
    <>
      <PageHeader
        title="Support tickets"
        description="Overdue and urgent tickets come first. Learners see replies in their app; visitors see them on their private conversation page."
        actions={
          <>
            <Link href="/admin/tickets/saved-replies" className="inline-flex min-h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted">Saved replies</Link>
            <Link href="/admin/tickets/guide" className="inline-flex min-h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted">Support guide</Link>
          </>
        }
      />
      <StatGrid>
        <StatCard icon={<Inbox />} label="Need a reply" value={counts?.open ?? '…'} tone={counts?.open ? 'warn' : 'default'} />
        <StatCard icon={<MessageSquareReply />} label="In progress" value={counts?.inProgress ?? '…'} />
        <StatCard icon={<Hourglass />} label="Waiting on user" value={counts?.pendingUser ?? '…'} />
        <StatCard icon={<Clock />} label="Overdue first reply" value={counts?.overdue ?? '…'} tone={counts?.overdue ? 'alert' : 'default'} />
      </StatGrid>

      <div className="mb-3">
        <Segmented label="Ticket status" value={status} onChange={setStatus} options={FILTERS} />
      </div>
      <Panel>
        <Toolbar end={tickets ? `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}` : undefined}>
          <SearchField value={search} onChange={setSearch} placeholder="Number, subject, name or email" label="Search tickets" />
          <select aria-label="Priority" className={compactSelect} value={priority} onChange={(e) => setPriority(e.target.value as '' | TicketPriority)}>
            <option value="">Any priority</option>
            {(['urgent', 'high', 'normal', 'low'] as const).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
          <select aria-label="Category" className={compactSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Any category</option>
            {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Assigned to me</label>
        </Toolbar>
        {tickets === undefined ? (
          <div className="px-4"><Loading /></div>
        ) : tickets.length === 0 ? (
          <div className="p-4"><Empty icon={<LifeBuoy />}>{q ? `No tickets match “${q}”.` : 'No tickets here.'}</Empty></div>
        ) : (
          <ul className="divide-y text-sm">
            {tickets.map((t) => (
              <li key={t._id}>
                <Link href={`/admin/tickets/${t._id}`} className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${t.overdue ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-transparent'}`}>
                  <Avatar name={t.learner.name || t.learner.email || '?'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{t.subject}</span>
                      <span className="flex shrink-0 flex-wrap gap-1">
                        <Pill tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Pill>
                        <Pill tone={STATUS_TONE[t.status]}>{STATUS_STAFF[t.status]}</Pill>
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{t.number}</span> · {t.learner.name || t.learner.email}{t.learner.visitor ? ' (visitor)' : ''} · {TICKET_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category} · {fmtTime(t.lastMessageAt)} · {t.assigneeName ?? 'unassigned'}
                    </div>
                    {t.overdue ? (
                      <div className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />First reply overdue since {fmtTime(t.dueAt!)}</div>
                    ) : t.dueAt ? (
                      <div className="mt-1 text-xs text-muted-foreground">First reply due by {fmtTime(t.dueAt)}</div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
