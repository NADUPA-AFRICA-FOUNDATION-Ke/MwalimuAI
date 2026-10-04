'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { STATUS_LABEL, errorMessage } from '@/lib/support'

export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = id as Id<'tickets'>
  const data = useQuery(api.tickets.getMine, { ticketId })
  const reply = useMutation(api.tickets.reply)
  const resolve = useMutation(api.tickets.resolve)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (data === undefined) return <p className="text-sm text-muted-foreground">Loading…</p>

  const { ticket, messages } = data

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await reply({ ticketId, body })
      setBody('')
    } catch (err) {
      setError(errorMessage(err, 'Your reply was not sent. Check your connection and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-muted-foreground">{ticket.number}</p>
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Status: {STATUS_LABEL[ticket.status]}</p>
      </header>

      <ol className="space-y-3" aria-label="Conversation">
        {messages.map((m) => (
          <li key={m._id} className={`rounded-2xl border p-4 ${m.author === 'staff' ? 'bg-secondary' : 'bg-card'}`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{m.author === 'staff' ? m.authorLabel : 'You'}</span>
              <time dateTime={new Date(m.createdAt).toISOString()}>{new Date(m.createdAt).toLocaleString()}</time>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={send} className="space-y-3">
        <Label htmlFor="reply">{ticket.status === 'resolved' ? 'Still need help? Reply to reopen this ticket' : 'Reply'}</Label>
        <Textarea id="reply" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} required />
        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy || body.trim().length === 0} className="min-h-11">{busy ? 'Sending…' : 'Send reply'}</Button>
          {ticket.status !== 'resolved' && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void resolve({ ticketId })}>
              This is solved
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
