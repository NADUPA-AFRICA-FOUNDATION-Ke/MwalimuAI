'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecordView, downloadProfile, downloadTpad } from '@/components/school/record-view'
import { eat } from '@/lib/school'
import { errorMessage } from '@/lib/support'

export default function RecordPage() {
  const data = useQuery(api.teacherRecord.mine, {})
  const setSharing = useMutation(api.teacherRecord.setSharing)
  const request = useMutation(api.teacherRecord.requestTransfer)
  const cancel = useMutation(api.teacherRecord.cancelTransfer)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  if (data === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading your record…</p>
  const pending = data.transfers.find((t) => t.status === 'pending')

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">My professional record</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your record belongs to you. It stays with your account when you change schools.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11 gap-2" onClick={() => downloadProfile(data.record)}><Download className="h-4 w-4" aria-hidden="true" />Download profile (PDF)</Button>
        <Button variant="outline" className="min-h-11 gap-2" onClick={() => downloadTpad(data.record)}><Download className="h-4 w-4" aria-hidden="true" />TPAD evidence summary (PDF)</Button>
      </div>

      {data.school && !data.school.isHead && (
        <section className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">What {data.school.name} can see</h2>
          {(['summary', 'full'] as const).map((l) => (
            <label key={l} className="flex min-h-11 items-start gap-2 text-sm">
              <input type="radio" name="share" className="mt-1" checked={data.school!.sharing === l} onChange={() => void setSharing({ level: l }).then(() => toast.success('Sharing updated')).catch((e) => toast.error(errorMessage(e, 'Not saved.')))} />
              <span>{l === 'summary' ? <><b>Summary</b> (default): certificates, lessons completed, finished school work.</> : <><b>Full record</b>: also assessment scores, unfinished work and reviewers’ feedback.</>}</span>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Your school never sees your journal, AI conversations, messages or contact details.</p>
        </section>
      )}

      <RecordView record={data.record} />

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Eye className="h-4 w-4 text-primary" aria-hidden="true" />Who has viewed your record</h2>
        {data.views.length === 0 ? <p className="text-sm text-muted-foreground">No one yet.</p> : (
          <ul className="space-y-1 text-sm">{data.views.map((v) => <li key={v._id}><b>{v.viewer}</b> ({v.school}) · {v.level} · {eat(v.at)}</li>)}</ul>
        )}
      </section>

      {!data.school?.isHead && (
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">Moving to another school</h2>
          {pending ? (
            <div className="space-y-2 text-sm"><p>Waiting for <b>{pending.to}</b> to accept your request (sent {eat(pending.createdAt)}).</p>
              <Button variant="outline" className="min-h-11" onClick={() => void cancel({ id: pending._id }).then(() => toast.success('Request cancelled'))}>Cancel request</Button></div>
          ) : (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void request({ code, message }).then((r) => { toast.success(`Request sent to ${r.school}`); setCode(''); setMessage('') }).catch((err) => toast.error(errorMessage(err, 'Not sent.'))) }}>
              <p className="text-sm text-muted-foreground">Ask the new school’s principal for their join code. When they accept, you move with your full history; your old school loses access.</p>
              <div className="space-y-1"><Label htmlFor="tr-code">New school’s code</Label><Input id="tr-code" className="min-h-11 uppercase" value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} /></div>
              <div className="space-y-1"><Label htmlFor="tr-msg">Message (optional)</Label><Input id="tr-msg" className="min-h-11" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} /></div>
              <Button type="submit" className="min-h-11" disabled={code.trim().length < 8}>Request transfer</Button>
            </form>
          )}
          {data.transfers.filter((t) => t.status !== 'pending').map((t) => <p key={t._id} className="text-xs text-muted-foreground">Request to {t.to}: {t.status} {t.decidedAt ? eat(t.decidedAt) : ''}</p>)}
        </section>
      )}
    </div>
  )
}
