'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { ChevronLeft, Clock, Eye } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { Button } from '@/components/ui/button'
import { Empty, Loading, Pill } from '@/components/admin/common'

export default function PreviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Preview />
    </Suspense>
  )
}

type Pick =
  | { kind: 'overview' }
  | { kind: 'lesson'; m: number; l: number }
  | { kind: 'quiz'; which: 'pre' | 'post' }
  | { kind: 'assignment' }

function Preview() {
  const { programKey } = useParams<{ programKey: string }>()
  const params = useSearchParams()
  const mode = params.get('mode') === 'published' ? 'published' : 'draft'
  const lang = params.get('lang') === 'sw' ? 'sw' : 'en'
  const device = (['phone', 'tablet'] as const).find((d) => d === params.get('device')) ?? 'desktop'
  const embed = params.get('embed') === '1'
  const router = useRouter()
  const program = useQuery(api.admin.content.preview, { programKey, mode, lang })
  const [pick, setPick] = useState<Pick | null>(null)
  const setQuery = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) v === null ? q.delete(k) : q.set(k, v)
    router.replace(`?${q.toString()}`, { scroll: false })
  }
  const [answers, setAnswers] = useState<Record<string, number>>({})

  if (program === undefined) return <Loading />
  if (program === null)
    return <Empty>This program has nothing {mode === 'published' ? 'published' : 'to preview'} yet.</Empty>

  // Phone and tablet views show this same page inside a frame that is really that wide, so the layout changes exactly
  // as it would on a device.
  if (device !== 'desktop' && !embed) {
    const q = new URLSearchParams(params.toString())
    q.set('embed', '1')
    const width = device === 'phone' ? 390 : 768
    return (
      <>
        <Link href={`/admin/content/${programKey}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" />Back to editing</Link>
        <Toolbar mode={mode} lang={lang} device={device} setQuery={setQuery} />
        <div className="flex justify-center overflow-x-auto pb-6">
          <iframe title={`Preview at ${width} pixels wide`} src={`?${q.toString()}`} className="rounded-[2rem] border-8 border-neutral-800 bg-background shadow-xl" style={{ width: width + 16, height: device === 'phone' ? 780 : 900 }} />
        </div>
      </>
    )
  }

  // Open the lesson the editor linked to (item=m1/l2) the first time.
  if (pick === null) {
    const [mk, lk] = (params.get('item') ?? '').split('/')
    const mi = program.modules.findIndex((m) => m.id === mk)
    const li = mi >= 0 ? program.modules[mi].lessons.findIndex((l) => l.id === lk) : -1
    setPick(mi >= 0 && li >= 0 ? { kind: 'lesson', m: mi, l: li } : { kind: 'overview' })
    return <Loading />
  }

  const lesson = pick.kind === 'lesson' ? program.modules[pick.m]?.lessons[pick.l] : null
  const quiz = pick.kind === 'quiz' ? (pick.which === 'pre' ? program.preAssessment : program.postAssessment) : null
  const btn = (active: boolean) =>
    `block w-full rounded-md px-3 py-1.5 text-left text-sm ${active ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`

  return (
    <>
      {!embed && (
        <>
          <Link href={`/admin/content/${programKey}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" />Back to editing</Link>
          <Toolbar mode={mode} lang={lang} device={device} setQuery={setQuery} />
        </>
      )}

      <div className={embed ? 'grid gap-4 p-3 md:grid-cols-[14rem_1fr]' : 'grid gap-6 lg:grid-cols-[16rem_1fr]'}>
        <nav aria-label="Program outline" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <button className={btn(pick.kind === 'overview')} onClick={() => setPick({ kind: 'overview' })}>
            Overview
          </button>
          {program.preAssessment.length > 0 && (
            <button
              className={btn(pick.kind === 'quiz' && pick.which === 'pre')}
              onClick={() => setPick({ kind: 'quiz', which: 'pre' })}
            >
              Pre-assessment
            </button>
          )}
          {program.modules.map((m, mi) => (
            <div key={m.id}>
              <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.title}</div>
              {m.lessons.map((l, li) => (
                <button
                  key={l.id}
                  className={btn(pick.kind === 'lesson' && pick.m === mi && pick.l === li)}
                  onClick={() => setPick({ kind: 'lesson', m: mi, l: li })}
                >
                  {l.title}
                </button>
              ))}
            </div>
          ))}
          {program.postAssessment.length > 0 && (
            <button
              className={btn(pick.kind === 'quiz' && pick.which === 'post')}
              onClick={() => setPick({ kind: 'quiz', which: 'post' })}
            >
              Post-assessment
            </button>
          )}
          <button className={btn(pick.kind === 'assignment')} onClick={() => setPick({ kind: 'assignment' })}>
            Assignment
          </button>
        </nav>

        <article className="min-w-0 rounded-2xl border bg-background p-6">
          {pick.kind === 'overview' && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{program.title}</h1>
              <p className="mt-1 text-muted-foreground">{program.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Pill>{program.track}</Pill>
                <Pill>{program.hours} hours</Pill>
                <Pill>{program.lessons} lessons</Pill>
                {!program.available && <Pill tone="amber">not available</Pill>}
                {program.launchingSoon && <Pill tone="amber">launching soon</Pill>}
              </div>
              <p className="mt-4 text-sm leading-relaxed">{program.description}</p>
              {(program.tags.cbcLevels.length > 0 ||
                program.tags.subjects.length > 0 ||
                program.tags.counties.length > 0) && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Tags: {[...program.tags.cbcLevels, ...program.tags.subjects, ...program.tags.counties].join(' · ')}
                </p>
              )}
              <h2 className="mt-6 font-semibold">Certificate</h2>
              <p className="text-sm">{program.certificate.subtitle}</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {program.certificate.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {lesson && (
            <>
              <div className="mb-1 text-xs text-muted-foreground">{program.modules[(pick as any).m].title}</div>
              <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {lesson.duration}
              </div>
              {lesson.videoTitle && <h2 className="mt-5 font-semibold">{lesson.videoTitle}</h2>}
              {lesson.videoPoints.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {lesson.videoPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
              <div className="mt-6">
                <MarkdownRenderer content={lesson.reading} article />
              </div>
              {lesson.reflectionPrompt && (
                <div className="mt-8 rounded-lg bg-muted/50 p-4">
                  <h2 className="font-semibold">Reflect</h2>
                  <p className="mt-1 text-sm">{lesson.reflectionPrompt}</p>
                  <textarea
                    aria-label="Reflection"
                    placeholder={lesson.reflectionPlaceholder}
                    rows={3}
                    className="mt-3 w-full rounded-md border bg-background p-2 text-sm"
                  />
                </div>
              )}
            </>
          )}
          {quiz && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                {pick.kind === 'quiz' && pick.which === 'pre' ? 'Pre-assessment' : 'Post-assessment'}
              </h1>
              <ol className="mt-4 space-y-6">
                {quiz.map((q, qi) => {
                  const chosen = answers[`${pick.kind === 'quiz' ? pick.which : ''}-${q.id}`]
                  return (
                    <li key={q.id}>
                      <p className="font-medium">
                        {qi + 1}. {q.question}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {q.options.map((o, oi) => {
                          const key = `${pick.kind === 'quiz' ? pick.which : ''}-${q.id}`
                          const shown = chosen !== undefined
                          return (
                            <button
                              key={oi}
                              onClick={() => setAnswers({ ...answers, [key]: oi })}
                              className={`block w-full rounded-md border p-2 text-left text-sm ${shown && oi === q.correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : shown && chosen === oi ? 'border-red-400 bg-red-50 dark:bg-red-950' : 'hover:bg-muted'}`}
                            >
                              {o}
                            </button>
                          )
                        })}
                      </div>
                      {chosen !== undefined && q.explanation && (
                        <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>
                      )}
                    </li>
                  )
                })}
              </ol>
            </>
          )}
          {pick.kind === 'assignment' && (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{program.assignment.title || 'Assignment'}</h1>
              <p className="mt-3 text-sm">{program.assignment.context}</p>
              <p className="mt-3 text-sm font-medium">{program.assignment.task}</p>
              {program.assignment.hints.length > 0 && (
                <>
                  <h2 className="mt-5 font-semibold">Hints</h2>
                  <ul className="list-disc pl-5 text-sm">
                    {program.assignment.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
              {program.assignment.rubric.length > 0 && (
                <>
                  <h2 className="mt-5 font-semibold">Rubric</h2>
                  <ul className="list-disc pl-5 text-sm">
                    {program.assignment.rubric.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </article>
      </div>
    </>
  )
}

function Toolbar({ mode, lang, device, setQuery }: { mode: 'draft' | 'published'; lang: 'en' | 'sw'; device: 'desktop' | 'tablet' | 'phone'; setQuery: (p: Record<string, string | null>) => void }) {
  const group = (label: string, items: [string, string][], current: string, key: string, off: string) => (
    <span role="group" aria-label={label} className="flex items-center gap-1">
      <span className="mr-1 text-xs">{label}</span>
      {items.map(([v, l]) => (
        <Button key={v} size="sm" variant={current === v ? 'secondary' : 'outline'} aria-pressed={current === v} onClick={() => setQuery({ [key]: v === off ? null : v })}>{l}</Button>
      ))}
    </span>
  )
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <span className="flex items-center gap-2"><Eye className="h-4 w-4" />Preview. Progress is not saved.</span>
      {group('Version', [['draft', 'Draft'], ['published', 'Live']], mode, 'mode', 'draft')}
      {group('Language', [['en', 'English'], ['sw', 'Kiswahili']], lang, 'lang', 'en')}
      {group('Screen', [['desktop', 'Desktop'], ['tablet', 'Tablet'], ['phone', 'Phone']], device, 'device', 'desktop')}
    </div>
  )
}
