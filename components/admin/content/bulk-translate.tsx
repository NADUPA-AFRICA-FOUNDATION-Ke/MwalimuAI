'use client'

import { useState } from 'react'
import { useConvex, useMutation } from 'convex/react'
import { Loader2, Languages } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { askAi } from '@/lib/admin/ai-client'
import { translationSource } from './sw-editor'

type Row = { _id: Id<'cmsItems'>; kind: string; title: string; archived: boolean; sw: 'none' | 'partial' | 'complete' | null; draft: { status: string } | null }
const TRANSLATABLE = ['program', 'module', 'lesson', 'quiz'] as const
const LOCKED = ['in_review', 'approved']

/** One button to write Kiswahili for everything in the path that does not have it yet. Results are drafts. */
export function BulkTranslate({ items }: { items: Row[] }) {
  const convex = useConvex()
  const save = useMutation(api.admin.content.saveDraft)
  const [state, setState] = useState<{ done: number; total: number; failed: string[]; skipped: number } | null>(null)
  const [running, setRunning] = useState(false)

  const todo = items.filter((i) => !i.archived && (TRANSLATABLE as readonly string[]).includes(i.kind) && i.sw !== null && i.sw !== 'complete')
  const translatable = todo.filter((i) => !i.draft || !LOCKED.includes(i.draft.status))
  const total = items.filter((i) => !i.archived && (TRANSLATABLE as readonly string[]).includes(i.kind)).length
  const have = total - todo.length
  if (total === 0 || todo.length === 0) return total > 0 ? <p className="mb-6 text-sm text-muted-foreground">Kiswahili: every item has a translation ({have} of {total}).</p> : null

  const run = async () => {
    setRunning(true)
    const queue = [...translatable]
    const progress = { done: 0, total: queue.length, failed: [] as string[], skipped: todo.length - translatable.length }
    setState({ ...progress })
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          const detail = await convex.query(api.admin.content.getItem, { itemId: item._id })
          const data = ((detail.draft ?? detail.published)?.data ?? {}) as Record<string, any>
          const sw = await askAi('translate', { kind: item.kind as 'lesson', source: translationSource(item.kind as 'lesson', data) })
          await save({ itemId: item._id, data: { ...data, sw } })
        } catch {
          progress.failed.push(item.title)
        }
        progress.done++
        setState({ ...progress, failed: [...progress.failed] })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setRunning(false)
  }

  return (
    <section className="mb-6 rounded-lg border bg-background p-4" aria-labelledby="sw-h">
      <h2 id="sw-h" className="flex items-center gap-2 font-semibold"><Languages className="h-4 w-4 text-primary" aria-hidden="true" />Kiswahili</h2>
      <p className="mt-1 text-sm text-muted-foreground">{have} of {total} items have a Kiswahili version. Learners who choose Kiswahili see English wherever one is missing.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={running || translatable.length === 0}>
          {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Translating {state?.done ?? 0} of {state?.total ?? 0}…</> : `Translate ${translatable.length} item${translatable.length === 1 ? '' : 's'} with AI`}
        </Button>
        {todo.length > translatable.length && <span className="text-xs text-muted-foreground">{todo.length - translatable.length} are waiting for review and are skipped.</span>}
        {state && !running && <span className="text-sm" role="status">Done: {state.done - state.failed.length} translated{state.failed.length ? `, ${state.failed.length} failed (${state.failed.slice(0, 3).join(', ')})` : ''}. Read through them before you release.</span>}
      </div>
    </section>
  )
}
