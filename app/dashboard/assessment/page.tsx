'use client'

import { useState, useEffect, useMemo } from 'react'
import { AssessmentGuard } from '@/components/assessment-guard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { BackButton } from '@/components/back-button'
import { toast } from 'sonner'
import { CheckCircle, ArrowRight, AlertCircle, ChevronRight, BookOpen, Award, Brain, Target } from 'lucide-react'
import Link from 'next/link'
import { useProfile } from '@/context/profile-context'
import { usePrograms } from '@/context/content-context'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

// ---------------------------------------------------------------------------
// Types
import { NEEDS_QUESTIONS, NEEDS_SECTIONS, NEEDS_RULES, NEEDS_FALLBACK, type Question } from '@/lib/needs-assessment-data'

type MultipleQuestion = Extract<Question, { type: 'multiple' }>
type KnowledgeQuestion = Extract<Question, { type: 'knowledge' }>
type ScaleQuestion = Extract<Question, { type: 'scale' }>
type RadioQuestion = Extract<Question, { type: 'radio' }>

// ---------------------------------------------------------------------------
// Program recommendations map
// ---------------------------------------------------------------------------

/** Turns answers into up to two recommended learning paths: rules in order, then the fallback fills any gap. */
function computeRecommendations(
  responses: Record<string, unknown>,
  rules: { programId: string; when: { questionId: string; answers: string[] }[] }[],
  fallback: string[],
): string[] {
  const hit = (w: { questionId: string; answers: string[] }) => {
    const r = responses[w.questionId]
    const picked = Array.isArray(r) ? (r as string[]) : typeof r === 'string' ? [r] : []
    return w.answers.some(a => picked.includes(a))
  }
  const matched: string[] = []
  for (const rule of rules) if (!matched.includes(rule.programId) && rule.when.some(hit)) matched.push(rule.programId)
  const out = matched.slice(0, 2)
  for (const f of fallback) if (out.length < 2 && !out.includes(f)) out.push(f)
  return out
}

type Section = { index: number; title: string; description: string }
type Bank = {
  sections: Section[]
  questions: Question[]
  rules: { programId: string; when: { questionId: string; answers: string[] }[] }[]
  fallback: string[]
}

const BUILT_IN: Bank = { sections: NEEDS_SECTIONS, questions: NEEDS_QUESTIONS, rules: NEEDS_RULES, fallback: NEEDS_FALLBACK }

/** The edited copy staff published in the CMS, in the shape this page renders. */
function bankFromCms(d: NonNullable<typeof api.content.needsAssessment._returnType>): Bank {
  return {
    sections: d.sections.map((s, index) => ({ index, title: s.title, description: s.description })),
    questions: d.questions.map((q): Question => {
      const base = { id: q.id, question: q.question, subtext: q.subtext || undefined, sectionIndex: q.section }
      if (q.type === 'scale') return { ...base, type: 'scale', minLabel: q.minLabel, maxLabel: q.maxLabel }
      if (q.type === 'multiple') return { ...base, type: 'multiple', options: q.options, maxSelect: q.maxSelect || undefined }
      if (q.type === 'knowledge') return { ...base, type: 'knowledge', options: q.options, correctIndex: q.correctIndex, explanation: q.explanation }
      return { ...base, type: 'radio', options: q.options }
    }),
    rules: d.rules,
    fallback: d.fallbackProgramIds,
  }
}

// ---------------------------------------------------------------------------
// Knowledge score label
// ---------------------------------------------------------------------------

