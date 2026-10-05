'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { Check, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, selectClass, errorMessage } from '@/components/admin/common'
import { askAi, type Outline } from '@/lib/admin/ai-client'
import { LEVELS } from '@/lib/admin-ai'

type Phase = 'brief' | 'outline' | 'writing'
type Status = 'queued' | 'writing' | 'done' | 'failed'
type Job = { itemId: Id<'cmsItems'>; module: string; title: string; objective: string; orderIndex: number; status: Status; error?: string }

const CONCURRENCY = 3
const emptyTags = { cbcLevels: [], subjects: [], counties: [] }

/** From a one-paragraph brief to a drafted learning path: outline, lessons, quizzes. Everything stays a draft for review. */
export function AiPathWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const createFromOutline = useMutation(api.admin.contentBuilder.createProgramFromOutline)
  const saveDraft = useMutation(api.admin.content.saveDraft)
  const [phase, setPhase] = useState<Phase>('brief')
  const [form, setForm] = useState({ topic: '', audience: LEVELS[2] as string, outcomes: '', notes: '', modules: 3, lessons: 3 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outline, setOutline] = useState<Outline | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [quizState, setQuizState] = useState<{ pre: Status; post: Status }>({ pre: 'queued', post: 'queued' })
  const [programKey, setProgramKey] = useState<string | null>(null)
  const ctx = useRef<{ outline: Outline; readings: Map<string, string>; preId: Id<'cmsItems'> | null; postId: Id<'cmsItems'> | null; audience: string }>(null as never)

  const draftOutline = async () => {
    setError(null)
    setBusy(true)
    try {
      setOutline(await askAi('path_outline', { topic: form.topic, audience: form.audience, outcomes: form.outcomes, notes: form.notes, modules: form.modules, lessonsPerModule: form.lessons }))
      setPhase('outline')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const patchJob = (id: Id<'cmsItems'>, patch: Partial<Job>) => setJobs((all) => all.map((j) => (j.itemId === id ? { ...j, ...patch } : j)))

  async function writeLesson(job: Job) {
    const c = ctx.current
    patchJob(job.itemId, { status: 'writing', error: undefined })
    try {
      const outlineText = c.outline.modules.map((m) => `${m.title}: ${m.lessons.map((l) => l.title).join('; ')}`).join('\n')
      const draft = await askAi('lesson', { path: c.outline.title, module: job.module, title: job.title, objective: job.objective, audience: c.audience, outline: outlineText })
      await saveDraft({
        itemId: job.itemId,
        data: { title: job.title, ...draft, orderIndex: job.orderIndex, tags: emptyTags },
      })
      c.readings.set(job.itemId, `# ${job.title}\n${draft.reading}`)
      patchJob(job.itemId, { status: 'done' })
    } catch (e) {
      patchJob(job.itemId, { status: 'failed', error: e instanceof Error ? e.message : errorMessage(e) })
    }
  }

  async function writeQuiz(kind: 'pre' | 'post') {
    const c = ctx.current
    const itemId = kind === 'pre' ? c.preId : c.postId
    if (!itemId) return
    setQuizState((s) => ({ ...s, [kind]: 'writing' }))
    try {
      const material = kind === 'pre' ? `Outcomes: ${c.outline.outcomes.join('; ')}\nTopics: ${c.outline.modules.map((m) => m.title).join('; ')}` : [...c.readings.values()].join('\n\n')
      const quiz = await askAi('quiz', { path: c.outline.title, kind, count: kind === 'pre' ? 5 : 10, difficulty: 'mixed', context: material || c.outline.description })
      await saveDraft({
        itemId,
        data: { kind, orderIndex: kind === 'pre' ? 0 : 1, tags: emptyTags, questions: quiz.questions.map((q, i) => ({ id: `q${i + 1}`, ...q })) },
      })
      setQuizState((s) => ({ ...s, [kind]: 'done' }))
    } catch {
      setQuizState((s) => ({ ...s, [kind]: 'failed' }))
    }
  }

  const start = async () => {
    if (!outline) return
    setError(null)
    setBusy(true)
    try {
      const created = await createFromOutline({ outline, includeQuizzes: true })
      setProgramKey(created.programKey)
      const list: Job[] = created.lessons.map((l) => ({ ...l, status: 'queued' as Status }))
      setJobs(list)
      ctx.current = { outline, readings: new Map(), preId: created.preId, postId: created.postId, audience: form.audience }
      setPhase('writing')
      setBusy(false)
      // A small pool, so a 12-lesson path finishes in a couple of minutes without hammering the model.
      const queue = [...list]
      await Promise.all(Array.from({ length: CONCURRENCY }, async () => { for (let j = queue.shift(); j; j = queue.shift()) await writeLesson(j) }))
      await Promise.all([writeQuiz('pre'), writeQuiz('post')])
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  const finished = phase === 'writing' && jobs.every((j) => j.status === 'done' || j.status === 'failed') && quizState.pre !== 'queued' && quizState.pre !== 'writing' && quizState.post !== 'queued' && quizState.post !== 'writing'
  const doneCount = jobs.filter((j) => j.status === 'done').length

  return (
    <section className="mb-8 rounded-lg border-2 border-primary/40 bg-background p-4" aria-labelledby="ai-wizard-h">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="ai-wizard-h" className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />Create a learning path with AI</h2>
          <p className="text-sm text-muted-foreground">Describe the path in a few lines. The assistant drafts the outline, every lesson and both assessments. You review and edit before anything is released.</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose} disabled={phase === 'writing' && !finished}><X className="h-4 w-4" /></Button>
      </div>

      {phase === 'brief' && (
        <div className="mt-4 space-y-4">
          <Field label="What is it about?" hint="One or two sentences. e.g. “Teaching mixed-ability classes of 60+ learners in Grades 4–6”.">
            <Textarea rows={2} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Who is it for?">
              <select className={selectClass} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Modules"><Input type="number" min={1} max={8} value={form.modules} onChange={(e) => setForm({ ...form, modules: Math.min(8, Math.max(1, Math.floor(Number(e.target.value) || 1))) })} /></Field>
            <Field label="Lessons per module"><Input type="number" min={1} max={6} value={form.lessons} onChange={(e) => setForm({ ...form, lessons: Math.min(6, Math.max(1, Math.floor(Number(e.target.value) || 1))) })} /></Field>
          </div>
          <Field label="What should teachers be able to do afterwards? (optional)">
            <Textarea rows={2} value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} />
          </Field>
          <Field label="Anything else the assistant should know? (optional)" hint="Constraints, your own notes, sources you trust.">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <Button disabled={busy || form.topic.trim().length < 8} onClick={draftOutline}>
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Drafting the outline…</> : 'Draft the outline'}
          </Button>
        </div>
      )}

      {phase === 'outline' && outline && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">Check the outline. Rename or remove anything now; the lessons are written from these titles.</p>
          <Field label="Path title"><Input value={outline.title} onChange={(e) => setOutline({ ...outline, title: e.target.value })} /></Field>
          <ol className="space-y-3">
            {outline.modules.map((m, mi) => (
              <li key={mi} className="rounded-md border p-3">
                <Input aria-label={`Module ${mi + 1} title`} className="mb-2 font-medium" value={m.title} onChange={(e) => setOutline({ ...outline, modules: outline.modules.map((x, i) => (i === mi ? { ...x, title: e.target.value } : x)) })} />
                <ul className="space-y-1">
                  {m.lessons.map((l, li) => (
                    <li key={li} className="flex items-center gap-2">
                      <Input aria-label={`Lesson ${mi + 1}.${li + 1} title`} value={l.title} onChange={(e) => setOutline({ ...outline, modules: outline.modules.map((x, i) => (i === mi ? { ...x, lessons: x.lessons.map((y, k) => (k === li ? { ...y, title: e.target.value } : y)) } : x)) })} />
                      <Button size="icon" variant="ghost" aria-label={`Remove lesson ${mi + 1}.${li + 1}`} disabled={m.lessons.length === 1} onClick={() => setOutline({ ...outline, modules: outline.modules.map((x, i) => (i === mi ? { ...x, lessons: x.lessons.filter((_, k) => k !== li) } : x)) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={start}>{busy ? 'Creating…' : `Create the path and write ${outline.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons`}</Button>
            <Button variant="outline" disabled={busy} onClick={() => setPhase('brief')}>Back</Button>
            <Button variant="ghost" disabled={busy} onClick={draftOutline}>Draft a different outline</Button>
          </div>
        </div>
      )}

      {phase === 'writing' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm" role="status" aria-live="polite">
            {finished ? `Done. ${doneCount} of ${jobs.length} lessons written.` : `Writing… ${doneCount} of ${jobs.length} lessons done. Keep this page open.`}
          </p>
          <ul className="divide-y rounded-md border text-sm">
            {jobs.map((j) => (
              <li key={j.itemId} className="flex items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate">{j.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {j.status === 'writing' && <Loader2 className="h-4 w-4 animate-spin" aria-label="Writing" />}
                  {j.status === 'done' && <Check className="h-4 w-4 text-green-700" aria-label="Done" />}
                  {j.status === 'failed' && <Button size="sm" variant="outline" onClick={() => void writeLesson(j)}>Try again</Button>}
                  {j.status === 'queued' && <span className="text-xs text-muted-foreground">waiting</span>}
                </span>
              </li>
            ))}
            {(['pre', 'post'] as const).map((k) => (
              <li key={k} className="flex items-center justify-between gap-2 p-2">
                <span>{k === 'pre' ? 'Pre-assessment' : 'Post-assessment'}</span>
                <span className="flex items-center gap-2">
                  {quizState[k] === 'writing' && <Loader2 className="h-4 w-4 animate-spin" aria-label="Writing" />}
                  {quizState[k] === 'done' && <Check className="h-4 w-4 text-green-700" aria-label="Done" />}
                  {quizState[k] === 'failed' && <Button size="sm" variant="outline" onClick={() => void writeQuiz(k)}>Try again</Button>}
                  {quizState[k] === 'queued' && <span className="text-xs text-muted-foreground">after the lessons</span>}
                </span>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {finished && programKey && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => router.push(`/admin/content/${programKey}`)}>Open the path to review it</Button>
              <span className="text-sm text-muted-foreground">Read each lesson before you submit it. The AI can be wrong.</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
