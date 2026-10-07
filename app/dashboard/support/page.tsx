'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { ChevronRight, LifeBuoy, Plus, Search } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentPicker, type Uploaded } from '@/components/support/attachments'
import { TICKET_CATEGORIES, STATUS_LABEL, errorMessage, type TicketStatus } from '@/lib/support'

type Category = (typeof TICKET_CATEGORIES)[number]['value']

const FILTERS: { value: 'all' | 'active' | 'pending_user' | 'done'; label: string; match: (s: TicketStatus) => boolean }[] = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'pending_user', label: 'Waiting on you', match: (s) => s === 'pending_user' },
  { value: 'active', label: 'Open', match: (s) => s === 'open' || s === 'in_progress' },
  { value: 'done', label: 'Resolved & closed', match: (s) => s === 'resolved' || s === 'closed' },
]

const PILL: Record<TicketStatus, string> = {
  open: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  in_progress: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100',
  pending_user: 'bg-primary text-primary-foreground',
  resolved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  closed: 'bg-muted text-muted-foreground',
}
const when = (ms: number) => new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })

export default function SupportPage() {
  const router = useRouter()
  const tickets = useQuery(api.tickets.listMine, {})
  const create = useMutation(api.tickets.create)
  const attachVerified = useMutation(api.tickets.attachVerified)
  const uploadUrl = useMutation(api.tickets.generateUploadUrl)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState<Category>('other')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<Uploaded[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')
  const [query, setQuery] = useState('')

  // Conversations started as a visitor with this account's verified email address move into this inbox.
  useEffect(() => { void attachVerified({}).catch(() => {}) }, [attachVerified])
  // Open the form straight away for someone with no tickets yet.
  useEffect(() => { if (tickets && tickets.length === 0) setShowForm(true) }, [tickets])

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.value === filter)!
    const q = query.trim().toLowerCase()
    return (tickets ?? []).filter((t) => f.match(t.status) && (!q || `${t.number} ${t.subject}`.toLowerCase().includes(q)))
  }, [tickets, filter, query])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const { ticketId } = await create({ category, subject, body, ...(files.length ? { attachments: files } : {}) })
      router.push(`/dashboard/support/${ticketId}`)
    } catch (err) {
      setError(errorMessage(err, 'We could not send your ticket. Check your connection and try again.'))
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Help &amp; support</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Raise a ticket and our team replies here. You get a notification when they do. <Link href="/docs#support" className="text-primary underline underline-offset-4">How support works</Link>
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="min-h-11 gap-2"><Plus className="h-4 w-4" aria-hidden="true" />New ticket</Button>
        )}
      </header>

      {showForm && (
        <section aria-labelledby="new-ticket">
          <h2 id="new-ticket" className="mb-3 text-lg font-semibold">New ticket</h2>
          <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
            <div className="space-y-2">
              <Label htmlFor="t-category">What is it about?</Label>
              <select id="t-category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-subject">Short summary</Label>
              <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} required className="min-h-11" placeholder="e.g. My certificate is not showing" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-body">What happened?</Label>
              <Textarea id="t-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required rows={5} placeholder="Include the dates, what you did and what you expected to see." />
              {category === 'streak' && <p className="text-xs text-muted-foreground">For a streak, tell us which days you were learning but the streak broke. We can restore recent days after we check the records.</p>}
            </div>
            <AttachmentPicker getUploadUrl={() => uploadUrl({})} onChange={setFiles} disabled={sending} />
            {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sending || !subject.trim() || !body.trim()} className="min-h-11">{sending ? 'Sending…' : 'Send ticket'}</Button>
              {(tickets?.length ?? 0) > 0 && <Button type="button" variant="ghost" className="min-h-11" onClick={() => setShowForm(false)}>Cancel</Button>}
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="my-tickets">
        <h2 id="my-tickets" className="mb-3 text-lg font-semibold">Your tickets</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Filter tickets" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const n = (tickets ?? []).filter((t) => f.match(t.status)).length
              return (
                <button key={f.value} role="tab" aria-selected={filter === f.value} onClick={() => setFilter(f.value)}
                  className={`min-h-10 rounded-full border px-3 text-sm ${filter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
                  {f.label}{tickets ? ` (${n})` : ''}
                </button>
              )
            })}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search your tickets" placeholder="Search by number or subject" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-10 pl-9" />
          </div>
        </div>
        {tickets === undefined ? (
          <p role="status" className="text-sm text-muted-foreground">Loading your tickets…</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <LifeBuoy className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
            You have not raised any tickets yet.
          </div>
        ) : shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No tickets match. Try another filter or search.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {shown.map((t) => (
              <li key={t._id}>
                <Link href={`/dashboard/support/${t._id}`} className="flex min-h-14 items-center justify-between gap-3 p-4 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.number} · {TICKET_CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category} · updated {when(t.lastMessageAt)}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILL[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