function knowledgeLabel(score: number): string {
  if (score <= 1) return 'Building Foundation'
  if (score <= 3) return 'Developing'
  return 'Solid Grounding'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function restoreFromResponses(
  savedResponses: Record<string, unknown>,
  questions: Question[],
): { correct: Record<string, boolean>; revealed: Record<string, boolean> } {
  const correct: Record<string, boolean> = {}
  const revealed: Record<string, boolean> = {}
  for (const q of questions) {
    if (q.type === 'knowledge' && savedResponses[q.id] !== undefined) {
      correct[q.id]  = (savedResponses[q.id] as number) === q.correctIndex
      revealed[q.id] = true
    }
  }
  return { correct, revealed }
}

export default function AssessmentPage() {
  const { user } = useProfile()
  const cloudAssessment = useQuery(api.assessments.mine, user ? {} : 'skip')
  const saveCloudAssessment = useMutation(api.assessments.save)
  // Staff can edit the assessment in the admin console; until a published copy exists the built-in one is used.
  const cms = useQuery(api.content.needsAssessment, {})
  const bank = useMemo<Bank>(() => (cms ? bankFromCms(cms) : BUILT_IN), [cms])
  const { sections, questions } = bank
  const { getProgramById } = usePrograms()
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  // For knowledge questions: track which have been answered and whether correct
  const [knowledgeRevealed, setKnowledgeRevealed] = useState<Record<string, boolean>>({})
  const [knowledgeCorrect, setKnowledgeCorrect] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState(false)

  // Restore completed assessment from localStorage (instant) or Supabase (cross-device)
  useEffect(() => {
    // 1. Try localStorage first for same-device instant restore
    try {
      const saved = localStorage.getItem('mwalimu_assessment')
      if (saved) {
        const parsed = JSON.parse(saved) as { completedAt?: string; responses?: Record<string, unknown> }
        if (parsed.completedAt && parsed.responses) {
          const { correct, revealed } = restoreFromResponses(parsed.responses, questions)
          setResponses(parsed.responses)
          setKnowledgeCorrect(correct)
          setKnowledgeRevealed(revealed)
          setCompleted(true)
          return
        }
      }
    } catch {}

    // 2. Pull from Convex for cross-device restoration.
    if (!user || !cloudAssessment?.responses) return
    {
        const data = cloudAssessment
        const savedResponses = data.responses as Record<string, unknown>
        // Seed localStorage so next visit is instant
        try {
          localStorage.setItem('mwalimu_assessment', JSON.stringify({
            completedAt: new Date(data.completedAt).toISOString(),
            responses:   savedResponses,
          }))
        } catch {}
        const { correct, revealed } = restoreFromResponses(savedResponses, questions)
        setResponses(savedResponses)
        setKnowledgeCorrect(correct)
        setKnowledgeRevealed(revealed)
        setCompleted(true)
      }
  }, [user, cloudAssessment, questions])

  if (cms === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent motion-reduce:animate-none" />
      </div>
    )
  }

  const totalQuestions = questions.length
  const currentQuestion = questions[currentStep]
  const progress = ((currentStep + 1) / totalQuestions) * 100
  const currentSection = sections[currentQuestion.sectionIndex]

  // Is this the first question in its section?
  const isFirstInSection =
    currentStep === 0 || questions[currentStep - 1].sectionIndex !== currentQuestion.sectionIndex

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleScaleChange = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleRadioChange = (value: string) => {
    setResponses((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleCheckboxChange = (option: string, checked: boolean) => {
    const q = currentQuestion as MultipleQuestion
    const current = (responses[q.id] as string[]) || []
    const maxSel = q.maxSelect

    if (checked) {
      if (maxSel && current.length >= maxSel) return
      setResponses((prev) => ({ ...prev, [q.id]: [...current, option] }))
    } else {
      setResponses((prev) => ({ ...prev, [q.id]: current.filter((o) => o !== option) }))
    }
  }

  const handleKnowledgeSelect = (optionIndex: number) => {
    const q = currentQuestion as KnowledgeQuestion
    if (knowledgeRevealed[q.id]) return // already answered
    const correct = optionIndex === q.correctIndex
    setResponses((prev) => ({ ...prev, [q.id]: optionIndex }))
    setKnowledgeRevealed((prev) => ({ ...prev, [q.id]: true }))
    setKnowledgeCorrect((prev) => ({ ...prev, [q.id]: correct }))
  }

  const handleNext = () => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    try {
      localStorage.setItem('mwalimu_assessment', JSON.stringify({ completedAt, responses }))
    } catch {}

    if (user) void saveCloudAssessment({ responses, completedAt: Date.parse(completedAt) })

    setCompleted(true)
    toast.success('Assessment complete! Your learning journey is now personalised.')
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const isCurrentQuestionAnswered = (): boolean => {
    const val = responses[currentQuestion.id]
    if (currentQuestion.type === 'knowledge') {
      // Knowledge: must reveal answer before advancing
      return knowledgeRevealed[currentQuestion.id] === true
    }
    if (currentQuestion.type === 'multiple') {
      return Array.isArray(val) && (val as string[]).length > 0
    }
    if (currentQuestion.type === 'scale') {
      return typeof val === 'number'
    }
    return val !== undefined && val !== ''
  }

  // ---------------------------------------------------------------------------
  // Knowledge score computation
  // ---------------------------------------------------------------------------

  const knowledgeScore = Object.values(knowledgeCorrect).filter(Boolean).length

  // ---------------------------------------------------------------------------
  // Completion screen
  // ---------------------------------------------------------------------------

  if (completed) {
    const recs = computeRecommendations(responses, bank.rules, bank.fallback)
    const score = knowledgeScore
    const label = knowledgeLabel(score)

    return (
      <div className="max-w-2xl space-y-8">
        <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

        <Card className="p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Assessment Complete</h2>
              <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Thank you for taking the time to reflect honestly. Your responses will shape the modules and tools you see throughout Mwalimu AI.
              </p>
            </div>
          </div>

          {/* CBC Knowledge score */}
          <div className="rounded-xl border bg-muted/40 p-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">CBC Knowledge</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold">{score}/4</span>
              <span className="text-sm text-muted-foreground pb-1">{label}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {score <= 1 &&
                'Your CBC knowledge is still taking shape, and that is perfectly fine. The modules below will build a strong foundation for you.'}
              {score === 2 &&
                'You have a developing grasp of CBC structures. A few targeted modules will fill the gaps and strengthen your confidence.'}
              {score === 3 &&
                'You have a solid working knowledge of CBC. Focus on the practice-oriented modules to deepen your classroom application.'}
              {score === 4 &&
                'Excellent — your CBC structural knowledge is strong. Use Mwalimu AI to sharpen your classroom practice and support your colleagues.'}
            </p>
          </div>

          {/* Recommended programs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Recommended Starting Points</h3>
            </div>
            {recs.map((rec, i) => (
              <Link key={i} href={getProgramById(rec) ? `/dashboard/learning/${rec}` : '/dashboard/learning'} className="flex min-h-14 items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{getProgramById(rec)?.title ?? rec}</p>
                  <p className="text-xs text-muted-foreground">Recommended based on your goals and challenges</p>
                </div>
                <Award className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild className="gap-2 flex-1">
              <Link href="/dashboard/learning">
                Start Learning <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/dashboard/learning">Explore All Programs</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Question rendering helpers
  // ---------------------------------------------------------------------------

  const renderScale = (q: ScaleQuestion) => {
    const selected = responses[q.id] as number | undefined
    return (
      <div className="space-y-4">
        <div className="flex gap-3 justify-center">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleScaleChange(val)}
              className={`w-12 h-12 rounded-full border-2 font-semibold text-sm transition-all ${
                selected === val
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:border-primary'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{q.minLabel}</span>
          <span>{q.maxLabel}</span>
        </div>
      </div>
    )
  }

  const renderRadio = (q: RadioQuestion) => (
    <RadioGroup value={(responses[q.id] as string) || ''} onValueChange={handleRadioChange}>
      {q.options.map((option) => (
        <div key={option} className="flex items-center space-x-2 mb-3">
          <RadioGroupItem value={option} id={`${q.id}-${option}`} />
          <Label htmlFor={`${q.id}-${option}`} className="cursor-pointer text-base leading-snug">
            {option}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )

  const renderMultiple = (q: MultipleQuestion) => {
    const selected = (responses[q.id] as string[]) || []
    const atMax = q.maxSelect !== undefined && selected.length >= q.maxSelect

    return (
      <div className="space-y-3">
        {q.maxSelect && (
          <p className="text-xs text-muted-foreground">
            Select up to {q.maxSelect}. ({selected.length}/{q.maxSelect} selected)
          </p>
        )}
        {q.options.map((option) => {
          const isChecked = selected.includes(option)
          const isDisabled = atMax && !isChecked
          return (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${q.id}-${option}`}
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
              />
              <Label
                htmlFor={`${q.id}-${option}`}
                className={`cursor-pointer text-base leading-snug ${isDisabled ? 'opacity-40' : ''}`}
              >
                {option}
              </Label>
            </div>
          )
        })}
      </div>
    )
  }

  const renderKnowledge = (q: KnowledgeQuestion) => {
    const revealed = knowledgeRevealed[q.id] === true
    const correct = knowledgeCorrect[q.id]
    const selectedIndex = responses[q.id] as number | undefined

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {q.options.map((option, idx) => {
            let cls =
              'w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all leading-snug '
            if (!revealed) {
              cls +=
                selectedIndex === idx
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary cursor-pointer'
            } else {
              if (idx === q.correctIndex) {
                cls += 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200'
              } else if (idx === selectedIndex && idx !== q.correctIndex) {
                cls += 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
              } else {
                cls += 'border-border opacity-50'
              }
            }

            return (
              <button
                key={idx}
                className={cls}
                onClick={() => handleKnowledgeSelect(idx)}
                disabled={revealed}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                {option}
              </button>
            )
          })}
        </div>

        {/* Feedback box */}
        {revealed && (
          <div
            className={`rounded-lg p-4 flex gap-3 text-sm leading-relaxed ${
              correct
                ? 'bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
            }`}
          >
            {correct ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold mb-1">{correct ? 'Correct' : 'Not quite'}</p>
              <p>{q.explanation}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-2xl space-y-8">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

      <div>
        <h1 className="text-3xl font-bold mb-2">Needs Assessment</h1>
        <p className="text-muted-foreground">
          {questions.length} questions across {sections.length} sections to personalise your Mwalimu AI experience. There are no wrong answers — this is for your benefit.
        </p>
      </div>

      <AssessmentGuard watermark={`${(user?.email ?? 'Learner').split('@')[0]} · ${(user?.id ?? '').slice(-6)}`} title="Needs assessment" attempt={{ programId: 'needs-assessment', kind: 'needs' }}>
      <Card className="p-8 space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-medium">
              Section {currentQuestion.sectionIndex + 1}/5: {currentSection.title}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Question {currentStep + 1} of {totalQuestions}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Section pill — shown on first question of each section */}
        {isFirstInSection && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-5 py-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Section {currentQuestion.sectionIndex + 1} of 5
              </span>
            </div>
            <p className="font-semibold text-base">{currentSection.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{currentSection.description}</p>
          </div>
        )}

        {/* Question */}
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-snug">{currentQuestion.question}</h2>
            {currentQuestion.subtext && (
              <p className="text-xs text-muted-foreground">{currentQuestion.subtext}</p>
            )}
          </div>

          {currentQuestion.type === 'scale' && renderScale(currentQuestion as ScaleQuestion)}
          {currentQuestion.type === 'radio' && renderRadio(currentQuestion as RadioQuestion)}
          {currentQuestion.type === 'multiple' && renderMultiple(currentQuestion as MultipleQuestion)}
          {currentQuestion.type === 'knowledge' && renderKnowledge(currentQuestion as KnowledgeQuestion)}
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-4 pt-2">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
            Previous
          </Button>

          {currentStep === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isCurrentQuestionAnswered()}
              className="gap-2"
            >
              Complete Assessment <CheckCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered()}
              className="gap-2"
            >
              {currentQuestion.type === 'knowledge' && !knowledgeRevealed[currentQuestion.id]
                ? 'Select an answer'
                : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
      </AssessmentGuard>
    </div>
  )
}
