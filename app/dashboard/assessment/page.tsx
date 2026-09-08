'use client'

import { useState, useEffect } from 'react'
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
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionType = 'scale' | 'radio' | 'multiple' | 'knowledge'

type BaseQuestion = {
  id: string
  question: string
  subtext?: string
  sectionIndex: number
}

type ScaleQuestion = BaseQuestion & { type: 'scale'; min?: number; max?: number; minLabel: string; maxLabel: string }
type RadioQuestion = BaseQuestion & { type: 'radio'; options: string[] }
type MultipleQuestion = BaseQuestion & { type: 'multiple'; options: string[]; maxSelect?: number }
type KnowledgeQuestion = BaseQuestion & {
  type: 'knowledge'
  options: string[]
  correctIndex: number
  explanation: string
}

type Question = ScaleQuestion | RadioQuestion | MultipleQuestion | KnowledgeQuestion

// ---------------------------------------------------------------------------
// Section metadata
// ---------------------------------------------------------------------------

const sections = [
  { index: 0, title: 'Your Teaching Context', description: 'Help us understand who you are as a teacher so we can tailor your experience.' },
  { index: 1, title: 'CBC Knowledge Check', description: 'A quick diagnostic to see where your CBC understanding is strong and where there are gaps. All answers are for learning — there is no penalty.' },
  { index: 2, title: 'Assessment Practice', description: 'Tell us about your current Classroom-Based Assessment (CBA) practices and challenges.' },
  { index: 3, title: 'Teaching Practice', description: 'Reflect honestly on how you currently plan and deliver lessons.' },
  { index: 4, title: 'Goals and Support', description: 'Your answers here shape the learning path and tools we recommend to you.' },
]

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

