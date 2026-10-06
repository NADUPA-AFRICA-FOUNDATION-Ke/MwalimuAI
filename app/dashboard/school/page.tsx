'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePrograms } from '@/context/content-context'
import { downloadXlsx } from '@/lib/admin/xlsx'
import { errorMessage } from '@/lib/support'

export default function SchoolPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <School />
    </Suspense>
  )
}

function School() {
  const me = useQuery(api.schools.mine, {})
  if (me === undefined) return <p className="text-sm text-muted-foreground">Loading…</p>
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">My school</h1>
      {me.state === 'none' && <JoinOrCreate canCreate={me.canCreate} />}
      {me.state === 'teacher' && <TeacherView name={me.school.name} />}
      {me.state === 'head' && <HeadView name={me.school.name} county={me.school.county} code={me.school.code ?? ''} />}
    </div>
  )
}

function JoinOrCreate({ canCreate }: { canCreate: boolean }) {
  const params = useSearchParams()
  const join = useMutation(api.schools.join)
  const create = useMutation(api.schools.create)
  const [code, setCode] = useState(params.get('code') ?? '')
  const [name, setName] = useState('')
  const [county, setCounty] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const go = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setError(null)
    try { await fn(); toast.success(ok) } catch (e) { setError(errorMessage(e, 'Something went wrong. Please try again.')) } finally { setBusy(false) }
  }
  return (
    <>
      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Join your school</h2>
        <p className="text-sm text-muted-foreground">Ask your head teacher for the school code. When you join, your head teacher can see your learning progress: lessons finished, certificates and when you were last active. They cannot see your journal, AI conversations, messages or contact details. You can leave at any time and they lose access at once.</p>
        <div className="space-y-2">
          <Label htmlFor="school-code">School code</Label>
          <Input id="school-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" className="min-h-11 max-w-xs font-mono tracking-widest" placeholder="ABCD2345" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="min-h-11" disabled={busy || code.trim().length < 8} onClick={() => go(async () => { const r = await join({ code }); toast.message(`Welcome to ${r.name}`) }, 'You joined your school')}>Join school</Button>
      </Card>
      {canCreate && (
        <Card className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">Set up your school</h2>
          <p className="text-sm text-muted-foreground">Your plan includes a school dashboard. Create the school, then share the code with your teachers.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="school-name">School name</Label><Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" /></div>
            <div className="space-y-2"><Label htmlFor="school-county">County (optional)</Label><Input id="school-county" value={county} onChange={(e) => setCounty(e.target.value)} className="min-h-11" /></div>
          </div>
          <Button className="min-h-11" disabled={busy || name.trim().length < 3} onClick={() => go(() => create({ name, county: county || undefined }), 'School created')}>Create school</Button>
        </Card>
      )}
    </>
  )
}

function TeacherView({ name }: { name: string }) {
  const leave = useMutation(api.schools.leave)
  const [confirm, setConfirm] = useState(false)
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="text-sm text-muted-foreground">You are a member of this school. Your head teacher can see your learning progress: lessons finished, certificates and when you were last active. They cannot see your journal, AI conversations, messages or contact details.</p>
      {confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Leave {name}? Your head teacher will stop seeing your progress.</span>
          <Button variant="destructive" className="min-h-11" onClick={() => void leave({}).then(() => toast.success('You left the school'))}>Yes, leave</Button>
          <Button variant="ghost" className="min-h-11" onClick={() => setConfirm(false)}>Stay</Button>
        </div>
      ) : (
        <Button variant="outline" className="min-h-11" onClick={() => setConfirm(true)}>Leave this school</Button>
      )}
    </Card>
  )
}

const day = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'Never')

