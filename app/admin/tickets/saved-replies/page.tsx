'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { ChevronLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Empty, Field, Loading, PageHeader, useRun, useStaff } from '@/components/admin/common'

/** Saved replies: standard answers staff insert into a ticket reply and then adjust. */
export default function SavedRepliesPage() {
  const { can } = useStaff()
  const list = useQuery(api.admin.tickets.cannedList, {})
  const save = useMutation(api.admin.tickets.cannedSave)
  const remove = useMutation(api.admin.tickets.cannedDelete)
  const { ok } = useRun()
  const [editing, setEditing] = useState<{ id?: Id<'cannedReplies'>; title: string; body: string } | null>(null)
  const editable = can('tickets.reply')

  return (
    <>
      <Link href="/admin/tickets" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" aria-hidden="true" />All tickets</Link>
      <PageHeader
        title="Saved replies"
        description="Standard answers to common questions. Insert one into a reply, then make it personal: use the person's name and the details of their ticket."
        actions={editable && !editing ? <Button size="sm" onClick={() => setEditing({ title: '', body: '' })}>New saved reply</Button> : undefined}
      />
      {editing && (
        <section className="mb-6 space-y-3 rounded-lg border bg-background p-4">
          <Field label="Title (only staff see it)"><Input value={editing.title} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
          <Field label="Reply text"><Textarea rows={6} value={editing.body} maxLength={4000} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
          <div className="flex gap-2">
            <Button disabled={editing.title.trim().length < 2 || editing.body.trim().length < 2} onClick={async () => { if (await ok(() => save({ ...(editing.id ? { id: editing.id } : {}), title: editing.title, body: editing.body }), 'Saved')) setEditing(null) }}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </section>
      )}
      {list === undefined ? <Loading /> : list.length === 0 ? (
        <Empty>No saved replies yet. Add the answers you give most often, such as how to reset a password or earn a certificate.</Empty>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c._id} className="rounded-lg border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{c.title}</span>
                {editable && (
                  <span className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing({ id: c._id, title: c.title, body: c.body })}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => void ok(() => remove({ id: c._id }), 'Deleted')}>Delete</Button>
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
