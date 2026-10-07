'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

type Item = { id: string; title: string; body?: string; link?: string }

/**
 * Makes new activity hard to miss: a pop-up for each item that arrives while the page is open (with an Open button),
 * and the unread count in the browser tab title, e.g. "(3) Mwalimu AI", so it shows even from another tab.
 * Items already there when the page loads do not pop up; only new ones do.
 */
export function useAttention({ unread, items, onOpen }: { unread: number; items: Item[] | undefined; onOpen: (link: string) => void }) {
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!items) return
    if (seen.current === null) {
      seen.current = new Set(items.map((i) => i.id))
      return
    }
    for (const i of items) {
      if (seen.current.has(i.id)) continue
      seen.current.add(i.id)
      toast(i.title, {
        description: i.body,
        duration: 10_000,
        ...(i.link ? { action: { label: 'Open', onClick: () => onOpen(i.link!) } } : {}),
      })
    }
  }, [items, onOpen])

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, '')
    document.title = unread > 0 ? `(${unread > 99 ? '99+' : unread}) ${base}` : base
    return () => { document.title = document.title.replace(/^\(\d+\+?\) /, '') }
  }, [unread])
}