const questions: Question[] = [
  // ---- Section 1: Teaching Context ----------------------------------------
  {
    id: 'teaching_level',
    sectionIndex: 0,
    type: 'radio',
    question: 'Which level(s) do you currently teach?',
    options: [
      'Pre-Primary (PP1 and PP2)',
      'Lower Primary (Grades 1–3)',
      'Upper Primary (Grades 4–6)',
      'Junior Secondary (Grades 7–9)',
      'Multiple levels',
    ],
  },
  {
    id: 'cbc_experience',
    sectionIndex: 0,
    type: 'radio',
    question: 'How many years have you been teaching under the CBC framework?',
    options: [
      'Less than 1 year',
      '1–2 years',
      '3–4 years',
      '5 or more years',
    ],
  },
  {
    id: 'school_context',
    sectionIndex: 0,
    type: 'radio',
    question: 'Which best describes your school environment?',
    options: [
      'Public school — urban',
      'Public school — peri-urban or rural',
      'ASAL region (Arid and Semi-Arid Lands)',
      'Private or faith-based school',
    ],
  },

  // ---- Section 2: CBC Knowledge Check -------------------------------------
  {
    id: 'cbc_structure',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'The current CBC pathway (as of 2023) includes which five levels?',
    options: [
      'Pre-Primary, Primary, Secondary',
      'PP, Lower Primary, Upper Primary, Senior Secondary',
      'PP, Lower Primary, Upper Primary, Junior Secondary, Senior Secondary',
      'Pre-Primary, Junior School, Senior School',
    ],
    correctIndex: 2,
    explanation:
      'The CBC pathway has 5 levels: Pre-Primary (2 years), Lower Primary (Grades 1–3), Upper Primary (Grades 4–6), Junior Secondary (Grades 7–9, introduced 2023), and Senior Secondary (Grades 10–12).',
  },
  {
    id: 'core_competencies',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'Which of the following is NOT one of CBC\'s seven core competencies?',
    options: [
      'Communication and Collaboration',
      'Numeracy and Literacy',
      'Digital Literacy',
      'Self-Efficacy',
    ],
    correctIndex: 1,
    explanation:
      'Numeracy and Literacy are integrated across learning areas but are not listed as one of the 7 core competencies. The 7 are: Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Citizenship, Digital Literacy, Learning to Learn, and Self-Efficacy.',
  },
  {
    id: 'cba_meaning',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'In the CBC context, CBA stands for:',
    options: [
      'Curriculum-Based Assessment',
      'Classroom-Based Assessment',
      'Competency-Based Assessment',
      'Continuous Basic Assessment',
    ],
    correctIndex: 1,
    explanation:
      'CBA stands for Classroom-Based Assessment — the ongoing formative assessment conducted by teachers in their own classrooms, as distinguished from external KNEC examinations.',
  },
  {
    id: 'performance_scale',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'The CBC learner performance scale uses which categories?',
    options: [
      'Grade A to E (as in 8-4-4)',
      'Pass / Fail only',
      'Exceeds Expectation (EE), Meets Expectation (ME), Approaches Expectation (AE), Below Expectation (BE)',
      'Advanced, Proficient, Basic, Below Basic',
    ],
    correctIndex: 2,
    explanation:
      'CBC uses 4 performance levels: EE (Exceeds Expectation), ME (Meets Expectation), AE (Approaches Expectation), and BE (Below Expectation). These replace percentage marks and focus on competency achievement, not ranking.',
  },

  // ---- Section 3: Assessment Practice -------------------------------------
  {
    id: 'cba_confidence',
    sectionIndex: 2,
    type: 'scale',
    question:
      'How confident are you in conducting and recording Classroom-Based Assessment (CBA) using rubrics, anecdotal records, and portfolios?',
    subtext: '1 = not at all confident   5 = very confident',
    minLabel: 'Not at all confident',
    maxLabel: 'Very confident',
  },
  {
    id: 'assessment_tools',
    sectionIndex: 2,
    type: 'multiple',
    question: 'Which CBC assessment tools do you currently use regularly? (Select all that apply)',
    options: [
      'Observation notes and anecdotal records',
      'Rubrics aligned to EE / ME / AE / BE levels',
      'Checklists or rating scales',
      'Portfolio of learner work samples',
      'Peer assessment activities',
      'Self-assessment by learners',
      'I have not yet implemented CBC assessment tools',
    ],
  },
  {
    id: 'assessment_challenge',
    sectionIndex: 2,
    type: 'radio',
    question: 'What is your greatest challenge with CBC assessment?',
    options: [
      'Not enough time to assess all learners meaningfully',
      'Unsure what to look for when assessing competencies',
      'Record-keeping and reporting workload is overwhelming',
      'I lack ready-made rubrics and templates',
      'Difficulty calibrating what EE / ME / AE / BE looks like in practice',
    ],
  },

  // ---- Section 4: Teaching Practice ---------------------------------------
  {
    id: 'lesson_planning',
    sectionIndex: 3,
    type: 'scale',
    question:
      'How confident are you designing CBC lesson plans using backwards design — starting from the Specific Learning Outcome (SLO) and planning activities to achieve it?',
    subtext: '1 = not at all confident   5 = very confident',
    minLabel: 'Not at all confident',
    maxLabel: 'Very confident',
  },
  {
    id: 'differentiation',
    sectionIndex: 3,
    type: 'radio',
    question: 'In a lesson with mixed-ability learners, how do you typically differentiate?',
    options: [
      'I use the same activities for all learners',
      'I adjust task complexity for different learners',
      'I group learners and give different tasks to each group',
      'I use differentiated worksheets and materials prepared in advance',
      'I am still developing my differentiation skills',
    ],
  },
  {
    id: 'learner_activity_time',
    sectionIndex: 3,
    type: 'radio',
    question:
      'In a typical lesson, approximately how much time do learners spend actively doing — not listening to or watching you teach?',
    options: [
      'Less than 20% of lesson time',
      '20–40% of lesson time',
      '40–60% of lesson time',
      '60–80% of lesson time',
      'More than 80% of lesson time',
    ],
  },

  // ---- Section 5: Goals and Support ---------------------------------------
  {
    id: 'cbc_challenges',
    sectionIndex: 4,
    type: 'multiple',
    question: 'Which CBC implementation challenges are most pressing for you right now? (Select all that apply)',
    options: [
      'Understanding the curriculum design documents and SLOs',
      'Managing large class sizes in a learner-centred approach',
      'Limited teaching and learning materials',
      'Parents who do not understand or support CBC',
      'Record-keeping and reporting workload',
      'Junior Secondary curriculum (new from 2023)',
      'Lack of in-service training and coaching support',
      'Integrating technology into CBC teaching',
    ],
  },
  {
    id: 'development_goals',
    sectionIndex: 4,
    type: 'multiple',
    question: 'What would you most like to improve through this professional development? (Select up to 3)',
    maxSelect: 3,
    options: [
      'Deepening my CBC philosophy and structural knowledge',
      'Designing effective learner-centred activities',
      'Conducting and recording CBA accurately',
      'Differentiating instruction for diverse learners',
      'CBC lesson planning using backwards design',
      'Communicating CBC to parents effectively',
      'Junior Secondary subject and curriculum knowledge',
      'Integrating technology in CBC teaching',
    ],
  },
]

