'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, ChevronRight, Download, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MyWork } from '@/components/school/my-work'
import { usePrograms } from '@/context/content-context'
import { printPDF } from '@/lib/print-pdf'
import { KIND_LABEL, ROLE_LABEL, eat, eatDay, fromEatInput, toEatInput } from '@/lib/school'
import { errorMessage } from '@/lib/support'

const select = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm'
type Tab = 'work' | 'overview' | 'assignments' | 'staff' | 'paths' | 'settings' | 'log'

/** The My School portal. Tabs follow the person's role; the server re-checks every one of them. */
export function SchoolPortal() {
  const me = useQuery(api.schoolPortal.me, {})
  const [tab, setTab] = useState<Tab | null>(null)
  if (me === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>
  if (me === null) return null
  const tabs: { id: Tab; label: string }[] = [
    ...(me.manager ? [{ id: 'overview' as const, label: 'Overview' }, { id: 'assignments' as const, label: 'Assignments' }] : []),
    { id: 'work', label: 'My work' },
    ...(me.manager ? [{ id: 'staff' as const, label: 'Staff' }, { id: 'paths' as const, label: 'Paths' }] : []),
    ...(me.isPrincipal ? [{ id: 'settings' as const, label: 'Departments & term' }, { id: 'log' as const, label: 'Activity log' }] : []),
  ]
  const active = tab ?? tabs[0].id
  return (
    <section aria-label="School portal" className="space-y-4">
      <p className="text-sm text-muted-foreground">You are <b>{ROLE_LABEL[me.role]}</b>{me.department ? ` · ${me.department.name}` : ''}{me.role !== 'head' && me.manager ? ' · may assign work' : ''}.</p>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="School sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setTab(t.id)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${active === t.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>{t.label}</button>
          ))}
        </div>
      )}
      <div role="tabpanel">
        {active === 'work' && <MyWork />}
        {active === 'overview' && <Overview />}
        {active === 'assignments' && <Assignments />}
        {active === 'staff' && <Staff isPrincipal={me.isPrincipal} />}
        {active === 'paths' && <Paths />}
        {active === 'settings' && <Settings />}
        {active === 'log' && <Log />}
      </div>
    </section>
  )
}

