'use client'

/** One editor form per content kind. Each edits a plain data object and reports changes via `set`. */

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { Field, selectClass } from '@/components/admin/common'
import { parseQuestions } from '@/lib/admin/quiz-import'

export type Data = Record<string, any>
const lines = (v: unknown) => (Array.isArray(v) ? v.join('\n') : '')
const toLines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

export type FormProps = { data: Data; set: (p: Data) => void }
const Text = ({
  label,
  k,
  data,
  set,
  hint,
  area,
  rows = 3,
}: FormProps & { label: string; k: string; hint?: string; area?: boolean; rows?: number }) => (
  <Field label={label} hint={hint}>
    {area ? (
      <Textarea rows={rows} value={data[k] ?? ''} onChange={(e) => set({ [k]: e.target.value })} />
    ) : (
      <Input value={data[k] ?? ''} onChange={(e) => set({ [k]: e.target.value })} />
    )}
  </Field>
)

export function ProgramForm({ data, set }: FormProps) {
  const a = data.assignment ?? {},
    c = data.certificate ?? {}
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Text label="Title" k="title" data={data} set={set} />
        <Text label="Short title" k="shortTitle" data={data} set={set} />
      </div>
      <Text label="Tagline" k="tagline" data={data} set={set} />
      <Text label="Description" k="description" data={data} set={set} area />
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Track">
          <select className={selectClass} value={data.track} onChange={(e) => set({ track: e.target.value })}>
            {['core', 'stem', 'languages', 'humanities', 'leadership', 'wellbeing'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Hours">
          <Input
            type="number"
            min={0}
            value={data.hours ?? 0}
            onChange={(e) => set({ hours: Number(e.target.value) })}
          />
        </Field>
        <Field label="Accent">
          <select className={selectClass} value={data.accent} onChange={(e) => set({ accent: e.target.value })}>
            <option value="primary">Primary</option>
            <option value="accent">Accent</option>
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-1 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.available !== false}
              onChange={(e) => set({ available: e.target.checked })}
            />
            Available
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.launchingSoon === true}
              onChange={(e) => set({ launchingSoon: e.target.checked })}
            />
            Launching soon
          </label>
        </div>
      </div>
      <Text label="KICD alignment" k="kicdAlignment" data={data} set={set} />
      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Assignment</legend>
        <Field label="Title">
          <Input value={a.title ?? ''} onChange={(e) => set({ assignment: { ...a, title: e.target.value } })} />
        </Field>
        <Field label="Context">
          <Textarea
            rows={2}
            value={a.context ?? ''}
            onChange={(e) => set({ assignment: { ...a, context: e.target.value } })}
          />
        </Field>
        <Field label="Task">
          <Textarea
            rows={3}
            value={a.task ?? ''}
            onChange={(e) => set({ assignment: { ...a, task: e.target.value } })}
          />
        </Field>
        <Field label="Hints" hint="One per line">
          <Textarea
            rows={3}
            value={lines(a.hints)}
            onChange={(e) => set({ assignment: { ...a, hints: toLines(e.target.value) } })}
          />
        </Field>
        <Field label="Rubric" hint="One criterion per line">
          <Textarea
            rows={3}
            value={lines(a.rubric)}
            onChange={(e) => set({ assignment: { ...a, rubric: toLines(e.target.value) } })}
          />
        </Field>
      </fieldset>
      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Certificate</legend>
        <Field label="Subtitle">
          <Input value={c.subtitle ?? ''} onChange={(e) => set({ certificate: { ...c, subtitle: e.target.value } })} />
        </Field>
        <Field label="Skills" hint="One per line">
          <Textarea
            rows={3}
            value={lines(c.skills)}
            onChange={(e) => set({ certificate: { ...c, skills: toLines(e.target.value) } })}
          />
        </Field>
      </fieldset>
    </>
  )
}

export const ModuleForm = ({ data, set }: FormProps) => (
  <>
    <Text label="Title" k="title" data={data} set={set} />
    <Text label="Description" k="description" data={data} set={set} area />
  </>
)

const FORMATS = [
  { label: 'Heading', before: '\n## ', after: '', sample: 'Heading' },
  { label: 'Bold', before: '**', after: '**', sample: 'bold text' },
  { label: 'List', before: '\n- ', after: '', sample: 'item' },
  { label: 'Numbered', before: '\n1. ', after: '', sample: 'step' },
  { label: 'Quote', before: '\n> ', after: '', sample: 'quote' },
  { label: 'Link', before: '[', after: '](https://)', sample: 'link text' },
]

