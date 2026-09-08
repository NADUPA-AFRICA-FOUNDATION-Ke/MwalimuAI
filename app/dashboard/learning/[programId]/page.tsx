'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProgramById, getTotalLessons, TRACKS } from '@/lib/learning-paths-data'
import {
  getProgress, getProgramCompletionPct, isProgramComplete,
  isLessonComplete, joinCohort, type ProgramProgress,
} from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle,
  PlayCircle, ClipboardList, Award, Users,
  BookOpen, Clock, GraduationCap, FileText, Zap, Download,
} from 'lucide-react'

const SIMULATED_COHORT = [
  { name: 'Mary Wanjiku',   county: 'Kiambu',  pct: 78 },
  { name: 'James Obuya',    county: 'Kisumu',  pct: 55 },
  { name: 'Faith Kemunto',  county: 'Nyamira', pct: 100 },
  { name: 'Peter Mwangi',   county: 'Murang\'a', pct: 33 },
  { name: 'Sarah Akinyi',   county: 'Nairobi', pct: 90 },
  { name: 'Daniel Mutuku',  county: 'Machakos', pct: 22 },
]

export default function ProgramPage() {
  const params = useParams<{ programId: string }>()
  const router  = useRouter()
  const { profile, syncReady } = useProfile()
  const program = getProgramById(params.programId)

  const [progress, setProgress]   = useState<ProgramProgress>({ completedLessons: [], reflections: {} })
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(['m1']))
  const [cohortJoined, setCohortJoined] = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [downloading, setDownloading] = useState(false)

  const downloadOffline = () => {
    if (!program) return
    setDownloading(true)
    const allLessons = program.modules.flatMap(m =>
      m.lessons.map(l => ({
        module: m.title,
        title: l.title,
        duration: l.duration,
        points: l.videoPoints,
        reading: l.reading,
        reflection: l.reflectionPrompt,
      }))
    )
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${program.title} — Mwalimu AI Offline</title>
<style>
body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:20px 16px;line-height:1.7;color:#111;font-size:15px;}
h1{font-size:22px;color:#1d4ed8;margin-bottom:4px;}
h2{font-size:17px;color:#374151;margin-top:32px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;}
h3{font-size:14px;color:#4b5563;font-style:italic;margin:20px 0 8px;}
.meta{color:#6b7280;font-size:12px;margin-bottom:24px;}
.point{margin:4px 0;padding-left:20px;position:relative;}
.point::before{content:counter(pt);counter-increment:pt;position:absolute;left:0;font-weight:bold;color:#1d4ed8;}
ol{counter-reset:pt;list-style:none;padding:0;}
.reading{background:#f9fafb;border-left:3px solid #1d4ed8;padding:12px 16px;margin:12px 0;font-size:14px;}
.prompt{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px;margin-top:16px;font-size:13px;}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;}
@media print{body{padding:0;}h1{color:#000;}ol li .point::before{color:#000;}}
</style></head><body>
<h1>${program.title}</h1>
<div class="meta">${program.kicdAlignment} · ${program.hours} hours · ${program.lessons} lessons<br>
Downloaded from Mwalimu AI on ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</div>
${allLessons.map((l, idx) => `
<h2>Lesson ${idx + 1}: ${l.title}</h2>
<h3>Module: ${l.module} · ${l.duration}</h3>
<p><strong>Key Points:</strong></p>
<ol>${l.points.map(p => `<li class="point">${p}</li>`).join('')}</ol>
<div class="reading">${l.reading.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}</div>
<div class="prompt"><strong>Reflection:</strong> ${l.reflection}</div>
`).join('')}
<div class="footer">Mwalimu AI — CBC Professional Development for Kenyan Teachers<br>
This offline copy is for personal study only. Content aligned with KICD CBC framework.</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${program.id}-offline.html`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  useEffect(() => {
    if (!program) return
    const p = getProgress(program.id)
    setProgress(p)
    setCohortJoined(!!p.cohortJoined)
    setMounted(true)
  }, [program, syncReady])

  if (!program) return <div className="p-8 text-muted-foreground">Program not found.</div>
  if (!program.available) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{program.title}</h1>
        <p className="text-muted-foreground mb-6">This program is coming soon. Check back shortly!</p>
        <Button asChild variant="outline" className="rounded-xl"><Link href="/dashboard/learning">Back to Programs</Link></Button>
      </div>
    )
  }

  const pct     = mounted ? getProgramCompletionPct(program, progress) : 0
  const done    = progress.completedLessons.length
  const total   = getTotalLessons(program)
  const complete = mounted ? isProgramComplete(program, progress) : false
  const track    = TRACKS.find(t => t.id === program.track)

  const toggleModule = (id: string) => setExpanded(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const firstUnfinishedLesson = () => {
    for (const mod of program.modules) {
      for (const lesson of mod.lessons) {
        if (!isLessonComplete(progress, mod.id, lesson.id)) {
          return { moduleId: mod.id, lessonId: lesson.id }
        }
      }
    }
    return null
  }

  const handleJoinCohort = () => {
    joinCohort(program.id)
    setCohortJoined(true)
  }

  const nextLesson = firstUnfinishedLesson()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <BackButton fallbackHref="/dashboard/learning" label="Back to Programs" />
        <Button variant="outline" size="sm" onClick={downloadOffline} disabled={downloading} className="rounded-xl gap-1.5 text-xs shrink-0">
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Preparing…' : 'Save for Offline'}
        </Button>
      </div>

      {/* Program header */}
      <div className={`relative overflow-hidden rounded-2xl p-7 mb-6 ${program.accent === 'primary' ? 'bg-primary' : 'bg-accent'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <Zap className="w-3 h-3" />
                {track?.label} · {program.kicdAlignment}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">{program.title}</h1>
              <p className="text-white/80 text-sm max-w-xl leading-relaxed">{program.description}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="text-center bg-white/15 rounded-xl px-4 py-3">
                <p className="text-xl font-bold text-white">{program.hours}h</p>
                <p className="text-xs text-white/70">Content</p>
              </div>
              <div className="text-center bg-white/15 rounded-xl px-4 py-3">
                <p className="text-xl font-bold text-white">{total}</p>
                <p className="text-xs text-white/70">Lessons</p>
              </div>
              <div className="text-center bg-white/15 rounded-xl px-4 py-3">
                <p className="text-xl font-bold text-white">{program.modules.length}</p>
                <p className="text-xs text-white/70">Modules</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {mounted && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/80 mb-1.5">
                <span>{done}/{total} lessons complete</span>
                <span className="font-bold">{pct}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: modules */}
        <div className="lg:col-span-2 space-y-3">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {!progress.preAssessment && (
              <Button asChild variant="outline" size="sm" className="rounded-xl gap-2 border-primary/40 text-primary hover:bg-primary/5">
                <Link href={`/dashboard/learning/${program.id}/assessment?type=pre`}>
                  <ClipboardList className="w-4 h-4" /> Take Pre-Assessment
                </Link>
              </Button>
            )}
            {nextLesson && (
              <Button asChild size="sm" className="rounded-xl gap-2">
                <Link href={`/dashboard/learning/${program.id}/${nextLesson.moduleId}/${nextLesson.lessonId}`}>
                  <PlayCircle className="w-4 h-4" />
                  {pct === 0 ? 'Start First Lesson' : 'Continue Learning'}
                </Link>
              </Button>
            )}
            {pct === 100 && !progress.postAssessment && (
              <Button asChild size="sm" className="rounded-xl gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={`/dashboard/learning/${program.id}/assessment?type=post`}>
                  <ClipboardList className="w-4 h-4" /> Take Post-Assessment
                </Link>
              </Button>
            )}
            {complete && (
              <Button asChild size="sm" className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white">
                <Link href={`/dashboard/learning/${program.id}/certificate`}>
                  <Award className="w-4 h-4" /> View Certificate
                </Link>
              </Button>
            )}
          </div>

          {/* Module accordion */}
          {program.modules.map((mod, mi) => {
            const modDone = mod.lessons.filter(l => isLessonComplete(progress, mod.id, l.id)).length
            const isOpen  = expanded.has(mod.id)
            return (
              <div key={mod.id} className="glass rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors text-left"
                  onClick={() => toggleModule(mod.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      modDone === mod.lessons.length ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {modDone === mod.lessons.length ? <CheckCircle2 className="w-4 h-4 text-primary" /> : `M${mi + 1}`}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{mod.title}</p>
                      <p className="text-xs text-muted-foreground">{modDone}/{mod.lessons.length} lessons</p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="border-t border-border/40">
                    <p className="px-5 py-3 text-xs text-muted-foreground border-b border-border/40">{mod.description}</p>
                    {mod.lessons.map((lesson, li) => {
                      const lessonDone = mounted && isLessonComplete(progress, mod.id, lesson.id)
                      return (
                        <Link
                          key={lesson.id}
                          href={`/dashboard/learning/${program.id}/${mod.id}/${lesson.id}`}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                        >
                          {lessonDone
                            ? <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0" />
                            : <Circle className="w-4.5 h-4.5 text-muted-foreground/40 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${lessonDone ? 'text-muted-foreground line-through' : ''}`}>
                              {li + 1}. {lesson.title}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {lesson.duration}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Assignment link */}
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{program.assignment.title}</p>
              <p className="text-xs text-muted-foreground">Practical assignment with AI feedback</p>
            </div>
            {progress.assignment ? (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
              </span>
            ) : (
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs"><Link href={`/dashboard/learning/${program.id}/assignment`}>Open</Link></Button>
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Assessment status */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">Assessment</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Pre-Assessment', data: progress.preAssessment, href: `?type=pre` },
                { label: 'Post-Assessment', data: progress.postAssessment, href: `?type=post`, locked: pct < 100 },
              ].map(({ label, data, href, locked }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {data ? (
                    <span className="text-xs font-bold text-primary">{data.score}/{data.total}</span>
                  ) : locked ? (
                    <span className="text-xs text-muted-foreground/50">Complete lessons first</span>
                  ) : (
                    <Link href={`/dashboard/learning/${program.id}/assessment${href}`} className="text-xs text-primary font-medium hover:underline">Take now</Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Certificate */}
          <div className={`glass rounded-2xl p-5 ${complete ? '' : 'opacity-60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Award className={`w-4.5 h-4.5 ${complete ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="font-semibold text-sm">Certificate</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {complete ? 'You\'ve earned your certificate!' : 'Read every lesson, write 6+ reflections, and score 85%+ on the post-assessment to unlock.'}
            </p>
            {complete && (
              <Button asChild size="sm" className="w-full rounded-xl text-xs"><Link href={`/dashboard/learning/${program.id}/certificate`}>View &amp; Print Certificate</Link></Button>
            )}
          </div>

          {/* Cohort panel */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4.5 h-4.5 text-accent" />
              <h3 className="font-semibold text-sm">Your Cohort</h3>
            </div>
            {cohortJoined ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">Learning alongside {SIMULATED_COHORT.length} teachers across Kenya.</p>
                <div className="space-y-2">
                  {[...(profile?.name ? [{ name: profile.name, county: profile.county || 'Kenya', pct }] : []), ...SIMULATED_COHORT].slice(0, 5).map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.county}</p>
                      </div>
                      <span className="text-xs font-bold text-primary">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">Join a cohort to learn alongside other Kenyan teachers going through this program.</p>
                <Button size="sm" variant="outline" className="w-full rounded-xl text-xs" onClick={handleJoinCohort}>
                  Join Cohort
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
