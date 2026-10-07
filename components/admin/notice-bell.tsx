'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { Bell } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { fmtTime, useStaff } from '@/components/admin/common'
import { useAttention } from '@/lib/attention'

/** Support alerts for staff: a bell that pulses with the number of new messages, pop-ups as they arrive, and the count in the tab title. */
export function NoticeBell() {
  const { can } = useStaff()
  const allowed = can('tickets.read')
  const data = useQuery(api.admin.notices.mine, allowed ? {} : 'skip')
  const markAllRead = useMutation(api.admin.notices.markAllRead)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useAttention({ unread: data?.unread ?? 0, items: data?.items.filter((i) => i.unread).map((i) => ({ id: i._id, title: i.title, body: i.body, link: i.link })), onOpen: (l) => router.push(l) })

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  if (!allowed) return null
  const unread = data?.unread ?? 0
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Support alerts${unread ? `, ${unread} new` : ''}`}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border bg-background hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${unread ? 'border-destructive text-destructive' : ''}`}
      >
        <Bell className={`h-5 w-5 ${unread ? 'animate-[wiggle_1s_ease-in-out_3]' : ''}`} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60 motion-reduce:hidden" aria-hidden="true" />
            <span className="relative">{unread > 99 ? '99+' : unread}</span>
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Support alerts" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">Support alerts</span>
            {unread > 0 && <button type="button" className="text-xs text-primary underline underline-offset-4" onClick={() => void markAllRead({})}>Mark all read</button>}
          </div>
          {data === undefined ? (
            <p role="status" className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : data.items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No support activity yet.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-auto">
              {data.items.map((i) => (
                <li key={i._id}>
                  <Link href={i.link} onClick={() => { setOpen(false); void markAllRead({}) }} className={`block px-4 py-3 text-sm hover:bg-muted ${i.unread ? 'bg-destructive/5' : ''}`}>
                    <span className="flex items-start gap-2">
                      {i.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destructive" aria-label="New" />}
                      <span className="min-w-0">
                        <span className={`block ${i.unread ? 'font-semibold' : ''}`}>{i.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{i.body}</span>
                        <span className="block text-xs text-muted-foreground">{fmtTime(i.createdAt)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/tickets" onClick={() => setOpen(false)} className="block border-t px-4 py-3 text-center text-sm text-primary hover:bg-muted">Open the ticket queue</Link>
        </div>
      )}
    </div>
  )
}