function HeadView({ name, county, code }: { name: string; county: string | null; code: string }) {
  const sum = useQuery(api.schools.summary, {})
  const roster = usePaginatedQuery(api.schools.roster, {}, { initialNumItems: 25 })
  const regen = useMutation(api.schools.regenerateCode)
  const remove = useMutation(api.schools.removeMember)
  const { getProgramById } = usePrograms()
  const title = (id: string) => getProgramById(id)?.title ?? id
  const link = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/school?code=${code}` : ''
  const message = `Join ${name} on Mwalimu AI. Open ${link} or enter the school code ${code} under My school.`

  const exportXlsx = () => {
    const rows = roster.results
    downloadXlsx(`${name.replace(/[^\w]+/g, '-')}-teachers-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { name: 'Teachers', rows: [['Teacher', 'Subjects', 'Programs started', 'Programs completed', 'Lessons completed', 'Certificates', 'Active days (30)', 'Current streak', 'Last active'], ...rows.map((r) => [r.name, r.subjects.join(', '), r.programsStarted, r.programsCompleted, r.lessonsCompleted, r.certificates, r.activeDays30, r.streak, r.lastActiveDate ?? ''])] },
      { name: 'Programs', rows: [['Program', 'Teachers who started', 'Completed', 'Lessons completed'], ...(sum?.programs ?? []).map((p) => [title(p.programId), p.started, p.completed, p.lessons])] },
    ])
  }

  return (
    <>
      <p className="-mt-3 text-muted-foreground">{name}{county ? ` · ${county}` : ''}</p>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold">Invite your teachers</h2>
        <p className="text-sm text-muted-foreground">Share this code. Teachers enter it under My school. They can leave at any time.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border bg-muted px-4 py-2 font-mono text-xl tracking-widest" aria-label={`School code ${code.split('').join(' ')}`}>{code}</span>
          <Button variant="outline" className="min-h-11" onClick={() => void navigator.clipboard?.writeText(message).then(() => toast.success('Invitation copied'))}><Copy className="mr-2 h-4 w-4" />Copy invitation</Button>
          <Button asChild variant="outline" className="min-h-11"><a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><Share2 className="mr-2 h-4 w-4" />WhatsApp</a></Button>
          <Button variant="ghost" className="min-h-11" onClick={() => { if (window.confirm('Make a new code? The old code stops working. Teachers already in the school stay.')) void regen({}).then(() => toast.success('New code created')) }}>New code</Button>
        </div>
      </Card>

      {sum && (
        <section aria-labelledby="school-summary" className="space-y-3">
          <h2 id="school-summary" className="sr-only">School summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Teachers', sum.teachers], ['Active this week', sum.activeLast7Days], ['Lessons finished', sum.lessonsCompleted], ['Certificates', sum.certificates]].map(([label, n]) => (
              <Card key={String(label)} className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{n}</p></Card>
            ))}
          </div>
          {sum.programs.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-semibold">What your teachers are learning</h3>
              <ul className="divide-y text-sm">
                {sum.programs.map((p) => (
                  <li key={p.programId} className="flex flex-wrap justify-between gap-2 py-2"><span>{title(p.programId)}</span><span className="text-muted-foreground">{p.started} started · {p.completed} completed</span></li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}

      <section aria-labelledby="roster-h" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="roster-h" className="text-lg font-semibold">Teachers</h2>
          <Button variant="outline" className="min-h-11" disabled={roster.results.length === 0} onClick={exportXlsx}>Download Excel report</Button>
        </div>
        {roster.status === 'LoadingFirstPage' ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground"><tr><th scope="col" className="p-3">Teacher</th><th scope="col" className="p-3">Lessons</th><th scope="col" className="p-3">Programs</th><th scope="col" className="p-3">Certificates</th><th scope="col" className="p-3">Streak</th><th scope="col" className="p-3">Last active</th><th scope="col" className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y">
                {roster.results.map((r) => (
                  <tr key={r.profileId}>
                    <td className="p-3 font-medium">{r.name}{r.role === 'head' && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</td>
                    <td className="p-3">{r.lessonsCompleted}</td>
                    <td className="p-3">{r.programsCompleted}/{r.programsStarted}</td>
                    <td className="p-3">{r.certificates}</td>
                    <td className="p-3">{r.streak}</td>
                    <td className="p-3">{day(r.lastActiveDate)}</td>
                    <td className="p-3 text-right">{r.role !== 'head' && <Button size="sm" variant="ghost" className="min-h-11" onClick={() => { if (window.confirm(`Remove ${r.name} from the school?`)) void remove({ profileId: r.profileId as Id<'profiles'> }).then(() => toast.success('Removed')) }}>Remove</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {roster.status === 'CanLoadMore' && <Button variant="outline" className="min-h-11" onClick={() => roster.loadMore(25)}>Show more</Button>}
        <p className="text-xs text-muted-foreground">You see learning progress only. Teachers’ journals, AI conversations, messages and contact details are private.</p>
      </section>
    </>
  )
}
