'use client'

import { useState } from 'react'
import { useConvex } from 'convex/react'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { selectClass } from '@/components/admin/common'
import { askAi, type LessonDraft, type QuizDraft, type ReviewResult } from '@/lib/admin/ai-client'
import type { ImproveAction } from '@/lib/admin-ai'
import type { Data } from './forms'

const IMPROVE: { value: ImproveAction; label: string }[] = [
  { value: 'simplify', label: 'Make it simpler' },
  { value: 'shorten', label: 'Make it shorter' },
  { value: 'expand', label: 'Add more detail' },
  { value: 'examples', label: 'Add Kenyan classroom examples' },
  { value: 'cbc', label: 'Strengthen CBC alignment' },
  { value: 'proofread', label: 'Fix spelling and grammar' },
  { value: 'kiswahili', label: 'Translate to Kiswahili' },
]

function Box({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'suggest' }) {
  return (
    <div className={`mb-4 rounded-lg border p-3 ${tone === 'suggest' ? 'border-primary/50 bg-secondary' : 'bg-background'}`}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />AI assistant</p>
      {children}
    </div>
  )
}

const useAi = () => {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async <T,>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(label)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      return undefined
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, run }
}

const Spin = () => <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />

/** Review result list, shared by lessons and quizzes. */
function Review({ result }: { result: ReviewResult }) {
  const tone = { high: 'text-red-700', medium: 'text-amber-700', low: 'text-muted-foreground' } as const
  return (
    <div className="mt-3 space-y-2 text-sm" aria-live="polite">
      <p><b>Score {Math.round(result.score)}/100.</b> {result.summary}</p>
      {result.issues.length === 0 ? (
        <p className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-700" aria-hidden="true" />No problems found.</p>
      ) : (
        <ul className="space-y-2">
          {result.issues.map((i, n) => (
            <li key={n}>
              <span className={`font-medium uppercase ${tone[i.severity]}`}>{i.severity}</span> {i.text}
              {i.fix && <span className="block text-muted-foreground">Fix: {i.fix}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">The assistant can be wrong. Use your judgement.</p>
    </div>
  )
}

export function LessonAssist({ data, set, path, module, disabled }: { data: Data; set: (p: Data) => void; path: string; module: string; disabled: boolean }) {
  const { busy, error, run } = useAi()
  const [draft, setDraft] = useState<LessonDraft | null>(null)
  const [improved, setImproved] = useState<{ action: string; text: string } | null>(null)
  const [action, setAction] = useState<ImproveAction>('simplify')
  const [review, setReview] = useState<ReviewResult | null>(null)
  const empty = !data.reading || /Write the lesson here/.test(data.reading)

  return (
    <Box>
      <p className="mb-3 text-sm text-muted-foreground">
        {empty ? 'Start from the title: the assistant writes a full lesson you can edit.' : 'Write a fresh version from your notes, polish what you have, or get an editor’s check.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={disabled || busy !== null || !data.title} onClick={async () => {
          const r = await run('write', () => askAi('lesson', { path, module, title: data.title, existing: empty ? undefined : data.reading }))
          if (r) setDraft(r)
        }}>
          {busy === 'write' ? <><Spin />Writing…</> : empty ? 'Write this lesson' : 'Rewrite from my text'}
        </Button>
        {!empty && (
          <>
            <select aria-label="Improvement" className={`${selectClass} w-auto`} value={action} onChange={(e) => setAction(e.target.value as ImproveAction)} disabled={disabled}>
              {IMPROVE.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            <Button type="button" size="sm" variant="outline" disabled={disabled || busy !== null} onClick={async () => {
              const r = await run('improve', () => askAi('improve', { action, text: data.reading }))
              if (r) setImproved({ action, text: r.text })
            }}>
              {busy === 'improve' ? <><Spin />Working…</> : 'Apply to the reading'}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={async () => {
              const r = await run('review', () => askAi('review', { kind: 'lesson', content: `${data.title}\n\n${data.reading}\n\nReflection: ${data.reflectionPrompt ?? ''}` }))
              if (r) setReview(r)
            }}>
              {busy === 'review' ? <><Spin />Checking…</> : 'Check this lesson'}
            </Button>
          </>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      {review && <Review result={review} />}
      {draft && (
        <div className="mt-3 rounded-md border border-primary/50 bg-background p-3">
          <p className="text-sm font-medium">New draft ready ({draft.reading.split(/\s+/).length} words)</p>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">{draft.reading.slice(0, 1500)}{draft.reading.length > 1500 ? '\n…' : ''}</pre>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={() => { set({ ...draft }); setDraft(null) }}>Use this draft</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </div>
      )}
      {improved && (
        <div className="mt-3 rounded-md border border-primary/50 bg-background p-3">
          <p className="text-sm font-medium">Suggested change</p>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">{improved.text.slice(0, 1800)}{improved.text.length > 1800 ? '\n…' : ''}</pre>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={() => { set({ reading: improved.text }); setImproved(null) }}>Replace the reading</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setImproved(null)}>Keep mine</Button>
          </div>
        </div>
      )}
    </Box>
  )
}

export function QuizAssist({ data, set, path, programKey, disabled }: { data: Data; set: (p: Data) => void; path: string; programKey: string; disabled: boolean }) {
  const convex = useConvex()
  const { busy, error, run } = useAi()
  const [count, setCount] = useState(data.kind === 'pre' ? 5 : 10)
  const [difficulty, setDifficulty] = useState<'easy' | 'mixed' | 'hard'>('mixed')
  const [draft, setDraft] = useState<QuizDraft | null>(null)
  const [review, setReview] = useState<ReviewResult | null>(null)
  const qs: { question: string; options: string[]; correct: number }[] = data.questions ?? []

  return (
    <Box>
      <p className="mb-3 text-sm text-muted-foreground">Writes fair questions from this path’s own lessons, with plausible wrong answers and explanations. Always check the answers.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm">Questions
          <input type="number" min={1} max={15} className="w-16 rounded-md border border-input bg-background px-2 py-1.5" value={count} onChange={(e) => setCount(Math.min(15, Math.max(1, Math.floor(Number(e.target.value) || 1))))} />
        </label>
        <select aria-label="Difficulty" className={`${selectClass} w-auto`} value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
          <option value="easy">Easier</option>
          <option value="mixed">Mixed</option>
          <option value="hard">Harder</option>
        </select>
        <Button type="button" size="sm" disabled={disabled || busy !== null} onClick={async () => {
          const r = await run('quiz', async () => {
            const program = await convex.query(api.admin.content.preview, { programKey, mode: 'draft' })
            const material = (program?.modules ?? []).flatMap((m) => m.lessons.map((l) => `# ${l.title}\n${l.reading}`)).join('\n\n') || `${path}: ${program?.description ?? ''}`
            return askAi('quiz', { path, kind: data.kind === 'pre' ? 'pre' : 'post', count, difficulty, context: material })
          })
          if (r) setDraft(r)
        }}>
          {busy === 'quiz' ? <><Spin />Writing…</> : 'Write questions'}
        </Button>
        {qs.length > 0 && (
          <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={async () => {
            const content = qs.map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o, k) => `${'ABCD'[k]}) ${o}${k === q.correct ? ' (marked correct)' : ''}`).join('\n')}`).join('\n\n')
            const r = await run('review', () => askAi('review', { kind: 'multiple-choice quiz', content }))
            if (r) setReview(r)
          }}>
            {busy === 'review' ? <><Spin />Checking…</> : 'Check my questions'}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      {review && <Review result={review} />}
      {draft && (
        <div className="mt-3 rounded-md border border-primary/50 bg-background p-3">
          <p className="text-sm font-medium">{draft.questions.length} questions drafted</p>
          <ol className="mt-2 max-h-64 list-decimal space-y-2 overflow-auto pl-5 text-sm">
            {draft.questions.map((q, i) => (
              <li key={i}>
                {q.question}
                <ul className="ml-2 text-xs text-muted-foreground">
                  {q.options.map((o, k) => <li key={k} className={k === q.correct ? 'font-semibold text-foreground' : ''}>{'ABCD'[k]}) {o}</li>)}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => { set({ questions: [...qs.filter((q) => q.question.trim() && !/^Question text$/.test(q.question)), ...draft.questions.map((q, i) => ({ id: `ai${Date.now().toString(36)}${i}`, ...q }))] }); setDraft(null) }}>Add these to the quiz</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { set({ questions: draft.questions.map((q, i) => ({ id: `q${i + 1}`, ...q })) }); setDraft(null) }}>Replace the quiz</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </div>
      )}
    </Box>
  )
}