// ---------------------------------------------------------------------------
// Program recommendations map
// ---------------------------------------------------------------------------

function computeRecommendations(responses: Record<string, unknown>): string[] {
  const goals = (responses['development_goals'] as string[]) || []
  const challenges = (responses['cbc_challenges'] as string[]) || []

  const recs: string[] = []

  if (
    goals.includes('Conducting and recording CBA accurately') ||
    challenges.includes('Record-keeping and reporting workload') ||
    challenges.includes('Lack of in-service training and coaching support')
  ) {
    recs.push('Formative Assessment Strategies')
  }
  if (
    goals.includes('CBC lesson planning using backwards design') ||
    goals.includes('Deepening my CBC philosophy and structural knowledge')
  ) {
    recs.push('CBC Lesson Planning Mastery')
  }
  if (
    goals.includes('Differentiating instruction for diverse learners') ||
    challenges.includes('Managing large class sizes in a learner-centred approach')
  ) {
    recs.push('Inclusive Teaching Practices')
  }
  if (
    goals.includes('Junior Secondary subject and curriculum knowledge') ||
    challenges.includes('Junior Secondary curriculum (new from 2023)')
  ) {
    recs.push('Junior Secondary CBC')
  }
  if (
    goals.includes('Integrating technology in CBC teaching') ||
    challenges.includes('Integrating technology into CBC teaching')
  ) {
    recs.push('Digital Integration in CBC')
  }
  if (
    goals.includes('Designing effective learner-centred activities') ||
    goals.includes('Deepening my CBC philosophy and structural knowledge')
  ) {
    recs.push('CBC Fundamentals')
  }

  // Deduplicate and return top 2
  const unique = Array.from(new Set(recs))
  if (unique.length === 0) return ['CBC Fundamentals', 'Competency-Based Assessment']
  if (unique.length === 1) return [unique[0], 'Competency-Based Assessment']
  return unique.slice(0, 2)
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
  savedResponses: Record<string, unknown>
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
          const { correct, revealed } = restoreFromResponses(parsed.responses)
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
        const { correct, revealed } = restoreFromResponses(savedResponses)
        setResponses(savedResponses)
        setKnowledgeCorrect(correct)
        setKnowledgeRevealed(revealed)
        setCompleted(true)
      }
  }, [user, cloudAssessment])

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
    const recs = computeRecommendations(responses)
    const score = knowledgeScore
    const label = knowledgeLabel(score)

    return (
      <div className="max-w-2xl mx-auto space-y-8">
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
              <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{rec}</p>
                  <p className="text-xs text-muted-foreground">Recommended based on your goals and challenges</p>
                </div>
                <Award className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
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
    <div className="max-w-2xl mx-auto space-y-8">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

      <div>
        <h1 className="text-3xl font-bold mb-2">Needs Assessment</h1>
        <p className="text-muted-foreground">
          15 questions across 5 sections to personalise your Mwalimu AI experience. There are no wrong answers — this is for your benefit.
        </p>
      </div>

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
    </div>
  )
}
