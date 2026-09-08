'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProgramById } from '@/lib/learning-paths-data'
import { getProgress, saveAssessment, earnCertificate, isProgramComplete, clearAssessment } from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BackButton } from '@/components/back-button'
import { CheckCircle2, XCircle, ChevronRight, ClipboardList, Award, RotateCw } from 'lucide-react'

export default function AssessmentPage() {
  const params = useParams<{ programId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { syncReady, profile } = useProfile()
  const type = (searchParams.get('type') ?? 'pre') as 'pre' | 'post'

  const program = getProgramById(params.programId)
  const questions = program?.[type === 'pre' ? 'preAssessment' : 'postAssessment'] ?? []

  const [answers, setAnswers]   = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore]       = useState(0)
  const [current, setCurrent]   = useState(0)
  const [existing, setExisting] = useState<{ score: number; total: number; date: string } | null>(null)
  const [certificateEarned, setCertificateEarned] = useState(false)
  const [retaking, setRetaking] = useState(false)

  useEffect(() => {
    if (!program) return
    const p = getProgress(program.id)
    const ex = p[type === 'pre' ? 'preAssessment' : 'postAssessment']
    if (ex) setExisting(ex)
  }, [program, type, syncReady])

  if (!program) return <div className="p-8 text-muted-foreground">Program not found.</div>
  if (questions.length === 0) return <div className="p-8 text-muted-foreground">No assessment available.</div>

  const handleSubmit = () => {
    const s = questions.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0)
    setScore(s)
    setSubmitted(true)
    saveAssessment(program.id, type === 'pre' ? 'preAssessment' : 'postAssessment', s, questions.length, answers as number[])
    if (type === 'post') {
      const p = getProgress(program.id)
      const prog = { ...p, postAssessment: { score: s, total: questions.length, date: new Date().toLocaleDateString(), answers: answers as number[] } }
      const eligible = isProgramComplete(program, prog)
      setCertificateEarned(eligible)
      if (eligible) {
        earnCertificate(program.id, profile?.name ?? 'Teacher', program.title)
      }
    }
  }

  const pct = Math.round((score / questions.length) * 100)
  const q   = questions[current]

  const handleRetake = async () => {
    setRetaking(true)
    // Await the cloud clear before resetting the UI: clearAssessment's write
    // is the one exception to this file's usual fire-and-forget cloud syncs,
    // specifically so a concurrent loadProgressFromCloud (e.g. from a
    // just-completed sign-in) can't read the old attempt back before the
    // clear lands and silently resurrect it into the retake screen.
    await clearAssessment(program.id, 'postAssessment')
    setExisting(null)
    setAnswers(Array(questions.length).fill(null))
    setCurrent(0)
    setSubmitted(false)
    setScore(0)
    setCertificateEarned(false)
    setRetaking(false)
  }

  /* Already completed */
  if (existing) {
    const exPct = Math.round((existing.score / existing.total) * 100)
    const failedPost = type === 'post' && exPct < 85
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6"><BackButton fallbackHref={`/dashboard/learning/${program.id}`} label="Back to Program" /></div>
        <div className="glass rounded-2xl p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${exPct >= 50 ? 'bg-primary/10' : 'bg-accent/10'}`}>
            <ClipboardList className={`w-8 h-8 ${exPct >= 50 ? 'text-primary' : 'text-accent'}`} />
          </div>
          <h1 className="text-xl font-bold mb-1">{type === 'pre' ? 'Pre' : 'Post'}-Assessment Complete</h1>
          <p className="text-muted-foreground text-sm mb-4">Completed on {existing.date}</p>
          <div className="text-4xl font-bold gradient-text mb-1">{existing.score}/{existing.total}</div>
          <p className="text-muted-foreground text-sm mb-6">{exPct}% correct</p>
          {failedPost && (
            <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">You need 85% or higher to earn the certificate — review the material and try again.</p>
          )}
          <div className="flex gap-2 justify-center">
            <Button asChild variant={failedPost ? 'outline' : 'default'} className="rounded-xl"><Link href={`/dashboard/learning/${program.id}`}>Back to Program</Link></Button>
            {failedPost && (
              <Button onClick={handleRetake} disabled={retaking} className="rounded-xl gap-2">
                <RotateCw className={`w-4 h-4 ${retaking ? 'animate-spin' : ''}`} /> {retaking ? 'Retaking…' : 'Retake Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* Results */
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6"><BackButton fallbackHref={`/dashboard/learning/${program.id}`} label="Back to Program" /></div>
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${pct >= 85 ? 'bg-primary/10' : 'bg-accent/10'}`}>
              {pct >= 85 ? <Award className="w-8 h-8 text-primary" /> : <ClipboardList className="w-8 h-8 text-accent" />}
            </div>
            <h1 className="text-2xl font-bold mb-1">{type === 'pre' ? 'Pre' : 'Post'}-Assessment Results</h1>
            <div className="text-4xl font-bold gradient-text mt-3">{score}/{questions.length}</div>
            <p className="text-muted-foreground text-sm mt-1">{pct}% correct</p>
            {type === 'post' && certificateEarned && <p className="text-primary font-semibold text-sm mt-2">Great work — check your certificate!</p>}
            {type === 'post' && !certificateEarned && pct >= 85 && (
              <p className="text-muted-foreground text-sm mt-2">
                You passed — finish every lesson and write at least 6 reflections to unlock your certificate.
              </p>
            )}
            {type === 'post' && pct < 85 && (
              <p className="text-muted-foreground text-sm mt-2">You need 85% or higher to pass. Review the material and try again.</p>
            )}
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const correct = answers[i] === q.correct
              return (
                <div key={q.id} className={`rounded-xl p-4 border ${correct ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {correct ? <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" /> : <XCircle className="w-4.5 h-4.5 text-destructive shrink-0 mt-0.5" />}
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    {!correct && <span className="text-destructive">You chose: {q.options[answers[i]!]}<br /></span>}
                    <span className={correct ? 'text-primary' : ''}>Correct: {q.options[q.correct]}</span>
                  </p>
                  <p className="text-xs text-muted-foreground ml-6 mt-1">{q.explanation}</p>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 mt-6">
            <Button asChild variant="outline" className="flex-1 w-full rounded-xl"><Link href={`/dashboard/learning/${program.id}`}>Back to Program</Link></Button>
            {type === 'post' && certificateEarned && (
              <Button asChild className="flex-1 w-full rounded-xl gap-2"><Link href={`/dashboard/learning/${program.id}/certificate`}><Award className="w-4 h-4" aria-hidden="true" /> View Certificate</Link></Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* Questions */
  const answeredCount = answers.filter(a => a !== null).length

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6"><BackButton fallbackHref={`/dashboard/learning/${program.id}`} label="Back to Program" /></div>

      <div className="glass rounded-2xl p-7">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <h1 className="text-lg font-bold">{type === 'pre' ? 'Pre' : 'Post'}-Assessment: {program.shortTitle}</h1>
            <span className="text-sm text-muted-foreground">{current + 1} / {questions.length}</span>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} className="h-1.5" />
          {type === 'pre' && (
            <p className="text-xs text-muted-foreground mt-2">This measures your starting knowledge — answer honestly, there&apos;s no pass/fail.</p>
          )}
        </div>

        {/* Question */}
        <div key={q.id}>
          <p className="font-semibold text-base mb-5 leading-relaxed">{q.question}</p>
          <div className="space-y-2.5">
            {q.options.map((option, i) => (
              <button
                key={i}
                onClick={() => setAnswers(prev => { const next = [...prev]; next[current] = i; return next })}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm transition-all duration-150 ${
                  answers[current] === i
                    ? 'border-primary bg-primary/8 font-medium'
                    : 'border-border/50 hover:border-border hover:bg-muted/30'
                }`}
              >
                <span className="text-xs font-bold text-muted-foreground mr-2.5">{String.fromCharCode(65 + i)}.</span>
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-xl"
          >
            Previous
          </Button>

          {current < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrent(c => c + 1)}
              disabled={answers[current] === null}
              className="rounded-xl gap-1.5"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={answeredCount < questions.length}
              className="rounded-xl gap-1.5 font-semibold"
            >
              Submit Assessment <ClipboardList className="w-4 h-4" />
            </Button>
          )}
        </div>

        {answeredCount < questions.length && current === questions.length - 1 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {questions.length - answeredCount} question(s) unanswered — go back to review
          </p>
        )}
      </div>
    </div>
  )
}
