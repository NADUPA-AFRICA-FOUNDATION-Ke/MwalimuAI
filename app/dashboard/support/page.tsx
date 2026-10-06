'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { ChevronRight, LifeBuoy } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TICKET_CATEGORIES, STATUS_LABEL, errorMessage } from '@/lib/support'

type Category = (typeof TICKET_CATEGORIES)[number]['value']

export default function SupportPage() {
  const router = useRouter()
  const tickets = useQuery(api.tickets.listMine, {})
  const create = useMutation(api.tickets.create)
  const attachVerified = useMutation(api.tickets.attachVerified)
  const [category, setCategory] = useState<Category>('streak')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Conversations started as a visitor with this account's verified email address move into this inbox.
  useEffect(() => { void attachVerified({}).catch(() => {}) }, [attachVerified])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const { ticketId } = await create({ category, subject, body })
      router.push(`/dashboard/support/${ticketId}`)
    } catch (err) {
      setError(errorMessage(err, 'We could not send your ticket. Check your connection and try again.'))
      setSending(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Help &amp; support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what went wrong. A member of our team will reply here, and you will see a notification when they do.
        </p>
      </header>

      <section aria-labelledby="new-ticket">
        <h2 id="new-ticket" className="mb-3 text-lg font-semibold">Raise a ticket</h2>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="t-category">What is it about?</Label>
            <select
              id="t-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-subject">Short summary</Label>
            <Input id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} required className="min-h-11" placeholder="e.g. I lost my 12-day streak after the outage" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-body">What happened?</Label>
            <Textarea id="t-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required rows={5} placeholder="Include the dates and what you expected to see." />
            {category === 'streak' && (
              <p className="text-xs text-muted-foreground">For a streak, tell us which days you were learning but the streak broke. We can restore recent days after we check the records.</p>
            )}
          </div>
          {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={sending || subject.trim().length === 0 || body.trim().length === 0} className="min-h-11">
            {sending ? 'Sending…' : 'Send ticket'}
          </Button>
        </form>
      </section>

      <section aria-labelledby="my-tickets">
        <h2 id="my-tickets" className="mb-3 text-lg font-semibold">Your tickets</h2>
        {tickets === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <LifeBuoy className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
            You have not raised any tickets.
          </div>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {tickets.map((t) => (
              <li key={t._id}>
                <Link href={`/dashboard/support/${t._id}`} className="flex min-h-14 items-center justify-between gap-3 p-4 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.number} · {new Date(t.lastMessageAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.status === 'pending_user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
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
