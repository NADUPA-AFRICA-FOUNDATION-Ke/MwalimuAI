'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { DocSection } from '@/lib/docs-data'

const matches = (text: string, q: string) => q.split(/\s+/).every((w) => text.includes(w))

/** The guides, with a search box that filters them as you type. */
export function DocsBrowser({ sections }: { sections: DocSection[] }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () =>
      sections
        .map((s) => ({ ...s, articles: q ? s.articles.filter((a) => matches(`${s.title} ${a.title} ${a.body.join(' ')}`.toLowerCase(), q)) : s.articles }))
        .filter((s) => s.articles.length > 0),
    [sections, q],
  )
  return (
    <section className="max-w-4xl mx-auto px-4 md:px-8 pb-20">
      <label htmlFor="docs-search" className="sr-only">Search the documentation</label>
      <input
        id="docs-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the documentation…"
        className="mb-8 w-full rounded-lg border bg-background px-4 py-3 text-base"
      />
      {!q && (
        <nav aria-label="Sections" className="mb-10 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-10 items-center rounded-full border px-4 text-sm hover:bg-muted">{s.title}</a>
          ))}
        </nav>
      )}
      <p role="status" className="sr-only">{q ? `${shown.reduce((n, s) => n + s.articles.length, 0)} guides match` : ''}</p>
      {shown.length === 0 && (
        <p className="text-muted-foreground">
          Nothing matches “{query}”. Try a different word, or <Link className="text-primary underline underline-offset-4" href="/support">ask us on the Support page</Link>.
        </p>
      )}
      <div className="space-y-12">
        {shown.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
            <h2 id={`${s.id}-h`} className="text-2xl font-bold">{s.title}</h2>
            <p className="mt-1 text-muted-foreground">{s.summary}</p>
            <div className="mt-6 space-y-8">
              {s.articles.map((a) => (
                <article key={a.id} id={`${s.id}-${a.id}`} className="scroll-mt-24">
                  <h3 className="text-lg font-semibold">{a.title}</h3>
                  <div className="mt-2 space-y-3 text-muted-foreground">
                    {groupBody(a.body).map((block, i) =>
                      block.list ? (
                        <ul key={i} className="list-disc space-y-1 pl-6">
                          {block.items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      ) : (
                        <p key={i}>{block.text}</p>
                      ),
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

type Block = { list: false; text: string } | { list: true; items: string[] }
function groupBody(body: string[]): Block[] {
  const out: Block[] = []
  for (const line of body) {
    if (line.startsWith('- ')) {
      const last = out[out.length - 1]
      if (last?.list) last.items.push(line.slice(2))
      else out.push({ list: true, items: [line.slice(2)] })
    } else out.push({ list: false, text: line })
  }
  return out
}