function Overview() {
  const depts = useQuery(api.schoolPortal.departments, {})
  const [dept, setDept] = useState('')
  const [skill, setSkill] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const data = useQuery(api.schoolPortal.overview, {
    ...(dept ? { departmentId: dept as Id<'departments'> } : {}), ...(skill ? { skillArea: skill } : {}),
    ...(from ? { from: fromEatInput(`${from}T00:00`) } : {}), ...(to ? { to: fromEatInput(`${to}T23:59`) } : {}),
  })
  if (data === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading the overview…</p>

  function exportPdf() {
    if (!data) return
    const rows = data.teachers.map((t) => `| ${t.name} | ${t.assigned} | ${t.completed} | ${t.onTimeRate ?? '–'}${t.onTimeRate !== null ? '%' : ''} | ${t.overdue} | ${t.avgScore ?? '–'} | ${t.avgRating ?? '–'} |`).join('\n')
    const skills = data.skills.map((s) => `| ${s.skill} | ${s.completion}% | ${s.avgRating ?? '–'} | ${s.avgScore ?? '–'} |`).join('\n')
    void printPDF({
      title: 'School professional development report', subtitle: `Generated ${eat(Date.now())}`, type: 'default',
      content: `## Summary\n\n- Completion rate: ${data.completionRate ?? '–'}%\n- Overdue items: ${data.overdue}\n- Teachers active in the last 14 days: ${data.activeTeachers}\n${data.needSupport.length ? `- May need support: ${data.needSupport.join(', ')}\n` : ''}\n## Teachers\n\n| Teacher | Assigned | Completed | On time | Overdue | Avg score | Avg rating (1–4) |\n|---|---|---|---|---|---|---|\n${rows}\n\n## Skill areas\n\n| Skill area | Completion | Avg rating | Avg score |\n|---|---|---|---|\n${skills}\n`,
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="space-y-1 text-xs"><span>Department</span><select className={select} value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{depts?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></label>
        <label className="space-y-1 text-xs"><span>Skill area</span><select className={select} value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">All</option>{data.skillAreas.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="space-y-1 text-xs"><span>Due from</span><Input type="date" className="min-h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="space-y-1 text-xs"><span>Due to</span><Input type="date" className="min-h-11" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[{ l: 'Completion', v: data.completionRate === null ? '–' : `${data.completionRate}%` }, { l: 'Overdue', v: data.overdue, alert: data.overdue > 0 }, { l: 'Active (14 days)', v: data.activeTeachers }].map((c) => (
          <div key={c.l} className={`rounded-2xl border p-3 ${c.alert ? 'border-destructive bg-destructive/5' : 'bg-card'}`}><div className={`text-2xl font-bold ${c.alert ? 'text-destructive' : ''}`}>{c.v}</div><div className="text-xs text-muted-foreground">{c.l}</div></div>
        ))}
      </div>
      {data.needSupport.length > 0 && <p className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />May need support: {data.needSupport.join(', ')}</p>}
      <div className="flex justify-end"><Button variant="outline" className="min-h-11 gap-2" onClick={exportPdf} disabled={data.teachers.length === 0}><Download className="h-4 w-4" aria-hidden="true" />Download PDF report</Button></div>
      {data.teachers.length === 0 ? <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No teachers in this view yet.</p> : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Teachers</caption>
            <thead className="text-xs text-muted-foreground"><tr><th scope="col" className="p-3">Teacher</th><th scope="col" className="p-3">Done</th><th scope="col" className="p-3">On time</th><th scope="col" className="p-3">Overdue</th><th scope="col" className="p-3">Score</th><th scope="col" className="p-3">Rating</th><th scope="col" className="p-3">Last active</th></tr></thead>
            <tbody className="divide-y">{data.teachers.map((t) => (
              <tr key={t.profileId}><th scope="row" className="p-3 font-medium">{t.name}</th><td className="p-3">{t.completed}/{t.assigned}</td><td className="p-3">{t.onTimeRate === null ? '–' : `${t.onTimeRate}%`}</td><td className={`p-3 ${t.overdue ? 'font-semibold text-destructive' : ''}`}>{t.overdue}</td><td className="p-3">{t.avgScore ?? '–'}</td><td className="p-3">{t.avgRating ?? '–'}</td><td className="p-3">{t.lastActive ?? 'Never'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data.skills.length > 0 && (
        <section><h3 className="mb-2 font-semibold">Skill areas</h3>
          <ul className="space-y-2">{data.skills.map((s) => (
            <li key={s.skill} className="text-sm"><div className="flex justify-between"><span>{s.skill}</span><span>{s.completion}%</span></div><div className="mt-1 h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={s.completion} aria-valuemin={0} aria-valuemax={100} aria-label={s.skill}><div className="h-2 rounded-full bg-primary" style={{ width: `${s.completion}%` }} /></div></li>
          ))}</ul>
        </section>
      )}
      {data.recent.length > 0 && <section><h3 className="mb-2 font-semibold">Recent completions</h3><ul className="space-y-1 text-sm">{data.recent.map((r, i) => <li key={i}><span className="text-muted-foreground">{eatDay(r.at)}</span> · {r.text}</li>)}</ul></section>}
    </div>
  )
}

function Assignments() {
  const list = useQuery(api.schoolPortal.assignments, {})
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button asChild className="min-h-11 gap-2"><Link href="/dashboard/school/assignments/new"><Plus className="h-4 w-4" aria-hidden="true" />New assignment</Link></Button></div>
      {list === undefined ? <p role="status" className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No assignments yet. Assign a module, an assessment or a practical task to your teachers.</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">{list.map((a) => {
          const done = (a.counts.submitted ?? 0) + (a.counts.late ?? 0) + (a.counts.reviewed ?? 0) + (a.counts.returned ?? 0)
          const overdue = (a.counts.overdue ?? 0) + (a.counts.invalid ?? 0)
          return (
            <li key={a._id}><Link href={`/dashboard/school/assignments/${a._id}`} className="flex min-h-14 items-center justify-between gap-3 p-4 hover:bg-muted/50">
              <div className="min-w-0"><p className="truncate font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{KIND_LABEL[a.kind]} · due {eat(a.dueAt)} · {done}/{a.total} done{overdue ? <span className="font-semibold text-destructive"> · {overdue} overdue</span> : null}{a.counts.submitted && a.kind === 'task' ? ` · ${a.counts.submitted} to review` : ''}</p></div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link></li>
          )
        })}</ul>
      )}
    </div>
  )
}

function Staff({ isPrincipal }: { isPrincipal: boolean }) {
  const staff = useQuery(api.schoolPortal.staff, {})
  const depts = useQuery(api.schoolPortal.departments, {})
  const setMember = useMutation(api.schoolPortal.setMember)
  if (staff === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>
  async function save(memberId: Id<'schoolMembers'>, role: 'deputy' | 'hod' | 'teacher', departmentId: string | null, canAssign: boolean) {
    try { await setMember({ memberId, role, departmentId: departmentId ? (departmentId as Id<'departments'>) : null, canAssign }); toast.success('Saved') }
    catch (e) { toast.error(errorMessage(e, 'Not saved.')) }
  }
  return (
    <ul className="divide-y rounded-2xl border bg-card">{staff.map((m) => (
      <li key={m.memberId} className="space-y-2 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.completed}/{m.assigned} done{m.overdue ? <span className="font-semibold text-destructive"> · {m.overdue} overdue</span> : null}</p></div>
        {isPrincipal && m.role !== 'head' ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs"><span className="sr-only">Role for {m.name}</span><select className={select} value={m.role} onChange={(e) => void save(m.memberId, e.target.value as 'teacher', m.department?._id ?? null, m.canAssign)}>{(['teacher', 'hod', 'deputy'] as const).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
            <label className="text-xs"><span className="sr-only">Department for {m.name}</span><select className={select} value={m.department?._id ?? ''} onChange={(e) => void save(m.memberId, m.role as 'teacher', e.target.value || null, m.canAssign)}><option value="">No department</option>{depts?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></label>
            {m.role !== 'teacher' && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={m.canAssign} onChange={(e) => void save(m.memberId, m.role as 'hod', m.department?._id ?? null, e.target.checked)} />May assign work</label>}
          </div>
        ) : <p className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}{m.department ? ` · ${m.department.name}` : ''}</p>}
      </li>
    ))}</ul>
  )
}

function Paths() {
  const paths = useQuery(api.schoolPortal.paths, {})
  const save = useMutation(api.schoolPortal.savePath)
  const { programs, getProgramById } = usePrograms()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [items, setItems] = useState<{ programId: string; moduleKey: string }[]>([])
  const [pick, setPick] = useState('')
  async function create(e: React.FormEvent) {
    e.preventDefault()
    try { await save({ title, description: desc, items }); setTitle(''); setDesc(''); setItems([]); toast.success('Path saved') }
    catch (err) { toast.error(errorMessage(err, 'Not saved.')) }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">A path is your school’s own sequence of library modules. Assign it like any module.</p>
      {paths?.length ? <ul className="divide-y rounded-2xl border bg-card">{paths.map((p) => <li key={p._id} className="p-4"><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.items.map((i) => getProgramById(i.programId)?.modules.find((m) => m.id === i.moduleKey)?.title ?? i.moduleKey).join(' → ')}</p></li>)}</ul> : null}
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-4">
        <h3 className="font-semibold">New path</h3>
        <div className="space-y-1"><Label htmlFor="p-title">Title</Label><Input id="p-title" className="min-h-11" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <div className="space-y-1"><Label htmlFor="p-desc">Description</Label><Input id="p-desc" className="min-h-11" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} /></div>
        <div className="flex gap-2"><label className="flex-1"><span className="sr-only">Module to add</span><select className={select} value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Choose a module…</option>{programs.map((p) => <optgroup key={p.id} label={p.title}>{p.modules.map((m) => <option key={m.id} value={`${p.id}|${m.id}`}>{m.title}</option>)}</optgroup>)}</select></label>
          <Button type="button" variant="outline" className="min-h-11" disabled={!pick} onClick={() => { const [programId, moduleKey] = pick.split('|'); setItems((x) => [...x, { programId, moduleKey }]); setPick('') }}>Add</Button></div>
        {items.length > 0 && <ol className="list-decimal pl-5 text-sm">{items.map((i, n) => <li key={n}>{getProgramById(i.programId)?.modules.find((m) => m.id === i.moduleKey)?.title} <button type="button" className="ml-2 text-xs text-destructive underline" onClick={() => setItems((x) => x.filter((_, k) => k !== n))}>Remove</button></li>)}</ol>}
        <Button type="submit" className="min-h-11" disabled={title.trim().length < 3 || items.length === 0}>Save path</Button>
      </form>
    </div>
  )
}

