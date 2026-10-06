'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { completeLesson, getProgress } from '@/lib/learning-progress'
import { listOffline, type OfflineLesson, type OfflineProgram } from '@/lib/offline-lessons'

type View = { kind: 'list' } | { kind: 'program'; p: OfflineProgram } | { kind: 'lesson'; p: OfflineProgram; moduleId: string; l: OfflineLesson }

export function OfflineReader() {
  const [programs, setPrograms] = useState<OfflineProgram[] | null>(null)
  const [view, setView] = useState<View>({ kind: 'list' })
  const [online, setOnline] = useState(true)
  const [, bump] = useState(0)
  useEffect(() => {
    listOffline().then(setPrograms).catch(() => setPrograms([]))
    const up = () => setOnline(true), down = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-4 py-[max(16px,env(safe-area-inset-top))] pb-24">
      <header className="mb-4 flex items-center gap-2">
        {view.kind !== 'list' ? (
          <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setView(view.kind === 'lesson' ? { kind: 'program', p: view.p } : { kind: 'list' })}><ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />Back</Button>
        ) : (
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Dashboard</Link>
        )}
        {!online && <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground" role="status"><WifiOff className="h-3.5 w-3.5" aria-hidden="true" />Offline</span>}
      </header>

      {programs === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {programs && view.kind === 'list' && (
        <>
          <h1 className="text-2xl font-bold">My downloaded lessons</h1>
          {programs.length === 0 ? (
            <p className="mt-3 text-muted-foreground">Nothing is saved on this phone yet. Open a learning path while you have data and choose “Save for offline”.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {programs.map((p) => (
                <li key={p.id}><button type="button" className="w-full rounded-2xl border p-4 text-left hover:bg-muted/50 min-h-14" onClick={() => setView({ kind: 'program', p })}><span className="block font-semibold">{p.title}</span><span className="text-sm text-muted-foreground">{p.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons</span></button></li>
              ))}
            </ul>
          )}
        </>
      )}

      {view.kind === 'program' && (
        <>
          <h1 className="text-2xl font-bold">{view.p.title}</h1>
          {view.p.modules.map((m) => (
            <section key={m.id} className="mt-5" aria-label={m.title}>
              <h2 className="mb-2 font-semibold">{m.title}</h2>
              <ul className="space-y-2">
                {m.lessons.map((l) => {
                  const done = getProgress(view.p.id).completedLessons.includes(`${m.id}/${l.id}`)
                  return (
                    <li key={l.id}><button type="button" className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border p-3 text-left hover:bg-muted/50" onClick={() => setView({ kind: 'lesson', p: view.p, moduleId: m.id, l })}><span>{l.title}<span className="block text-xs text-muted-foreground">{l.duration}</span></span>{done && <Check className="h-4 w-4 text-green-700" aria-label="Completed" />}</button></li>
                  )
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      {view.kind === 'lesson' && (
        <article>
          <h1 className="mb-1 text-2xl font-bold">{view.l.title}</h1>
          <p className="mb-4 text-sm text-muted-foreground">{view.p.title} · {view.l.duration}</p>
          <MarkdownRenderer content={view.l.reading} article />
          {view.l.reflectionPrompt && <p className="mt-6 rounded-xl border bg-muted/40 p-4 text-sm"><b>Think about it:</b> {view.l.reflectionPrompt}</p>}
          <div className="mt-6">
            {getProgress(view.p.id).completedLessons.includes(`${view.moduleId}/${view.l.id}`) ? (
              <p className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-green-700"><Check className="h-4 w-4" aria-hidden="true" />Completed</p>
            ) : (
              <Button className="min-h-11" onClick={() => { completeLesson(view.p.id, view.moduleId, view.l.id); bump((n) => n + 1) }}>Mark as complete</Button>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Your progress is kept on this phone and sent to your account as soon as you are online.</p>
          </div>
        </article>
      )}
    </main>
  )
}
