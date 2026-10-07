'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentPicker, MessageAttachments, type Uploaded } from '@/components/support/attachments'
import { STATUS_LABEL, TICKET_CATEGORIES, errorMessage } from '@/lib/support'

const when = (ms: number) => new Date(ms).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' })

const EXPLAIN: Record<string, string> = {
  open: 'We have your ticket and will reply here.',
  in_progress: 'Someone from our team is working on it.',
  pending_user: 'We replied and need something from you. Reply below.',
  resolved: 'Our team marked this resolved. Reply below if you still need help, and it reopens.',
  closed: 'This ticket is closed. If you need more help, open a new ticket and mention this number.',
}

export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = id as Id<'tickets'>
  const data = useQuery(api.tickets.getMine, { ticketId })
  const reply = useMutation(api.tickets.reply)
  const uploadUrl = useMutation(api.tickets.generateUploadUrl)
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<Uploaded[]>([])
  const [pickerKey, setPickerKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (data === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading the ticket…</p>
  const { ticket, messages } = data
  const closed = ticket.status === 'closed'

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await reply({ ticketId, body, ...(files.length ? { attachments: files } : {}) })
      setBody('')
      setFiles([])
      setPickerKey((k) => k + 1)
    } catch (err) {
      setError(errorMessage(err, 'Your reply was not sent. Check your connection and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/support" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All tickets</Link>
      <header className="rounded-2xl border bg-card p-4">
        <p className="font-mono text-xs text-muted-foreground">{ticket.number}</p>
        <h1 className="mt-1 text-xl font-bold">{ticket.subject}</h1>
        <p className="mt-2 text-sm"><b>{STATUS_LABEL[ticket.status]}.</b> <span className="text-muted-foreground">{EXPLAIN[ticket.status]}</span></p>
        <p className="mt-1 text-xs text-muted-foreground">{TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category} · opened {when(ticket.createdAt)}</p>
      </header>

      <ol className="space-y-3" aria-label="Conversation">
        {messages.map((m) => (
          <li key={m._id} className={`max-w-[92%] rounded-2xl border p-4 ${m.author === 'staff' ? 'bg-secondary' : 'ml-auto bg-card'}`}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{m.author === 'staff' ? m.authorLabel : 'You'}</span>
              <time dateTime={new Date(m.createdAt).toISOString()}>{when(m.createdAt)}</time>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
            <MessageAttachments files={m.attachments} />
          </li>
        ))}
      </ol>

      {closed ? (
        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          This ticket is closed, so it can’t take new replies. <Link href="/dashboard/support" className="text-primary underline underline-offset-4">Open a new ticket</Link> and mention {ticket.number}.
        </div>
      ) : (
        <form onSubmit={send} className="space-y-3 rounded-2xl border bg-card p-4">
          <Label htmlFor="reply">{ticket.status === 'resolved' ? 'Still need help? Reply to reopen this ticket' : 'Reply'}</Label>
          <Textarea id="reply" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} required />
          <AttachmentPicker key={pickerKey} getUploadUrl={() => uploadUrl({})} onChange={setFiles} disabled={busy} />
          {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || body.trim().length === 0} className="min-h-11">{busy ? 'Sending…' : 'Send reply'}</Button>
          </div>
        </form>
      )}
    </div>
  )
}
