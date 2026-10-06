'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { fmtTime, Loading, PageHeader, Pill, ReasonDialog, useRun, useStaff } from '@/components/admin/common'

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = id as Id<'tickets'>
  const data = useQuery(api.admin.tickets.get, { ticketId })
  const { can } = useStaff()
  const reply = useMutation(api.admin.tickets.reply)
  const note = useMutation(api.admin.tickets.note)
  const setStatus = useMutation(api.admin.tickets.setStatus)
  const assign = useMutation(api.admin.tickets.assignToMe)
  const { run, ok } = useRun()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [reopen, setReopen] = useState(false)

  if (data === undefined) return <Loading />
  const { ticket, learner, visitor, messages } = data
  const canReply = can('tickets.reply')

  async function send(resolve: boolean) {
    const done = await ok(
      () => (internal ? note({ ticketId, body }) : reply({ ticketId, body, resolve })),
      internal ? 'Note saved' : resolve ? 'Reply sent and ticket resolved' : 'Reply sent',
    )
    if (done) setBody('')
  }

  return (
    <>
      <Link href="/admin/tickets" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        All tickets
      </Link>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.number} · ${ticket.category} · opened ${fmtTime(ticket.createdAt)}${ticket.assignedToName ? ` · assigned to ${ticket.assignedToName}` : ''}`}
        actions={
          <>
            <Pill tone={ticket.status === 'resolved' ? 'green' : ticket.status === 'open' ? 'amber' : 'blue'}>
              {ticket.status === 'open' ? 'Needs reply' : ticket.status === 'pending_user' ? 'Waiting on learner' : 'Resolved'}
            </Pill>
            {canReply && !ticket.assignedToName && (
              <Button size="sm" variant="outline" onClick={() => void run(() => assign({ ticketId }), 'Assigned to you')}>Assign to me</Button>
            )}
            {canReply && ticket.status === 'resolved' && (
              <Button size="sm" variant="outline" onClick={() => setReopen(true)}>Reopen</Button>
            )}
          </>
        }
      />
      {visitor && (
        <p className="mb-4 rounded-md border bg-muted/40 p-3 text-sm">
          From a visitor without an account: <b>{visitor.name}</b> ({visitor.email}). The address is as they typed it and is <b>not verified</b>. Replies appear on their private conversation page; no email is sent. If they sign in with Google using this address, or add the conversation to their account, it moves to their inbox.
        </p>
      )}
      {learner && (
        <p className="mb-4 text-sm">
          From{' '}
          <Link href={`/admin/users/${learner._id}`} className="font-medium text-primary hover:underline">
            {learner.name || learner.email}
          </Link>{' '}
          ({learner.email}) — open their profile to restore a streak, then quote <b>{ticket.number}</b> as the reference so the outcome is posted on this ticket.
        </p>
      )}
      <ol className="mb-6 space-y-3" aria-label="Conversation">
        {messages.map((m) => (
          <li
            key={m._id}
            className={`rounded-lg border p-3 text-sm ${m.internal ? 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : m.author === 'staff' ? 'bg-sky-50 dark:bg-sky-950' : 'bg-background'}`}
          >
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {m.authorLabel}
                {m.internal && ' · internal note (learner cannot see this)'}
              </span>
              <span>{fmtTime(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ol>
      {canReply ? (
        <section className="space-y-3 rounded-lg border bg-background p-4">
          <label htmlFor="staff-reply" className="text-sm font-semibold">{internal ? 'Internal note' : 'Reply to the learner'}</label>
          <Textarea id="staff-reply" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            Internal note only (the learner will not see it)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={body.trim().length < 2} onClick={() => void send(false)}>{internal ? 'Save note' : 'Send reply'}</Button>
            {!internal && (
              <Button variant="outline" disabled={body.trim().length < 2} onClick={() => void send(true)}>Send and resolve</Button>
            )}
            {!internal && ticket.status !== 'resolved' && (
              <ResolveWithoutReply onConfirm={(reason) => ok(() => setStatus({ ticketId, status: 'resolved', reason }), 'Ticket resolved')} />
            )}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Your role can read tickets but not reply.</p>
      )}
      <ReasonDialog
        open={reopen}
        onOpenChange={setReopen}
        title="Reopen this ticket?"
        description="It returns to the queue as needing a reply."
        confirmLabel="Reopen"
        onConfirm={(reason) => ok(() => setStatus({ ticketId, status: 'open', reason }), 'Ticket reopened')}
      />
    </>
  )
}

function ResolveWithoutReply({ onConfirm }: { onConfirm: (reason: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>Resolve without replying</Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Resolve without a reply?"
        description="The learner is notified that the ticket was resolved."
        confirmLabel="Resolve"
        onConfirm={onConfirm}
      />
    </>
  )
}
