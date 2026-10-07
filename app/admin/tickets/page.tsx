'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { AlertTriangle, Search } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Input } from '@/components/ui/input'
import { Empty, fmtTime, Loading, PageHeader, Pill, selectClass } from '@/components/admin/common'
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
        description="Overdue and urgent tickets come first. Learners see replies in their app (and get a notification); visitors see them on their private conversation page."
        actions={
          <>
            <Link href="/admin/tickets/saved-replies" className="inline-flex min-h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted">Saved replies</Link>
            <Link href="/admin/tickets/guide" className="inline-flex min-h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted">Support guide</Link>
          </>
        }
      />
      {counts && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Need a reply', n: counts.open },
            { label: 'In progress', n: counts.inProgress },
            { label: 'Waiting on user', n: counts.pendingUser },
            { label: 'Overdue first reply', n: counts.overdue, alert: counts.overdue > 0 },
          ].map((c) => (
            <div key={c.label} className={`rounded-lg border p-3 ${c.alert ? 'border-destructive bg-destructive/5' : 'bg-background'}`}>
              <div className={`text-2xl font-bold ${c.alert ? 'text-destructive' : ''}`}>{c.n}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
      )}
      <div role="tablist" aria-label="Ticket status" className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.value} role="tab" aria-selected={status === f.value} onClick={() => setStatus(f.value)}
            className={`min-h-9 rounded-full border px-3 text-sm ${status === f.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Search tickets" placeholder="Number, subject, name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <label className="sr-only" htmlFor="f-priority">Priority</label>
        <select id="f-priority" className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as '' | TicketPriority)}>
          <option value="">Any priority</option>
          {(['urgent', 'high', 'normal', 'low'] as const).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-category">Category</label>
        <select id="f-category" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Any category</option>
          {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Assigned to me</label>
      </div>
      {tickets === undefined ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <Empty>{q ? `No tickets match “${q}”.` : 'No tickets here.'}</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {tickets.map((t) => (
            <li key={t._id}>
              <Link href={`/admin/tickets/${t._id}`} className={`flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${t.overdue ? 'border-l-4 border-l-destructive' : ''}`}>
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.number} · {t.learner.name || t.learner.email}{t.learner.visitor ? ' (visitor)' : ''} · {TICKET_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category} · {fmtTime(t.lastMessageAt)}
                    {t.assigneeName ? ` · ${t.assigneeName}` : ' · unassigned'}
                  </div>
                  {t.overdue ? (
                    <div className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />First reply overdue since {fmtTime(t.dueAt!)}</div>
                  ) : t.dueAt ? (
                    <div className="mt-1 text-xs text-muted-foreground">First reply due by {fmtTime(t.dueAt)}</div>
                  ) : null}
                </div>
                <span className="flex flex-wrap gap-1">
                  <Pill tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Pill>
                  <Pill tone={STATUS_TONE[t.status]}>{STATUS_STAFF[t.status]}</Pill>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
