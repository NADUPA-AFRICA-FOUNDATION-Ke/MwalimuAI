'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { fmtTime, Loading, PageHeader, Pill, ReasonDialog, selectClass, useRun, useStaff } from '@/components/admin/common'
import { AttachmentPicker, MessageAttachments, type Uploaded } from '@/components/support/attachments'
import { PRIORITY_LABEL, STATUS_TONE, TICKET_CATEGORIES, type TicketPriority, type TicketStatus } from '@/lib/support'

const STATUS_STAFF: Record<TicketStatus, string> = { open: 'Needs reply', in_progress: 'In progress', pending_user: 'Waiting on user', resolved: 'Resolved', closed: 'Closed' }

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = id as Id<'tickets'>
  const data = useQuery(api.admin.tickets.get, { ticketId })
  const canned = useQuery(api.admin.tickets.cannedList, {})
  const { can } = useStaff()
  const reply = useMutation(api.admin.tickets.reply)
  const note = useMutation(api.admin.tickets.note)
  const setStatus = useMutation(api.admin.tickets.setStatus)
  const setPriority = useMutation(api.admin.tickets.setPriority)
  const assign = useMutation(api.admin.tickets.assignToMe)
  const uploadUrl = useMutation(api.admin.tickets.generateUploadUrl)
  const { run, ok } = useRun()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [files, setFiles] = useState<Uploaded[]>([])
  const [pickerKey, setPickerKey] = useState(0)
  const [nextStatus, setNextStatus] = useState<TicketStatus | null>(null)
  const [now] = useState(() => Date.now())

  if (data === undefined) return <Loading />
  const { ticket, learner, visitor, messages } = data
  const canReply = can('tickets.reply')
  const closed = ticket.status === 'closed'
  const overdue = ticket.dueAt !== null && ticket.dueAt < now && ticket.status !== 'resolved' && !closed

  async function send(resolve: boolean) {
    const done = await ok(
      () => (internal ? note({ ticketId, body }) : reply({ ticketId, body, resolve, ...(files.length ? { attachments: files } : {}) })),
      internal ? 'Note saved' : resolve ? 'Reply sent and ticket resolved' : 'Reply sent',
    )
    if (done) { setBody(''); setFiles([]); setPickerKey((k) => k + 1) }
  }

  return (
    <>
      <Link href="/admin/tickets" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />All tickets
      </Link>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.number} · ${TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category} · opened ${fmtTime(ticket.createdAt)}${ticket.assignedToName ? ` · assigned to ${ticket.assignedToName}` : ' · unassigned'}`}
        actions={
          <>
            <Pill tone={STATUS_TONE[ticket.status]}>{STATUS_STAFF[ticket.status]}</Pill>
            {canReply && !ticket.assignedToName && <Button size="sm" variant="outline" onClick={() => void run(() => assign({ ticketId }), 'Assigned to you')}>Assign to me</Button>}
          </>
        }
      />
      {overdue && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-destructive bg-destructive/5 p-3 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />First reply overdue: the {PRIORITY_LABEL[ticket.priority].toLowerCase()}-priority target passed at {fmtTime(ticket.dueAt!)}.
        </p>
      )}
      {canReply && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3 text-sm">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Priority</span>
            <select className={selectClass} value={ticket.priority} onChange={(e) => void run(() => setPriority({ ticketId, priority: e.target.value as TicketPriority }), 'Priority updated')}>
              {(['urgent', 'high', 'normal', 'low'] as const).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Status</span>
            <select className={selectClass} value={ticket.status} onChange={(e) => setNextStatus(e.target.value as TicketStatus)}>
              {(['open', 'in_progress', 'pending_user', 'resolved', 'closed'] as const).map((s) => <option key={s} value={s}>{STATUS_STAFF[s]}</option>)}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">Every change notifies the learner.</p>
        </div>
      )}
      {visitor && (
        <p className="mb-4 rounded-md border bg-muted/40 p-3 text-sm">
          From a visitor without an account: <b>{visitor.name}</b> ({visitor.email}). The address is as they typed it and is <b>not verified</b>. Replies appear on their private conversation page; no email is sent.
        </p>
      )}
      {learner && (
        <p className="mb-4 text-sm">
          From <Link href={`/admin/users/${learner._id}`} className="font-medium text-primary hover:underline">{learner.name || learner.email}</Link>{learner.email && learner.name ? ` (${learner.email})` : ''}. For a streak, restore it from their profile and quote <b>{ticket.number}</b> so the outcome is posted here.
        </p>
      )}
      <ol className="mb-6 space-y-3" aria-label="Conversation">
        {messages.map((m) => (
          <li key={m._id} className={`rounded-lg border p-3 text-sm ${m.internal ? 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : m.author === 'staff' ? 'bg-sky-50 dark:bg-sky-950' : 'bg-background'}`}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{m.authorLabel}{m.internal && ' · internal note (not shown to the user)'}</span>
              <span>{fmtTime(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <MessageAttachments files={m.attachments} />
          </li>
        ))}
      </ol>
      {!canReply ? (
        <p className="text-sm text-muted-foreground">Your role can read tickets but not reply.</p>
      ) : closed ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">This ticket is closed. Change its status above to reopen it if it needs another reply.</p>
      ) : (
        <section className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="staff-reply" className="text-sm font-semibold">{internal ? 'Internal note' : visitor ? 'Reply to the visitor' : 'Reply to the learner'}</label>
            {canned && canned.length > 0 && !internal && (
              <select aria-label="Insert a saved reply" className={selectClass} value="" onChange={(e) => { const c = canned.find((x) => x._id === e.target.value); if (c) setBody((b) => (b ? `${b}\n\n${c.body}` : c.body)) }}>
                <option value="">Insert saved reply…</option>
                {canned.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            )}
          </div>
          <Textarea id="staff-reply" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          {!internal && <AttachmentPicker key={pickerKey} getUploadUrl={() => uploadUrl({})} onChange={setFiles} />}
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            Internal note only (the user will not see it)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={body.trim().length < 2} onClick={() => void send(false)}>{internal ? 'Save note' : 'Send reply'}</Button>
            {!internal && <Button variant="outline" disabled={body.trim().length < 2} onClick={() => void send(true)}>Send and resolve</Button>}
          </div>
        </section>
      )}
      <ReasonDialog
        open={nextStatus !== null}
        onOpenChange={(o) => { if (!o) setNextStatus(null) }}
        title={nextStatus ? `Set status to “${STATUS_STAFF[nextStatus]}”?` : ''}
        description="The user is notified of the change. Your reason is kept in the audit log."
        confirmLabel="Change status"
        onConfirm={(reason) => ok(() => setStatus({ ticketId, status: nextStatus!, reason }), 'Status updated')}
      />
    </>
  )
}
