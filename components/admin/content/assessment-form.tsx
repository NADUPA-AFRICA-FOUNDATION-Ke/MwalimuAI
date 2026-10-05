'use client'

import { useQuery } from 'convex/react'
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, selectClass } from '@/components/admin/common'
import type { Data, FormProps } from './forms'

type Q = {
  id: string
  section: number
  type: 'scale' | 'radio' | 'multiple' | 'knowledge'
  question: string
  subtext: string
  options: string[]
  correctIndex: number
  explanation: string
  minLabel: string
  maxLabel: string
  maxSelect: number
}
type Rule = { programId: string; when: { questionId: string; answers: string[] }[] }

const TYPE_LABEL: Record<Q['type'], string> = {
  radio: 'Pick one',
  multiple: 'Pick several',
  scale: 'Scale 1 to 5',
  knowledge: 'Knowledge check (right answer)',
}
const newId = () => `q_${Math.random().toString(36).slice(2, 8)}`
const blankQuestion = (section: number): Q => ({
  id: newId(), section, type: 'radio', question: '', subtext: '', options: ['', ''], correctIndex: 0, explanation: '', minLabel: '', maxLabel: '', maxSelect: 0,
})
const swap = <T,>(list: T[], a: number, b: number) => {
  const next = [...list]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/** Editor for the needs assessment: sections, questions of four types, and the rules that recommend learning paths. */
export function AssessmentForm({ data, set }: FormProps) {
  const sections: { title: string; description: string }[] = data.sections ?? []
  const questions: Q[] = data.questions ?? []
  const rules: Rule[] = data.rules ?? []
  const fallback: string[] = data.fallbackProgramIds ?? []
  const programs = useQuery(api.admin.content.programs, {})

  const setQ = (i: number, patch: Partial<Q>) => set({ questions: questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) })
  const choiceQuestions = questions.filter((q) => q.type === 'radio' || q.type === 'multiple')

  return (
    <div className="space-y-8">
      <div className="grid gap-4">
        <Field label="Title">
          <Input value={data.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Introduction" hint="Shown before the first question.">
          <Textarea rows={2} value={data.intro ?? ''} onChange={(e) => set({ intro: e.target.value })} />
        </Field>
      </div>

      <section aria-labelledby="sections-h" className="space-y-3">
        <h3 id="sections-h" className="font-semibold">Sections</h3>
        {sections.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input aria-label={`Section ${i + 1} title`} placeholder="Section title" value={s.title} onChange={(e) => set({ sections: sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
            <Input aria-label={`Section ${i + 1} description`} placeholder="Short description" value={s.description} onChange={(e) => set({ sections: sections.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
            <div className="flex">
              <Button type="button" size="icon" variant="ghost" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => set({ sections: swap(sections, i, i - 1), questions: questions.map((q) => ({ ...q, section: q.section === i ? i - 1 : q.section === i - 1 ? i : q.section })) })}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label={`Move section ${i + 1} down`} disabled={i === sections.length - 1} onClick={() => set({ sections: swap(sections, i, i + 1), questions: questions.map((q) => ({ ...q, section: q.section === i ? i + 1 : q.section === i + 1 ? i : q.section })) })}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label={`Remove section ${i + 1}`} disabled={sections.length === 1 || questions.some((q) => q.section === i)} title={questions.some((q) => q.section === i) ? 'Move or remove its questions first' : undefined} onClick={() => set({ sections: sections.filter((_, j) => j !== i), questions: questions.map((q) => ({ ...q, section: q.section > i ? q.section - 1 : q.section })) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={sections.length >= 10} onClick={() => set({ sections: [...sections, { title: '', description: '' }] })}>
          <Plus className="mr-1 h-4 w-4" />
          Add section
        </Button>
      </section>

      <section aria-labelledby="questions-h" className="space-y-3">
        <h3 id="questions-h" className="font-semibold">Questions ({questions.length})</h3>
        {sections.map((section, si) => (
          <div key={si} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{section.title || `Section ${si + 1}`}</h4>
            {questions.map((q, i) =>
              q.section !== si ? null : (
                <div key={q.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <select aria-label={`Question ${i + 1} type`} className={`${selectClass} w-auto`} value={q.type} onChange={(e) => {
                      const type = e.target.value as Q['type']
                      setQ(i, { type, options: type === 'scale' ? [] : q.options.length >= 2 ? q.options : ['', ''], correctIndex: 0 })
                    }}>
                      {Object.entries(TYPE_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <div className="flex">
                      <Button type="button" size="icon" variant="ghost" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => set({ questions: swap(questions, i, i - 1) })}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" aria-label={`Move question ${i + 1} down`} disabled={i === questions.length - 1} onClick={() => set({ questions: swap(questions, i, i + 1) })}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" aria-label={`Duplicate question ${i + 1}`} onClick={() => set({ questions: [...questions.slice(0, i + 1), { ...q, id: newId() }, ...questions.slice(i + 1)] })}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" aria-label={`Remove question ${i + 1}`} disabled={questions.length === 1} onClick={() => set({ questions: questions.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea aria-label={`Question ${i + 1} text`} rows={2} placeholder="Question" value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} />
                  <Input aria-label={`Question ${i + 1} help text`} placeholder="Help text (optional)" value={q.subtext} onChange={(e) => setQ(i, { subtext: e.target.value })} />
                  {q.type === 'scale' ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input aria-label={`Question ${i + 1} label for 1`} placeholder="Label for 1 (e.g. Not at all)" value={q.minLabel} onChange={(e) => setQ(i, { minLabel: e.target.value })} />
                      <Input aria-label={`Question ${i + 1} label for 5`} placeholder="Label for 5 (e.g. Very confident)" value={q.maxLabel} onChange={(e) => setQ(i, { maxLabel: e.target.value })} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          {q.type === 'knowledge' && (
                            <input type="radio" aria-label={`Option ${oi + 1} is correct`} name={`correct-${q.id}`} checked={q.correctIndex === oi} onChange={() => setQ(i, { correctIndex: oi })} />
                          )}
                          <Input aria-label={`Question ${i + 1} option ${oi + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === oi ? e.target.value : x)) })} />
                          <Button type="button" size="icon" variant="ghost" aria-label={`Remove option ${oi + 1}`} disabled={q.options.length <= 2} onClick={() => setQ(i, { options: q.options.filter((_, k) => k !== oi), correctIndex: q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="ghost" disabled={q.options.length >= 8} onClick={() => setQ(i, { options: [...q.options, ''] })}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add option
                      </Button>
                      {q.type === 'multiple' && (
                        <Field label="Most choices allowed" hint="0 means no limit.">
                          <Input type="number" min={0} max={8} className="w-24" value={q.maxSelect} onChange={(e) => setQ(i, { maxSelect: Math.max(0, Math.min(8, Math.floor(Number(e.target.value) || 0))) })} />
                        </Field>
                      )}
                      {q.type === 'knowledge' && (
                        <Input aria-label={`Question ${i + 1} explanation`} placeholder="Why this answer is correct (shown after answering)" value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} />
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
            <Button type="button" variant="outline" size="sm" disabled={questions.length >= 80} onClick={() => set({ questions: [...questions, blankQuestion(si)] })}>
              <Plus className="mr-1 h-4 w-4" />
              Add question to this section
            </Button>
          </div>
        ))}
      </section>

      <section aria-labelledby="rules-h" className="space-y-3">
        <div>
          <h3 id="rules-h" className="font-semibold">Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            When a teacher picks any of the chosen answers, recommend that learning path. The first two matching paths are shown; the fallback paths fill any gap.
          </p>
        </div>
        {rules.map((rule, ri) => {
          const setRule = (patch: Partial<Rule>) => set({ rules: rules.map((r, j) => (j === ri ? { ...r, ...patch } : r)) })
          return (
            <div key={ri} className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Recommend</span>
                <select aria-label={`Rule ${ri + 1} learning path`} className={`${selectClass} w-auto min-w-48`} value={rule.programId} onChange={(e) => setRule({ programId: e.target.value })}>
                  <option value="">Choose a learning path</option>
                  {programs?.map((p) => (
                    <option key={p.key} value={p.key}>{p.title}</option>
                  ))}
                </select>
                <Button type="button" size="icon" variant="ghost" aria-label={`Move rule ${ri + 1} up`} disabled={ri === 0} onClick={() => set({ rules: swap(rules, ri, ri - 1) })}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Move rule ${ri + 1} down`} disabled={ri === rules.length - 1} onClick={() => set({ rules: swap(rules, ri, ri + 1) })}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Remove rule ${ri + 1}`} onClick={() => set({ rules: rules.filter((_, j) => j !== ri) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {rule.when.map((w, wi) => {
                const q = questions.find((x) => x.id === w.questionId)
                const missing = w.answers.filter((a) => q && !q.options.includes(a))
                const setWhen = (patch: Partial<Rule['when'][number]>) => setRule({ when: rule.when.map((x, k) => (k === wi ? { ...x, ...patch } : x)) })
                return (
                  <div key={wi} className="space-y-2 rounded border bg-muted/30 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">{wi === 0 ? 'if' : 'or if'}</span>
                      <select aria-label={`Rule ${ri + 1} condition ${wi + 1} question`} className={`${selectClass} w-auto min-w-48 max-w-full`} value={w.questionId} onChange={(e) => setWhen({ questionId: e.target.value, answers: [] })}>
                        <option value="">Choose a question</option>
                        {choiceQuestions.map((cq) => (
                          <option key={cq.id} value={cq.id}>{cq.question.slice(0, 70) || cq.id}</option>
                        ))}
                      </select>
                      <Button type="button" size="icon" variant="ghost" aria-label={`Remove condition ${wi + 1}`} onClick={() => setRule({ when: rule.when.filter((_, k) => k !== wi) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {q && (
                      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
                        <legend className="sr-only">Answers that trigger this</legend>
                        {q.options.filter(Boolean).map((o) => (
                          <label key={o} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={w.answers.includes(o)} onChange={(e) => setWhen({ answers: e.target.checked ? [...w.answers, o] : w.answers.filter((a) => a !== o) })} />
                            {o}
                          </label>
                        ))}
                      </fieldset>
                    )}
                    {missing.length > 0 && (
                      <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">An answer used here no longer exists on the question: {missing.join('; ')}. Tick the current wording instead.</p>
                    )}
                  </div>
                )
              })}
              <Button type="button" size="sm" variant="ghost" disabled={rule.when.length >= 12 || choiceQuestions.length === 0} onClick={() => setRule({ when: [...rule.when, { questionId: '', answers: [] }] })}>
                <Plus className="mr-1 h-4 w-4" />
                Add a condition
              </Button>
            </div>
          )
        })}
        <Button type="button" variant="outline" size="sm" disabled={rules.length >= 40} onClick={() => set({ rules: [...rules, { programId: '', when: [{ questionId: '', answers: [] }] }] })}>
          <Plus className="mr-1 h-4 w-4" />
          Add a recommendation
        </Button>
        <Field label="Fallback learning paths" hint="Used when fewer than two rules match. Up to two.">
          <div className="flex flex-wrap gap-2">
            {[0, 1].map((n) => (
              <select key={n} aria-label={`Fallback ${n + 1}`} className={`${selectClass} w-auto min-w-48`} value={fallback[n] ?? ''} onChange={(e) => {
                const next = [...fallback]
                next[n] = e.target.value
                set({ fallbackProgramIds: next.filter(Boolean) })
              }}>
                <option value="">None</option>
                {programs?.map((p) => (
                  <option key={p.key} value={p.key}>{p.title}</option>
                ))}
              </select>
            ))}
          </div>
        </Field>
      </section>
    </div>
  )
}

export type { Data }