export function LessonForm({ data, set }: FormProps) {
  const [preview, setPreview] = useState(false)
  const readingRef = useRef<HTMLTextAreaElement>(null)
  /** Wraps the selection (or a sample word) in Markdown, then puts the cursor back in the box. */
  const applyFormat = (f: (typeof FORMATS)[number]) => {
    const el = readingRef.current
    const text: string = data.reading ?? ''
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const picked = text.slice(start, end) || f.sample
    set({ reading: `${text.slice(0, start)}${f.before}${picked}${f.after}${text.slice(end)}` })
    requestAnimationFrame(() => {
      el?.focus()
      const at = start + f.before.length
      el?.setSelectionRange(at, at + picked.length)
    })
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Text label="Title" k="title" data={data} set={set} />
        <Text label="Duration" k="duration" data={data} set={set} hint="e.g. 15 min" />
      </div>
      <Text label="Video title" k="videoTitle" data={data} set={set} />
      <Field label="Key points" hint="One per line">
        <Textarea
          rows={4}
          value={lines(data.videoPoints)}
          onChange={(e) => set({ videoPoints: toLines(e.target.value) })}
        />
      </Field>
      <Field label="Reading (Markdown)">
        <div className="mb-1 flex gap-2">
          <Button type="button" size="sm" variant={preview ? 'outline' : 'secondary'} onClick={() => setPreview(false)}>
            Write
          </Button>
          <Button type="button" size="sm" variant={preview ? 'secondary' : 'outline'} onClick={() => setPreview(true)}>
            Preview
          </Button>
        </div>
        {preview ? (
          <div className="min-h-48 rounded-md border bg-background p-4">
            <MarkdownRenderer content={data.reading ?? ''} article />
          </div>
        ) : (
          <>
            <div className="mb-1 flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
              {FORMATS.map((f) => (
                <Button key={f.label} type="button" size="sm" variant="outline" className="min-h-9" onClick={() => applyFormat(f)}>
                  {f.label}
                </Button>
              ))}
            </div>
            <Textarea
              ref={readingRef}
              rows={18}
              className="font-mono text-sm"
              value={data.reading ?? ''}
              onChange={(e) => set({ reading: e.target.value })}
            />
          </>
        )}
      </Field>
      <Text label="Reflection prompt" k="reflectionPrompt" data={data} set={set} area rows={2} />
      <Text label="Reflection placeholder" k="reflectionPlaceholder" data={data} set={set} />
    </>
  )
}

export function QuizForm({ data, set }: FormProps) {
  const qs: any[] = data.questions ?? []
  const update = (i: number, patch: Data) => set({ questions: qs.map((q, j) => (j === i ? { ...q, ...patch } : q)) })
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {data.kind === 'post'
          ? 'Post-assessment. Learners need 85% to earn the certificate.'
          : 'Pre-assessment (diagnostic).'}
      </p>
      <ol className="space-y-4">
        {qs.map((q, i) => (
          <li key={i} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Question {i + 1}</span>
              <div className="flex">
                <Button type="button" size="icon" variant="ghost" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => set({ questions: moveItem(qs, i, i - 1) })}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Move question ${i + 1} down`} disabled={i === qs.length - 1} onClick={() => set({ questions: moveItem(qs, i, i + 1) })}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Duplicate question ${i + 1}`} onClick={() => set({ questions: [...qs.slice(0, i + 1), { ...q, id: `q${qs.length + 1}-${Math.random().toString(36).slice(2, 6)}` }, ...qs.slice(i + 1)] })}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove question ${i + 1}`} disabled={qs.length === 1} onClick={() => set({ questions: qs.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Textarea
              aria-label={`Question ${i + 1} text`}
              rows={2}
              value={q.question}
              onChange={(e) => update(i, { question: e.target.value })}
            />
            {q.options.map((o: string, oi: number) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  aria-label={`Option ${oi + 1} is correct`}
                  name={`correct-${i}`}
                  checked={q.correct === oi}
                  onChange={() => update(i, { correct: oi })}
                />
                <Input
                  aria-label={`Question ${i + 1} option ${oi + 1}`}
                  value={o}
                  onChange={(e) =>
                    update(i, { options: q.options.map((x: string, k: number) => (k === oi ? e.target.value : x)) })
                  }
                />
              </div>
            ))}
            <Input
              aria-label={`Question ${i + 1} explanation`}
              placeholder="Why this answer is correct"
              value={q.explanation}
              onChange={(e) => update(i, { explanation: e.target.value })}
            />
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          set({
            questions: [
              ...qs,
              {
                id: `q${qs.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
                question: '',
                options: ['', '', '', ''],
                correct: 0,
                explanation: '',
              },
            ],
          })
        }
      >
        Add question
      </Button>
      <PasteQuestions onAdd={(added) => set({ questions: [...qs, ...added] })} />
    </>
  )
}

const moveItem = <T,>(list: T[], from: number, to: number) => {
  const next = [...list]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/** Drop a whole quiz in as plain text instead of typing each question into boxes. */
function PasteQuestions({ onAdd }: { onAdd: (q: any[]) => void }) {
  const [text, setText] = useState('')
  const parsed = text.trim() ? parseQuestions(text) : null
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">Paste several questions at once</summary>
      <p className="mt-2 text-sm text-muted-foreground">
        One question per block, a blank line between blocks. Put the question first, then options a) to d). Mark the right option with * or add a line like <code>Answer: B</code>. An optional <code>Why: …</code> line becomes the explanation.
      </p>
      <Textarea
        aria-label="Questions to paste"
        rows={10}
        className="mt-2 font-mono text-sm"
        value={text}
        placeholder={'1. Which is a core competency?\na) Digital literacy *\nb) Cooking\nc) Sprinting\nd) Chess\nWhy: It is one of the seven.'}
        onChange={(e) => setText(e.target.value)}
      />
      {parsed && (
        <div className="mt-2 text-sm" aria-live="polite">
          <p>{parsed.questions.length} question{parsed.questions.length === 1 ? '' : 's'} ready to add.</p>
          {parsed.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-amber-800 dark:text-amber-200">
              {parsed.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Button
        type="button"
        className="mt-2"
        disabled={!parsed || parsed.questions.length === 0}
        onClick={() => {
          if (!parsed) return
          onAdd(parsed.questions)
          setText('')
        }}
      >
        Add {parsed?.questions.length ?? 0} question{parsed?.questions.length === 1 ? '' : 's'}
      </Button>
    </details>
  )
}
