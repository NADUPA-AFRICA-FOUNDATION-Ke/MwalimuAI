'use client'

import type { FunctionReturnType } from 'convex/server'
import { Award, BookOpen, ClipboardCheck } from 'lucide-react'
import type { api } from '@/convex/_generated/api'
import { StatusPill } from '@/components/school/status-pill'
import { printPDF } from '@/lib/print-pdf'
import { KIND_LABEL, STATUS_LABEL, eat, eatDay } from '@/lib/school'

export type TeacherRecord = FunctionReturnType<typeof api.teacherRecord.openTeacher>

/** A teacher's professional record. The server decides how much is in it (summary or full). */
export function RecordView({ record }: { record: TeacherRecord }) {
  const full = record.level === 'full'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[{ l: 'Certificates', v: record.certificates.length }, { l: 'Lessons completed', v: record.lessonsCompleted }, { l: 'Active days', v: record.activeDays }].map((c) => (
          <div key={c.l} className="rounded-2xl border bg-card p-3"><div className="text-2xl font-bold">{c.v}</div><div className="text-xs text-muted-foreground">{c.l}</div></div>
        ))}
      </div>
      {(record.subjects.length > 0 || record.skills.length > 0) && (
        <p className="text-sm">{record.subjects.length > 0 && <>Teaches <b>{record.subjects.join(', ')}</b>. </>}{record.skills.length > 0 && <>Evidence in: {record.skills.join(', ')}.</>}</p>
      )}
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold"><Award className="h-4 w-4 text-primary" aria-hidden="true" />Certificates</h3>
        {record.certificates.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <ul className="space-y-1 text-sm">{record.certificates.map((c) => <li key={c.serial}>{c.title} · {eatDay(c.earnedAt)} · <a className="text-primary underline" href={`/verify/${c.serial}`}>{c.serial}</a></li>)}</ul>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />Learning paths</h3>
        {record.programs.length === 0 ? <p className="text-sm text-muted-foreground">None started.</p> : (
          <ul className="space-y-1 text-sm">{record.programs.map((p) => (
            <li key={p.programId}>{p.title} · {p.lessons}{p.totalLessons ? `/${p.totalLessons}` : ''} lessons{p.completedAt ? ' · completed' : ''}
              {full && 'pre' in p && (p.pre !== null || p.post !== null) ? ` · assessment ${p.pre ?? '–'}% → ${p.post ?? '–'}%` : ''}</li>
          ))}</ul>
        )}
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />School professional development</h3>
        {record.work.length === 0 ? <p className="text-sm text-muted-foreground">{full ? 'No school assignments yet.' : 'No completed school assignments yet.'}</p> : (
          <ul className="divide-y text-sm">{record.work.map((w, i) => (
            <li key={i} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{w.title}</span><StatusPill status={w.status} /></div>
              <p className="text-xs text-muted-foreground">{KIND_LABEL[w.kind]} · {w.skillArea} · {w.school} · due {eatDay(w.dueAt)}{w.score !== null ? ` · ${w.score}%` : ''}{w.rating !== null ? ` · rating ${w.rating}/4` : ''}</p>
              {full && 'feedback' in w && w.feedback && <p className="mt-1 text-xs italic">“{w.feedback}”</p>}
            </li>
          ))}</ul>
        )}
      </section>
      {!full && <p className="text-xs text-muted-foreground">This is the summary. Assessment scores, unfinished work and feedback are shown only if the teacher shares their full record.</p>}
    </div>
  )
}

function markdown(r: TeacherRecord) {
  const certs = r.certificates.map((c) => `| ${c.title} | ${eatDay(c.earnedAt)} | ${c.serial} |`).join('\n')
  const paths = r.programs.map((p) => `| ${p.title} | ${p.lessons}${p.totalLessons ? `/${p.totalLessons}` : ''} | ${p.completedAt ? 'Completed' : 'In progress'} | ${'pre' in p ? `${p.pre ?? '–'}% → ${p.post ?? '–'}%` : '–'} |`).join('\n')
  const work = r.work.map((w) => `| ${w.title} | ${w.skillArea} | ${w.school} | ${STATUS_LABEL[w.status]} | ${w.rating ?? w.score ?? '–'} |`).join('\n')
  return { certs, paths, work }
}

export function downloadProfile(r: TeacherRecord) {
  const m = markdown(r)
  void printPDF({
    title: `Professional record: ${r.name}`, subtitle: r.subjects.length ? `Subjects: ${r.subjects.join(', ')}` : undefined, meta: `Generated ${eat(Date.now())}`,
    content: `## Summary\n\n- Certificates: ${r.certificates.length}\n- Lessons completed: ${r.lessonsCompleted}\n- Active learning days: ${r.activeDays}\n${r.skills.length ? `- Evidence in: ${r.skills.join(', ')}\n` : ''}\n## Certificates\n\n${m.certs ? `| Certificate | Earned | Serial |\n|---|---|---|\n${m.certs}` : 'None yet.'}\n\nCertificates can be checked on the verify page using the serial.\n\n## Learning paths\n\n${m.paths ? `| Path | Lessons | Status | Assessment |\n|---|---|---|---|\n${m.paths}` : 'None started.'}\n\n## School professional development\n\n${m.work ? `| Assignment | Skill area | School | Status | Rating / score |\n|---|---|---|---|---|\n${m.work}` : 'None yet.'}\n`,
  })
}

/**
 * Evidence grouped the way a teacher prepares for TPAD appraisal: professional development undertaken, with
 * dates and outcomes. It is the teacher's own summary, not an official TSC document.
 */
export function downloadTpad(r: TeacherRecord) {
  const done = r.work.filter((w) => w.status === 'reviewed' || w.status === 'submitted' || w.status === 'late')
  const bySkill = new Map<string, string[]>()
  for (const w of done) bySkill.set(w.skillArea, [...(bySkill.get(w.skillArea) ?? []), `${w.title} (${w.school}, ${eatDay(w.dueAt)}${w.rating !== null ? `, rated ${w.rating}/4` : ''})`])
  const certs = r.certificates.map((c) => `- ${c.title}, earned ${eatDay(c.earnedAt)} (serial ${c.serial})`).join('\n')
  void printPDF({
    title: `Professional development evidence: ${r.name}`, subtitle: 'Summary to support TPAD appraisal (prepared by the teacher)', meta: `Generated ${eat(Date.now())}. Not an official TSC document.`,
    content: `## Teacher professional development undertaken\n\n${certs || 'No certificates yet.'}\n\n## Evidence by area\n\n${[...bySkill.entries()].map(([k, xs]) => `### ${k}\n\n${xs.map((x) => `- ${x}`).join('\n')}`).join('\n\n') || 'No assessed school work yet.'}\n\n## Learning activity\n\n- Lessons completed: ${r.lessonsCompleted}\n- Active learning days: ${r.activeDays}\n`,
  })
}
