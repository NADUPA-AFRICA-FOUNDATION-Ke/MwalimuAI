'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentPicker, type Uploaded } from '@/components/support/attachments'
import { usePrograms } from '@/context/content-context'
import { CBC_LEVELS, KIND_LABEL, SKILL_AREAS, fromEatInput, toEatInput } from '@/lib/school'
import { errorMessage } from '@/lib/support'

type Kind = keyof typeof KIND_LABEL
const select = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm'
const blankCriterion = () => ({ criterion: '', levels: ['', '', '', ''] })

export default function NewAssignmentPage() {
  const router = useRouter()
  const me = useQuery(api.schoolPortal.me, {})
  const depts = useQuery(api.schoolPortal.departments, {})
  const staff = useQuery(api.schoolPortal.staff, me?.manager ? {} : 'skip')
  const paths = useQuery(api.schoolPortal.paths, {})
  const create = useMutation(api.schoolPortal.createAssignment)
  const uploadUrl = useMutation(api.schoolPortal.uploadUrl)
  const { programs } = usePrograms()
  const [now] = useState(() => Date.now())
  const [kind, setKind] = useState<Kind>('module')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [objectives, setObjectives] = useState('')
  const [skillArea, setSkillArea] = useState(SKILL_AREAS[0])
  const [target, setTarget] = useState('')
  const [instructions, setInstructions] = useState('')
  const [rubric, setRubric] = useState([blankCriterion()])
  const [files, setFiles] = useState<Uploaded[]>([])
  const [opensAt, setOpensAt] = useState(() => toEatInput(now))
  const [dueAt, setDueAt] = useState(() => toEatInput(now + 7 * 86_400_000).slice(0, 11) + '17:00')
  const [grace, setGrace] = useState(0)
  const [mandatory, setMandatory] = useState(true)
  const [resubmit, setResubmit] = useState(true)
  const [audience, setAudience] = useState<'all' | 'department' | 'teachers'>('all')
  const [deptId, setDeptId] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (me === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>
  if (!me?.manager) return <p className="text-sm">Only your principal, or a deputy or head of department they authorise, can create assignments.</p>
  const hod = me.role === 'hod'

  function modules() {
    if (kind === 'task') return []
    if (kind === 'path') { const p = paths?.find((x) => x._id === target); return p ? p.items : [] }
    const [programId, moduleKey] = target.split('|')
    if (!programId) return []
    return [moduleKey ? { programId, moduleKey } : { programId }]
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      const r = await create({
        title, description, skillArea, kind, modules: modules(), mandatory, graceMinutes: grace, allowResubmit: resubmit,
        objectives: objectives.split('\n').map((o) => o.trim()).filter(Boolean),
        opensAt: fromEatInput(opensAt), dueAt: fromEatInput(dueAt),
        ...(kind === 'task' ? { taskInstructions: instructions, rubric } : {}),
        ...(files.length ? { attachments: files } : {}),
        audience: hod ? { kind: 'department' } : audience === 'all' ? { kind: 'all' } : audience === 'department' ? { kind: 'department', departmentId: deptId as Id<'departments'> } : { kind: 'teachers', profileIds: picked as Id<'profiles'>[] },
      })
      toast.success(`Assigned to ${r.teachers} teacher${r.teachers === 1 ? '' : 's'}. They have been notified.`)
      router.push(`/dashboard/school/assignments/${r.id}`)
    } catch (err) {
      setError(errorMessage(err, 'Not created. Check the form and try again.')); setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/dashboard/school" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />My school</Link>
      <h1 className="text-2xl font-bold">New assignment</h1>
      <form onSubmit={submit} className="space-y-5">
        <fieldset className="space-y-3 rounded-2xl border bg-card p-4">
          <legend className="px-1 font-semibold">What</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Type">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <label key={k} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-sm ${kind === k ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}`}>
                <input type="radio" name="kind" className="sr-only" checked={kind === k} onChange={() => { setKind(k); setTarget('') }} />{KIND_LABEL[k]}
              </label>
            ))}
          </div>
          {kind !== 'task' && (
            <label className="block space-y-1 text-sm"><span>{kind === 'path' ? 'School path' : kind === 'assessment' ? 'Learning path whose final assessment they take' : 'Module from the library'}</span>
              <select className={select} value={target} onChange={(e) => setTarget(e.target.value)} required>
                <option value="">Choose…</option>
                {kind === 'path' ? paths?.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)
                  : kind === 'assessment' ? programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)
                  : programs.map((p) => <optgroup key={p.id} label={p.title}><option value={p.id}>Whole path: {p.title}</option>{p.modules.map((m) => <option key={m.id} value={`${p.id}|${m.id}`}>{m.title}</option>)}</optgroup>)}
              </select>
              {kind === 'path' && paths?.length === 0 && <span className="text-xs text-muted-foreground">Create a path first in the Paths tab.</span>}
            </label>
          )}
          <div className="space-y-1"><Label htmlFor="a-title">Title</Label><Input id="a-title" className="min-h-11" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required /></div>
          <div className="space-y-1"><Label htmlFor="a-desc">Why this matters (optional)</Label><Textarea id="a-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></div>
          <div className="space-y-1"><Label htmlFor="a-obj">Objectives, one per line (optional)</Label><Textarea id="a-obj" rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} /></div>
          <label className="block space-y-1 text-sm"><span>Skill area</span><select className={select} value={skillArea} onChange={(e) => setSkillArea(e.target.value)}>{SKILL_AREAS.map((s) => <option key={s}>{s}</option>)}</select></label>
          {kind === 'task' && (
            <>
              <div className="space-y-1"><Label htmlFor="a-inst">What the teacher must submit</Label><Textarea id="a-inst" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} required placeholder="e.g. Upload one lesson plan using a learner-centred activity, with a photo of the learners’ work (no faces)." /></div>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Rubric (CBC levels)</legend>
                {rubric.map((r, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
                    <div className="flex gap-2"><label className="flex-1"><span className="sr-only">Criterion {i + 1}</span><Input className="min-h-11" placeholder={`Criterion ${i + 1}`} value={r.criterion} onChange={(e) => setRubric((x) => x.map((c, k) => (k === i ? { ...c, criterion: e.target.value } : c)))} /></label>
                      {rubric.length > 1 && <Button type="button" variant="ghost" className="min-h-11" onClick={() => setRubric((x) => x.filter((_, k) => k !== i))}>Remove</Button>}</div>
                    <div className="grid gap-2 sm:grid-cols-2">{CBC_LEVELS.map((l, j) => (
                      <label key={l} className="space-y-1 text-xs"><span>{l}</span><Input className="min-h-11" value={r.levels[j]} onChange={(e) => setRubric((x) => x.map((c, k) => (k === i ? { ...c, levels: c.levels.map((d, m) => (m === j ? e.target.value : d)) } : c)))} /></label>
                    ))}</div>
                  </div>
                ))}
                {rubric.length < 10 && <Button type="button" variant="outline" className="min-h-11" onClick={() => setRubric((x) => [...x, blankCriterion()])}>Add criterion</Button>}
              </fieldset>
            </>
          )}
          <AttachmentPicker getUploadUrl={() => uploadUrl({})} onChange={setFiles} disabled={busy} />
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border bg-card p-4">
          <legend className="px-1 font-semibold">Who</legend>
          {hod ? <p className="text-sm">Everyone in {me.department?.name ?? 'your department'}.</p> : (
            <>
              <select aria-label="Audience" className={select} value={audience} onChange={(e) => setAudience(e.target.value as 'all')}>
                <option value="all">All teachers</option><option value="department">One department</option><option value="teachers">Chosen teachers</option>
              </select>
              {audience === 'department' && <select aria-label="Department" className={select} value={deptId} onChange={(e) => setDeptId(e.target.value)} required><option value="">Choose…</option>{depts?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>}
              {audience === 'teachers' && <div className="max-h-60 space-y-1 overflow-y-auto">{staff?.map((s) => (
                <label key={s.profileId} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(s.profileId)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, s.profileId] : x.filter((p) => p !== s.profileId)))} />{s.name}</label>
              ))}</div>}
            </>
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border bg-card p-4">
          <legend className="px-1 font-semibold">When (Kenya time)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Opens</span><Input type="datetime-local" className="min-h-11" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} required /></label>
            <label className="space-y-1 text-sm"><span>Due</span><Input type="datetime-local" className="min-h-11" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required /></label>
          </div>
          <label className="block space-y-1 text-sm"><span>Grace period after the due time</span>
            <select className={select} value={grace} onChange={(e) => setGrace(Number(e.target.value))}>{[[0, 'None: close exactly at the due time'], [60, '1 hour'], [360, '6 hours'], [1440, '1 day'], [4320, '3 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <span className="text-xs text-muted-foreground">Work submitted in the grace period is accepted but marked late. After it, submission is refused.</span>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />Mandatory</label>
          {kind === 'task' && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={resubmit} onChange={(e) => setResubmit(e.target.checked)} />Allow resubmission after feedback (before the deadline)</label>}
        </fieldset>

        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={busy}>{busy ? 'Assigning…' : 'Assign and notify teachers'}</Button>
      </form>
    </div>
  )
}
