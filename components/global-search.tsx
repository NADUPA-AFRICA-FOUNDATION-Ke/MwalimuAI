'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { BookOpen, ClipboardCheck, Clock, FileQuestion, LayoutGrid, LifeBuoy, MessagesSquare, NotebookPen, Search } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/convex/_generated/api'
import { fuzzyScore } from '@/convex/lib/fuzzy'
import { usePrograms } from '@/context/content-context'
import { useProfile } from '@/context/profile-context'
import { DOCS } from '@/lib/docs-data'
import { getT } from '@/lib/i18n'
import { MORE_ROUTES, TAB_ROUTES } from '@/lib/nav'

export const OPEN_SEARCH_EVENT = 'mwalimu:open-search'
const RECENT_KEY = 'mwalimu:recent-searches'
type Hit = { id: string; title: string; detail?: string; href: string }

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]').slice(0, 6) } catch { return [] }
}
function saveRecent(q: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 6))) } catch { /* private mode */ }
}
function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id) }, [value, ms])
  return v
}
const rank = <T,>(items: T[], score: (x: T) => number, n = 6) => items.map((x) => ({ x, s: score(x) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map((r) => r.x)

/** Ctrl/Cmd+K search across pages, learning, help, and (from the server, permission-checked) your own content. */
export function GlobalSearch() {
  const router = useRouter()
  const { lang } = useProfile()
  const t = getT(lang)
  const { programs } = usePrograms()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const dq = useDebounced(q, 200)
  const server = useQuery(api.search.global, open && dq.trim().length >= 2 ? { q: dq } : 'skip')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) } }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_SEARCH_EVENT, onOpen) }
  }, [])

  const local = useMemo(() => {
    const query = dq.trim()
    if (query.length < 2) return null
    const pages: Hit[] = rank([...TAB_ROUTES, ...MORE_ROUTES].filter((r, i, all) => all.findIndex((x) => x.href === r.href) === i), (r) => fuzzyScore(query, t(r.labelKey)))
      .map((r) => ({ id: r.href, title: t(r.labelKey), href: r.href }))
    const lessons: (Hit & { s: number })[] = []
    for (const p of programs) {
      lessons.push({ id: p.id, title: p.title, detail: 'Learning path', href: `/dashboard/learning/${p.id}`, s: fuzzyScore(query, p.title) * 2 + fuzzyScore(query, p.description) })
      for (const m of p.modules) for (const l of m.lessons)
        lessons.push({ id: `${p.id}/${m.id}/${l.id}`, title: l.title, detail: `${p.shortTitle ?? p.title} · ${m.title}`, href: `/dashboard/learning/${p.id}/${m.id}/${l.id}`, s: fuzzyScore(query, l.title) * 2 + fuzzyScore(query, m.title) })
    }
    const help: Hit[] = rank(DOCS.flatMap((d) => d.articles.map((a) => ({ d, a }))), ({ a }) => fuzzyScore(query, a.title) * 2 + fuzzyScore(query, a.body.join(' ')))
      .map(({ d, a }) => ({ id: `${d.id}/${a.id}`, title: a.title, detail: `Help · ${d.title}`, href: `/docs#${d.id}` }))
    return { pages, learning: rank(lessons, (l) => l.s), help }
  }, [dq, programs, t])

  const go = (href: string) => {
    if (q.trim().length >= 2) saveRecent(q.trim())
    setOpen(false)
    setQ('')
    router.push(href)
  }

  const groups: { label: string; icon: typeof Search; hits: Hit[] }[] = local ? [
    { label: 'Pages', icon: LayoutGrid, hits: local.pages },
    { label: 'Learning', icon: BookOpen, hits: local.learning },
    { label: 'My school work', icon: ClipboardCheck, hits: server?.work ?? [] },
    { label: 'Community', icon: MessagesSquare, hits: server?.community ?? [] },
    { label: 'My journal', icon: NotebookPen, hits: server?.journal ?? [] },
    { label: 'My support tickets', icon: LifeBuoy, hits: server?.tickets ?? [] },
    { label: 'Help', icon: FileQuestion, hits: local.help },
  ] : []
  const any = groups.some((g) => g.hits.length)

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setRecent(readRecent()) }}>
      <DialogContent className="top-[10%] max-h-[80vh] translate-y-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Search pages, lessons, help, community and your own work. Use the arrow keys and Enter.</DialogDescription>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:min-h-11">
          <CommandInput value={q} onValueChange={setQ} placeholder="Search lessons, help, posts, your work…" aria-label="Search" />
          <CommandList className="max-h-[60vh]">
            {!local && recent.length > 0 && (
              <CommandGroup heading="Recent searches">
                {recent.map((r) => <CommandItem key={r} value={`recent-${r}`} onSelect={() => setQ(r)}><Clock className="h-4 w-4" aria-hidden="true" />{r}</CommandItem>)}
              </CommandGroup>
            )}
            {!local && recent.length === 0 && <p className="p-4 text-sm text-muted-foreground">Type at least two letters. Small spelling mistakes are fine.</p>}
            {local && !any && (server !== undefined ? <CommandEmpty>No results for “{dq}”. Try a different word.</CommandEmpty> : <p role="status" className="p-4 text-sm text-muted-foreground">Searching…</p>)}
            {groups.filter((g) => g.hits.length).map((g) => (
              <CommandGroup key={g.label} heading={g.label}>
                {g.hits.map((h) => (
                  <CommandItem key={`${g.label}-${h.id}`} value={`${g.label}-${h.id}`} onSelect={() => go(h.href)}>
                    <g.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0"><span className="block truncate">{h.title}</span>{h.detail && <span className="block truncate text-xs text-muted-foreground">{h.detail}</span>}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
          <p className="hidden border-t px-3 py-2 text-xs text-muted-foreground sm:block">↑↓ to move · Enter to open · Esc to close · Ctrl/⌘ K to toggle</p>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/** The header button that opens search (the only way in on phones). */
export function SearchButton() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))} aria-label="Search (Ctrl or Command + K)" aria-keyshortcuts="Control+K Meta+K"
      className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-muted-foreground hover:bg-secondary hover:text-foreground md:border md:px-3">
      <Search className="h-5 w-5" aria-hidden="true" />
      <span className="hidden text-sm md:inline">Search</span>
      <kbd className="hidden rounded border px-1.5 text-[11px] lg:inline">Ctrl K</kbd>
    </button>
  )
}