function Settings() {
  const depts = useQuery(api.schoolPortal.departments, {})
  const settings = useQuery(api.schoolPortal.settings, {})
  const saveDept = useMutation(api.schoolPortal.saveDepartment)
  const delDept = useMutation(api.schoolPortal.deleteDepartment)
  const saveTerm = useMutation(api.schoolPortal.saveTerm)
  const [name, setName] = useState('')
  const [term, setTerm] = useState<{ n: string; s: string; e: string } | null>(null)
  const t = term ?? { n: settings?.termName ?? '', s: settings?.termStart ? toEatInput(settings.termStart).slice(0, 10) : '', e: settings?.termEnd ? toEatInput(settings.termEnd).slice(0, 10) : '' }
  const run = async (f: () => Promise<unknown>, msg: string) => { try { await f(); toast.success(msg) } catch (e) { toast.error(errorMessage(e, 'Not saved.')) } }
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h3 className="font-semibold">Departments</h3>
        <ul className="space-y-1 text-sm">{depts?.map((d) => <li key={d._id} className="flex items-center justify-between"><span>{d.name}</span><Button size="sm" variant="ghost" onClick={() => void run(() => delDept({ id: d._id }), 'Department removed')}>Remove</Button></li>)}</ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(() => saveDept({ name }), 'Department added').then(() => setName('')) }}>
          <label className="flex-1"><span className="sr-only">Department name</span><Input className="min-h-11" placeholder="e.g. Languages" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
          <Button type="submit" className="min-h-11" disabled={name.trim().length < 2}>Add</Button>
        </form>
      </section>
      <form className="space-y-3 rounded-2xl border bg-card p-4" onSubmit={(e) => { e.preventDefault(); void run(() => saveTerm({ termName: t.n, termStart: fromEatInput(`${t.s}T00:00`), termEnd: fromEatInput(`${t.e}T23:59`) }), 'Term saved') }}>
        <h3 className="font-semibold">Current term</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs"><span>Name</span><Input className="min-h-11" value={t.n} onChange={(e) => setTerm({ ...t, n: e.target.value })} placeholder="Term 3 2026" /></label>
          <label className="space-y-1 text-xs"><span>Starts</span><Input type="date" className="min-h-11" value={t.s} onChange={(e) => setTerm({ ...t, s: e.target.value })} /></label>
          <label className="space-y-1 text-xs"><span>Ends</span><Input type="date" className="min-h-11" value={t.e} onChange={(e) => setTerm({ ...t, e: e.target.value })} /></label>
        </div>
        <Button type="submit" className="min-h-11" disabled={!t.n || !t.s || !t.e}>Save term</Button>
      </form>
    </div>
  )
}

function Log() {
  const log = useQuery(api.schoolPortal.schoolLog, {})
  if (log === undefined) return <p role="status" className="text-sm text-muted-foreground">Loading…</p>
  if (log.length === 0) return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing recorded yet. Assignments, extensions, reviews and role changes appear here.</p>
  return <ul className="divide-y rounded-2xl border bg-card text-sm">{log.map((r) => <li key={r._id} className="p-3"><p><b>{r.actor}</b> · {r.action.replace('.', ' ')} · {r.targetLabel}</p>{r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}<p className="text-xs text-muted-foreground">{eat(r.at)}</p></li>)}</ul>
}

