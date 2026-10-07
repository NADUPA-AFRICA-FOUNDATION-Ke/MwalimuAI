'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MessageAttachments } from '@/components/support/attachments'
import { StatusPill } from '@/components/school/status-pill'
import { printPDF } from '@/lib/print-pdf'
import { KIND_LABEL, STATUS_LABEL, eat, fromEatInput, toEatInput } from '@/lib/school'
import { errorMessage } from '@/lib/support'

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const data = useQuery(api.schoolPortal.assignmentDetail, { id: id as Id<'schoolAssignments'> })
  const archive = useMutation(api.schoolPortal.archiveAssignment)
  const extend = useMutation(api.schoolPortal.grantExtension)
  const review = useMutation(api.schoolPortal.reviewSubmission)
  const [ext, setExt] = useState<{ targetId: Id<'assignmentTargets'>; name: string; until: string; reason: string } | null>(null)
  const [rev, setRev] = useState<{ submissionId: Id<'taskSubmissions'>; name: string; levels: number[]; feedback: string; resubmit: boolean } | null>(null)
  const [now] = useState(() => Date.now())

  if (data === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>
  const { assignment: a, rows } = data

  function exportPdf() {
    const table = rows.map((r) => `| ${r.name} | ${STATUS_LABEL[r.status]} | ${r.submittedAt ? eat(r.submittedAt) : '–'} | ${r.score ?? r.rating ?? '–'} | ${r.extensionUntil ? `until ${eat(r.extensionUntil)}` : '–'} |`).join('\n')
    void printPDF({ title: a.title, subtitle: `${KIND_LABEL[a.kind]} · ${a.skillArea}`, meta: `Due ${eat(a.dueAt)} · exported ${eat(Date.now())}`, content: `| Teacher | Status | Submitted | Score / rating | Extension |\n|---|---|---|---|---|\n${table}\n` })
  }

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/dashboard/school" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My school</Link>
      <header className="space-y-2 rounded-2xl border bg-card p-5">
        <h1 className="text-2xl font-bold">{a.title}</h1>
        <p className="text-sm text-muted-foreground">{KIND_LABEL[a.kind]} · {a.skillArea}{a.mandatory ? ' · mandatory' : ''}</p>
        <p className="text-sm">Opens {eat(a.opensAt)} · <b>due {eat(a.dueAt)}</b>{a.graceMinutes ? ` · closes ${eat(a.closesAt)}` : ''}</p>
        {a.description && <p className="whitespace-pre-wrap text-sm">{a.description}</p>}
        <MessageAttachments files={a.attachments} />
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" className="min-h-11 gap-2" onClick={exportPdf}><Download className="h-4 w-4" aria-hidden="true" />Download PDF</Button>
          <Button variant="ghost" className="min-h-11" onClick={() => { if (confirm('Archive this assignment? Teachers will no longer see it.')) void archive({ id: a._id }).then(() => { toast.success('Archived'); router.push('/dashboard/school') }).catch((e) => toast.error(errorMessage(e, 'Not archived.'))) }}>Archive</Button>
        </div>
      </header>

      <ul className="space-y-3" aria-label="Teachers">
        {rows.map((r) => (
          <li key={r.targetId} className="space-y-2 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{r.name}</p><StatusPill status={r.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {r.progress ? `${r.progress.done}/${r.progress.total} lessons · ` : ''}{r.submittedAt ? `submitted ${eat(r.submittedAt)}` : 'not submitted'}
              {r.score !== null ? ` · score ${r.score}%` : ''}{r.rating !== null ? ` · rating ${r.rating}/4` : ''}
              {r.extensionUntil ? ` · extension until ${eat(r.extensionUntil)} (${r.extensionReason})` : ''}
            </p>
            {r.blockedAttempts.length > 0 && <p className="text-xs font-medium text-destructive">Late attempt{r.blockedAttempts.length > 1 ? 's' : ''} refused: {r.blockedAttempts.map((t) => eat(t)).join(', ')}</p>}
            {r.submission && (
              <details className="rounded-lg border p-3 text-sm">
                <summary className="cursor-pointer font-medium">Submission</summary>
                <p className="mt-2 whitespace-pre-wrap">{r.submission.text}</p>
                <MessageAttachments files={r.submission.attachments} />
                {r.submission.review && <p className="mt-2 text-xs text-muted-foreground">Reviewed {eat(r.submission.review.reviewedAt)}: {r.submission.review.feedback}</p>}
              </details>
            )}
            <div className="flex flex-wrap gap-2">
              {a.kind === 'task' && r.submission && <Button size="sm" className="min-h-11" onClick={() => setRev({ submissionId: r.submission!._id, name: r.name, levels: r.submission!.review?.levels ?? a.rubric!.map(() => 0), feedback: r.submission!.review?.feedback ?? '', resubmit: a.allowResubmit })}>{r.submission.review ? 'Change review' : 'Review'}</Button>}
              {r.status !== 'reviewed' && r.status !== 'submitted' && <Button size="sm" variant="outline" className="min-h-11" onClick={() => setExt({ targetId: r.targetId, name: r.name, until: toEatInput(Math.max(now, a.closesAt) + 2 * 86_400_000), reason: '' })}>Grant extension</Button>}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={ext !== null} onOpenChange={(o) => { if (!o) setExt(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extension for {ext?.name}</DialogTitle><DialogDescription>The teacher is notified, and the reason is kept in the school activity log.</DialogDescription></DialogHeader>
          {ext && <div className="space-y-3">
            <label className="block space-y-1 text-sm"><span>New closing time (Kenya time)</span><Input type="datetime-local" className="min-h-11" value={ext.until} onChange={(e) => setExt({ ...ext, until: e.target.value })} /></label>
            <div className="space-y-1"><Label htmlFor="ext-reason">Reason</Label><Textarea id="ext-reason" rows={3} value={ext.reason} onChange={(e) => setExt({ ...ext, reason: e.target.value })} maxLength={300} /></div>
          </div>}
          <DialogFooter><Button className="min-h-11" disabled={!ext || ext.reason.trim().length < 5} onClick={() => void extend({ targetId: ext!.targetId, until: fromEatInput(ext!.until), reason: ext!.reason }).then(() => { toast.success('Extension granted'); setExt(null) }).catch((e) => toast.error(errorMessage(e, 'Not saved.')))}>Grant extension</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rev !== null} onOpenChange={(o) => { if (!o) setRev(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review {rev?.name}</DialogTitle><DialogDescription>Choose a level for each criterion. The teacher sees your levels and feedback.</DialogDescription></DialogHeader>
          {rev && <div className="space-y-4">
            {a.rubric?.map((c, i) => (
              <fieldset key={i} className="space-y-1">
                <legend className="text-sm font-medium">{c.criterion}</legend>
                {a.levels.map((l, j) => (
                  <label key={l} className="flex min-h-11 items-start gap-2 rounded-md border p-2 text-sm">
                    <input type="radio" name={`c${i}`} className="mt-1" checked={rev.levels[i] === j + 1} onChange={() => setRev({ ...rev, levels: rev.levels.map((x, k) => (k === i ? j + 1 : x)) })} />
                    <span><b>{l}</b>{c.levels[j] ? <span className="block text-xs text-muted-foreground">{c.levels[j]}</span> : null}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="space-y-1"><Label htmlFor="rev-fb">Feedback</Label><Textarea id="rev-fb" rows={4} value={rev.feedback} onChange={(e) => setRev({ ...rev, feedback: e.target.value })} maxLength={4000} /></div>
            {a.allowResubmit && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={rev.resubmit} onChange={(e) => setRev({ ...rev, resubmit: e.target.checked })} />Return so they can improve and resubmit</label>}
          </div>}
          <DialogFooter><Button className="min-h-11" disabled={!rev || rev.levels.some((l) => l < 1) || rev.feedback.trim().length < 5} onClick={() => void review({ submissionId: rev!.submissionId, levels: rev!.levels, feedback: rev!.feedback, allowResubmit: rev!.resubmit }).then(() => { toast.success('Review sent'); setRev(null) }).catch((e) => toast.error(errorMessage(e, 'Not saved.')))}>Send review</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
