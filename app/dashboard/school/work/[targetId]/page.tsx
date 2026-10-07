'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentPicker, MessageAttachments, type Uploaded } from '@/components/support/attachments'
import { StatusPill } from '@/components/school/status-pill'
import { usePrograms } from '@/context/content-context'
import { KIND_LABEL, eat } from '@/lib/school'
import { errorMessage } from '@/lib/support'

export default function WorkItemPage() {
  const { targetId } = useParams<{ targetId: string }>()
  const id = targetId as Id<'assignmentTargets'>
  const item = useQuery(api.schoolPortal.myWorkItem, { targetId: id })
  const submit = useMutation(api.schoolPortal.submitTask)
  const started = useMutation(api.schoolPortal.markStarted)
  const uploadUrl = useMutation(api.schoolPortal.uploadUrl)
  const { getProgramById } = usePrograms()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Uploaded[]>([])
  const [busy, setBusy] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  useEffect(() => { if (item && item.status === 'not_started') void started({ targetId: id }).catch(() => {}) }, [item, id, started])

  if (item === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await submit({ targetId: id, text, ...(files.length ? { attachments: files } : {}) })
      if (r.ok) { toast.success('Submitted. Your school leadership has been told.'); setText('') }
      else setRefused(r.message)
    } catch (err) {
      toast.error(errorMessage(err, 'Not submitted. Check your connection and try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dashboard/school" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My school</Link>
      <header className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2"><StatusPill status={item.status} />{item.mandatory && <span className="text-xs font-medium text-destructive">Mandatory</span>}</div>
        <h1 className="mt-2 text-2xl font-bold">{item.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{KIND_LABEL[item.kind]} · {item.skillArea}</p>
        <p className="mt-3 text-sm"><b>Due {eat(item.dueAt)}</b>{item.closesAt !== item.dueAt && <> · submissions accepted until {eat(item.closesAt)}{item.extensionUntil ? ' (extension granted)' : ' (grace period)'}</>}</p>
        {item.description && <p className="mt-3 whitespace-pre-wrap text-sm">{item.description}</p>}
        {item.objectives.length > 0 && (
          <>
            <h2 className="mt-4 text-sm font-semibold">Objectives</h2>
            <ul className="mt-1 list-disc pl-5 text-sm">{item.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
          </>
        )}
        <MessageAttachments files={item.attachments} />
      </header>

      {item.kind !== 'task' && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">{item.kind === 'assessment' ? 'Take the assessment' : 'Complete these modules'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">This is marked done automatically the moment you finish{item.kind === 'assessment' ? ' the final assessment' : ' every lesson'}.</p>
          <ul className="mt-3 space-y-2">
            {item.modules.map((m, i) => {
              const program = getProgramById(m.programId)
              const mod = m.moduleKey ? program?.modules.find((x) => x.id === m.moduleKey) : null
              const moduleTitle = mod?.title ?? null
              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />{program?.title ?? m.programId}{moduleTitle ? ` · ${moduleTitle}` : ''}</span>
                  <span className="flex items-center gap-3">
                    {item.kind !== 'assessment' && <span className="text-xs text-muted-foreground">{m.done}/{m.lessons} lessons</span>}
                    <Button asChild size="sm"><Link href={item.kind === 'assessment' ? `/dashboard/learning/${m.programId}/assessment?type=post` : mod?.lessons[0] ? `/dashboard/learning/${m.programId}/${mod.id}/${mod.lessons[0].id}` : `/dashboard/learning/${m.programId}`}>{item.kind === 'assessment' ? 'Take it' : 'Open'}</Link></Button>
                  </span>
                </li>
              )
            })}
          </ul>
          {item.score !== null && <p className="mt-3 text-sm">Your score: <b>{item.score}%</b> {item.passed ? '(passed)' : '(not passed yet)'}</p>}
        </section>
      )}

      {item.kind === 'task' && (
        <>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">What to submit</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{item.taskInstructions}</p>
            {item.rubric && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <caption className="mb-2 text-left text-sm font-semibold">How it will be assessed</caption>
                  <thead><tr><th scope="col" className="border p-2">Criterion</th>{item.levels.slice().reverse().map((l) => <th key={l} scope="col" className="border p-2">{l}</th>)}</tr></thead>
                  <tbody>{item.rubric.map((r, i) => <tr key={i}><th scope="row" className="border p-2 font-medium">{r.criterion}</th>{r.levels.slice().reverse().map((d, j) => <td key={j} className="border p-2 text-muted-foreground">{d}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          {item.submissions.map((s) => (
            <section key={s._id} className="rounded-2xl border bg-card p-5" aria-label="Your submission">
              <p className="text-xs text-muted-foreground">You submitted {eat(s.submittedAt)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{s.text}</p>
              <MessageAttachments files={s.attachments} />
              {s.review && (
                <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                  <h3 className="font-semibold">Feedback</h3>
                  <ul className="mt-2 space-y-1">{item.rubric?.map((r, i) => <li key={i}><b>{r.criterion}:</b> {item.levels[(s.review!.levels[i] ?? 1) - 1]}</li>)}</ul>
                  <p className="mt-2 whitespace-pre-wrap">{s.review.feedback}</p>
                  {s.review.allowResubmit && <p className="mt-2 font-medium">You may improve your work and submit again before the deadline.</p>}
                </div>
              )}
            </section>
          ))}

          {refused && <p role="alert" className="rounded-2xl border border-destructive bg-destructive/5 p-4 text-sm text-destructive">{refused}</p>}
          {item.canSubmit ? (
            <form onSubmit={send} className="space-y-3 rounded-2xl border bg-card p-5">
              <Label htmlFor="evidence">{item.submissions.length ? 'Submit an improved version' : 'Your evidence'}</Label>
              <Textarea id="evidence" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={10000} placeholder="Describe your work, or paste it here. Attach photos or PDFs of lesson plans, rubrics or learners’ work (no learners’ faces or names)." />
              <AttachmentPicker getUploadUrl={() => uploadUrl({})} onChange={setFiles} disabled={busy} />
              <Button type="submit" className="min-h-11" disabled={busy || (text.trim().length < 20 && files.length === 0)}>{busy ? 'Submitting…' : 'Submit'}</Button>
              <p className="text-xs text-muted-foreground">Submissions close {eat(item.closesAt)}. After that the form refuses late work, and the attempt is recorded.</p>
            </form>
          ) : !item.windowOpen && (item.status === 'overdue' || item.status === 'invalid') && !refused ? (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">The deadline has passed, so this can no longer be submitted. If you had a good reason, ask your school leadership for an extension.</p>
          ) : null}
        </>
      )}
    </div>
  )
}
