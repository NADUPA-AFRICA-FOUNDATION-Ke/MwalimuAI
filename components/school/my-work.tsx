'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { ChevronRight, ClipboardCheck } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { StatusPill } from '@/components/school/status-pill'
import { KIND_LABEL, eat } from '@/lib/school'

/** A teacher's assigned professional-development work, soonest deadline first. */
export function MyWork() {
  const work = useQuery(api.schoolPortal.myWork, {})
  if (work === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading your work…</p>
  if (work.length === 0)
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        <ClipboardCheck className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
        Nothing assigned to you yet. Work your school leadership sets for you appears here.
      </div>
    )
  const open = work.filter((w) => w.status === 'not_started' || w.status === 'in_progress' || w.status === 'returned')
  const done = work.filter((w) => !open.includes(w))
  return (
    <div className="space-y-6">
      {[{ title: 'To do', rows: open }, { title: 'Done and past', rows: done }].map((g) => g.rows.length > 0 && (
        <section key={g.title} aria-label={g.title}>
          <h3 className="mb-2 font-semibold">{g.title} ({g.rows.length})</h3>
          <ul className="divide-y rounded-2xl border bg-card">
            {g.rows.map((w) => (
              <li key={w.targetId}>
                <Link href={`/dashboard/school/work/${w.targetId}`} className="flex min-h-14 items-center justify-between gap-3 p-4 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{w.title}{w.mandatory && <span className="ml-2 text-xs font-normal text-destructive">Mandatory</span>}</p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABEL[w.kind]} · {w.skillArea} · due {eat(w.dueAt)}
                      {w.progress && w.progress.total > 0 ? ` · ${w.progress.done}/${w.progress.total} lessons` : ''}
                      {w.score !== null ? ` · score ${w.score}%` : ''}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2"><StatusPill status={w.status} /><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
