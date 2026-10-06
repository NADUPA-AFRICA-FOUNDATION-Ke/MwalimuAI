'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/admin/common'
import { askAi } from '@/lib/admin/ai-client'
import type { TranslateKind } from '@/lib/admin-ai'
import type { Data } from './forms'

const lines = (v: unknown) => (Array.isArray(v) ? v.join('\n') : '')
const toLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** The English text, shown small under each Kiswahili field so a translator never has to switch tabs. */
const Ref = ({ text }: { text?: string }) => (text && text.trim() ? <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground" lang="en">English: {text}</p> : null)

/** What gets sent to the model: only the fields that are translated. */
export function translationSource(kind: TranslateKind, d: Data) {
  if (kind === 'lesson') return { title: d.title, videoTitle: d.videoTitle, videoPoints: d.videoPoints, reading: d.reading, reflectionPrompt: d.reflectionPrompt, reflectionPlaceholder: d.reflectionPlaceholder }
  if (kind === 'module') return { title: d.title, description: d.description }
  if (kind === 'quiz') return { questions: (d.questions ?? []).map((q: any) => ({ question: q.question, options: q.options, explanation: q.explanation })) }
  return { title: d.title, shortTitle: d.shortTitle, tagline: d.tagline, description: d.description, assignment: d.assignment, certificate: d.certificate }
}

export function SwEditor({ kind, data, set, canEdit }: { kind: TranslateKind; data: Data; set: (p: Data) => void; canEdit: boolean }) {
  const sw: Data = data.sw ?? {}
  const setSw = (patch: Data) => set({ sw: { ...sw, ...patch } })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const translate = async () => {
    if (data.sw && Object.values(data.sw).some((v) => (typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.length : false)) && !window.confirm('Replace the Kiswahili text with a new translation?')) return
    setBusy(true); setError(null)
    try {
      set({ sw: await askAi('translate', { kind, source: translationSource(kind, data) }) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }
  const text = (key: string, label: string, opts: { area?: boolean; rows?: number } = {}) => (
    <Field label={label}>
      {opts.area ? <Textarea rows={opts.rows ?? 3} value={sw[key] ?? ''} onChange={(e) => setSw({ [key]: e.target.value })} lang="sw" /> : <Input value={sw[key] ?? ''} onChange={(e) => setSw({ [key]: e.target.value })} lang="sw" />}
      <Ref text={data[key]} />
    </Field>
  )

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-background p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />Kiswahili version</p>
        <p className="mb-3 text-sm text-muted-foreground">Learners who choose Kiswahili see this. Anything left blank shows in English. The assistant can translate it for you; a fluent reader should check it before it goes live.</p>
        <Button type="button" size="sm" disabled={!canEdit || busy} onClick={translate}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Translating…</> : 'Translate with AI'}</Button>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {kind === 'lesson' && (
        <>
          {text('title', 'Title (Kiswahili)')}
          {text('videoTitle', 'Video title (Kiswahili)')}
          <Field label="Key points (Kiswahili)" hint="One per line">
            <Textarea rows={4} lang="sw" value={lines(sw.videoPoints)} onChange={(e) => setSw({ videoPoints: toLines(e.target.value) })} />
            <Ref text={lines(data.videoPoints)} />
          </Field>
          {text('reading', 'Reading (Kiswahili, Markdown)', { area: true, rows: 16 })}
          {text('reflectionPrompt', 'Reflection prompt (Kiswahili)', { area: true, rows: 2 })}
          {text('reflectionPlaceholder', 'Reflection hint (Kiswahili)')}
        </>
      )}
      {kind === 'module' && (<>{text('title', 'Title (Kiswahili)')}{text('description', 'Description (Kiswahili)', { area: true })}</>)}
      {kind === 'program' && (
        <>
          {text('title', 'Title (Kiswahili)')}
          {text('shortTitle', 'Short title (Kiswahili)')}
          {text('tagline', 'Tagline (Kiswahili)')}
          {text('description', 'Description (Kiswahili)', { area: true })}
          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-semibold">Assignment (Kiswahili)</legend>
            <Field label="Title"><Input lang="sw" value={sw.assignment?.title ?? ''} onChange={(e) => setSw({ assignment: { ...(sw.assignment ?? {}), title: e.target.value } })} /><Ref text={data.assignment?.title} /></Field>
            <Field label="Context"><Textarea rows={2} lang="sw" value={sw.assignment?.context ?? ''} onChange={(e) => setSw({ assignment: { ...(sw.assignment ?? {}), context: e.target.value } })} /></Field>
            <Field label="Task"><Textarea rows={3} lang="sw" value={sw.assignment?.task ?? ''} onChange={(e) => setSw({ assignment: { ...(sw.assignment ?? {}), task: e.target.value } })} /><Ref text={data.assignment?.task} /></Field>
            <Field label="Hints" hint="One per line"><Textarea rows={3} lang="sw" value={lines(sw.assignment?.hints)} onChange={(e) => setSw({ assignment: { ...(sw.assignment ?? {}), hints: toLines(e.target.value) } })} /></Field>
            <Field label="Rubric" hint="One per line"><Textarea rows={3} lang="sw" value={lines(sw.assignment?.rubric)} onChange={(e) => setSw({ assignment: { ...(sw.assignment ?? {}), rubric: toLines(e.target.value) } })} /></Field>
          </fieldset>
          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-semibold">Certificate (Kiswahili)</legend>
            <Field label="Subtitle"><Input lang="sw" value={sw.certificate?.subtitle ?? ''} onChange={(e) => setSw({ certificate: { ...(sw.certificate ?? {}), subtitle: e.target.value } })} /><Ref text={data.certificate?.subtitle} /></Field>
            <Field label="Skills" hint="One per line"><Textarea rows={3} lang="sw" value={lines(sw.certificate?.skills)} onChange={(e) => setSw({ certificate: { ...(sw.certificate ?? {}), skills: toLines(e.target.value) } })} /></Field>
          </fieldset>
        </>
      )}
      {kind === 'quiz' && (
        <ol className="space-y-4">
          {(data.questions ?? []).map((q: any, i: number) => {
            const t = sw.questions?.[i] ?? { question: '', options: ['', '', '', ''], explanation: '' }
            const setQ = (patch: Data) => {
              const next = [...(data.questions ?? [])].map((_, k) => sw.questions?.[k] ?? { question: '', options: ['', '', '', ''], explanation: '' })
              next[i] = { ...next[i], ...patch }
              setSw({ questions: next })
            }
            return (
              <li key={q.id ?? i} className="space-y-2 rounded-md border p-3">
                <span className="text-sm font-semibold">Question {i + 1}</span>
                <Textarea aria-label={`Question ${i + 1} in Kiswahili`} rows={2} lang="sw" value={t.question} onChange={(e) => setQ({ question: e.target.value })} />
                <Ref text={q.question} />
                {q.options.map((o: string, oi: number) => (
                  <div key={oi}>
                    <Input aria-label={`Question ${i + 1} option ${oi + 1} in Kiswahili`} lang="sw" value={t.options[oi] ?? ''} onChange={(e) => setQ({ options: t.options.map((x: string, k: number) => (k === oi ? e.target.value : x)) })} />
                    <p className="text-xs text-muted-foreground">English{q.correct === oi ? ' (correct answer)' : ''}: {o}</p>
                  </div>
                ))}
                <Input aria-label={`Question ${i + 1} explanation in Kiswahili`} lang="sw" placeholder="Maelezo" value={t.explanation} onChange={(e) => setQ({ explanation: e.target.value })} />
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
