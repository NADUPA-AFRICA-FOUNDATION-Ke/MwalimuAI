'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfile, type TeacherProfile } from '@/context/profile-context'
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, BookMarked, Check } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { getT } from '@/lib/i18n'

const SUBJECTS = [
  'English', 'Kiswahili', 'Mathematics', 'Science & Technology',
  'Social Studies', 'Creative Arts & Crafts', 'Physical & Health Education',
  'Religious Education', 'Pre-Technical Studies', 'Agriculture & Nutrition',
]

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']

const COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang\'a',
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri',
  'Samburu','Siaya','Taita Taveta','Tana River','Tharaka Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
]

const CBC_LEVELS = [
  { value: 'beginner',     labelKey: 'onboard.beginner'     },
  { value: 'intermediate', labelKey: 'onboard.intermediate' },
  { value: 'advanced',     labelKey: 'onboard.advanced'     },
] as const

// Diagnostic quiz — 5 questions
const QUIZ = [
  {
    q: 'What does the "C" in CBC stand for?',
    options: ['Content-Based Curriculum', 'Competency-Based Curriculum', 'Community-Based Curriculum', 'Criterion-Based Curriculum'],
    correct: 1,
  },
  {
    q: 'In CBC, which best describes formative assessment?',
    options: [
      'End-of-term exams that determine promotion',
      'Standardised national tests given termly',
      'Ongoing observation, portfolios, and feedback during learning',
      'Multiple-choice tests marked by computer',
    ],
    correct: 2,
  },
  {
    q: 'What is a "strand" in the CBC framework?',
    options: [
      'A special teaching style for gifted learners',
      'A broad thematic area within a learning area',
      'A type of homework assignment',
      'A grouping strategy for mixed-ability classes',
    ],
    correct: 1,
  },
  {
    q: 'Which approach best supports learner diversity in a CBC classroom?',
    options: [
      'Teaching to the average learner and adjusting at the end',
      'Permanently streaming learners by ability',
      'Using the exact same activity for every learner',
      'Differentiated instruction tailored to individual needs',
    ],
    correct: 3,
  },
  {
    q: 'A CBC learning activity is primarily designed to:',
    options: [
      'Cover as much syllabus content as quickly as possible',
      'Develop specific competencies and values in learners',
      'Prepare learners for national examinations',
      'Complete the prescribed textbook by end of term',
    ],
    correct: 1,
  },
]

// Map quiz score → cbcLevel
function scoreToLevel(score: number): TeacherProfile['cbcLevel'] {
  if (score <= 1) return 'beginner'
  if (score <= 3) return 'intermediate'
  return 'advanced'
}

// Recommend a program based on cbcLevel
const LEVEL_PROGRAM: Record<TeacherProfile['cbcLevel'], { id: string; title: string; why: string }> = {
  beginner:     { id: 'cbc-foundations',       title: 'CBC Foundations',        why: 'Builds the core concepts you need to implement CBC with confidence.' },
  intermediate: { id: 'assessment-for-learning', title: 'Assessment for Learning', why: 'Takes your practice deeper — mastering formative tools is the next milestone.' },
  advanced:     { id: 'inclusive-education',    title: 'Inclusive Education',    why: 'At your level, refining inclusive pedagogy creates the biggest classroom impact.' },
}

function StepDot({ n, current, total }: { n: number; current: number; total: number }) {
  const done   = n < current
  const active = n === current
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
      done   ? 'bg-primary text-primary-foreground' :
      active ? 'bg-primary text-primary-foreground ring-4 ring-primary/25' :
               'bg-muted text-muted-foreground'
    }`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  )
}

function MultiSelect({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          aria-pressed={selected.includes(o)}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-150 ${
            selected.includes(o)
              ? 'bg-primary/10 border-primary/50 text-foreground'
              : 'bg-transparent border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/40'
          }`}
        >
          {selected.includes(o) && <Check className="w-3.5 h-3.5 text-primary mr-1 shrink-0" aria-hidden="true" />}
          {o}
        </button>
      ))}
    </div>
  )
}

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const router = useRouter()
  const { setProfile, lang } = useProfile()
  const t = getT(lang)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', school: '', county: '',
    subjects: [] as string[], grades: [] as string[],
    cbcLevel: '' as '' | TeacherProfile['cbcLevel'],
  })
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null))
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore]         = useState(0)
  const [derivedLevel, setDerivedLevel]   = useState<TeacherProfile['cbcLevel'] | null>(null)

  const set = (k: keyof typeof form) => (v: string | string[]) => setForm(f => ({ ...f, [k]: v }))

  const step1Valid = form.name.trim().length > 1
  const step2Valid = form.subjects.length > 0 && form.grades.length > 0
  const step3Valid = form.cbcLevel !== ''
  const quizReady  = quizAnswers.every(a => a !== null)

  const submitQuiz = () => {
    const score = QUIZ.reduce((s, q, i) => s + (quizAnswers[i] === q.correct ? 1 : 0), 0)
    const level = scoreToLevel(score)
    setQuizScore(score)
    setDerivedLevel(level)
    setQuizSubmitted(true)
    // Override whatever they selected in step 3 with the quiz-derived level
    setForm(f => ({ ...f, cbcLevel: level }))
  }

  const finish = async () => {
    const profile: TeacherProfile = {
      name:     form.name.trim(),
      school:   form.school.trim(),
      county:   form.county,
      subjects: form.subjects,
      grades:   form.grades,
      cbcLevel: (form.cbcLevel || 'beginner') as TeacherProfile['cbcLevel'],
      completed: true,
    }
    await setProfile(profile)
    router.push('/dashboard')
  }

  const skip = async () => {
    await setProfile({ name: 'Teacher', school: '', county: '', subjects: [], grades: [], cbcLevel: 'beginner', completed: true })
    router.push('/dashboard')
  }

  const recommendation = derivedLevel ? LEVEL_PROGRAM[derivedLevel] : null

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-20 right-12 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-blob animation-delay-3000" />
      </div>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <BrandMark className="w-12 h-12" />
          <span className="font-bold text-2xl tracking-tight">Mwalimu AI</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
            <div key={n} className="flex items-center gap-2">
              <StepDot n={n} current={step} total={TOTAL_STEPS} />
              {n < TOTAL_STEPS && (
                <div className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${step > n ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl shadow-primary/5">

          {/* ── Step 1: Name / School / County ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight mb-2">{t('onboard.step1Title')}</h1>
                <p className="text-muted-foreground text-sm">{t('onboard.step1Sub')}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">{t('onboard.name')} *</Label>
                  <Input id="name" placeholder={t('onboard.namePlaceholder')} value={form.name} onChange={e => set('name')(e.target.value)} className="rounded-xl" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-sm font-medium">{t('onboard.school')}</Label>
                  <Input id="school" placeholder={t('onboard.schoolPlaceholder')} value={form.school} onChange={e => set('school')(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="county" className="text-sm font-medium">{t('onboard.county')}</Label>
                  <Select value={form.county} onValueChange={set('county')}>
                    <SelectTrigger id="county" className="rounded-xl"><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => setStep(2)} disabled={!step1Valid} className="w-full rounded-xl gap-2 font-semibold" size="lg">
                {t('onboard.next')} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Subjects / Grades ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight mb-2">{t('onboard.step2Title')}</h1>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <span id="subjects-label" className="text-sm font-medium">{t('onboard.subjects')} *</span>
                  <div role="group" aria-labelledby="subjects-label">
                    <MultiSelect options={SUBJECTS} selected={form.subjects} onChange={v => set('subjects')(v)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <span id="grades-label" className="text-sm font-medium">{t('onboard.grades')} *</span>
                  <div role="group" aria-labelledby="grades-label">
                    <MultiSelect options={GRADES} selected={form.grades} onChange={v => set('grades')(v)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> {t('onboard.back')}
                </Button>
                <Button onClick={() => setStep(3)} disabled={!step2Valid} className="flex-1 rounded-xl gap-1.5">
                  {t('onboard.next')} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Self-reported CBC level ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight mb-2">{t('onboard.step3Title')}</h1>
                <p className="text-muted-foreground text-sm">{t('onboard.cbcLevel')}</p>
              </div>
              <div className="space-y-2.5">
                {CBC_LEVELS.map(({ value, labelKey }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('cbcLevel')(value)}
                    aria-pressed={form.cbcLevel === value}
                    className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-150 ${
                      form.cbcLevel === value ? 'border-primary bg-primary/8' : 'border-border/50 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        form.cbcLevel === value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}>
                        {form.cbcLevel === value && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                      <span className="text-sm font-medium">{t(labelKey)}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-xl gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> {t('onboard.back')}
                </Button>
                <Button onClick={() => setStep(4)} disabled={!step3Valid} className="flex-1 rounded-xl gap-1.5">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Diagnostic quiz ── */}
          {step === 4 && !quizSubmitted && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-primary/8 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Quick Knowledge Check
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">5 Quick Questions</h1>
                <p className="text-muted-foreground text-sm">This helps us recommend the right learning path — there are no wrong answers, just honest ones.</p>
              </div>

              <div className="space-y-4">
                {QUIZ.map((q, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-semibold leading-snug">{qi + 1}. {q.q}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => {
                            const next = [...quizAnswers]
                            next[qi] = oi
                            setQuizAnswers(next)
                          }}
                          aria-pressed={quizAnswers[qi] === oi}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-150 ${
                            quizAnswers[qi] === oi
                              ? 'border-primary bg-primary/8 font-medium'
                              : 'border-border/50 hover:border-border hover:bg-muted/30'
                          }`}
                        >
                          <span className="text-xs font-bold text-muted-foreground mr-2">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 rounded-xl gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={submitQuiz} disabled={!quizReady} className="flex-1 rounded-xl gap-1.5 font-semibold">
                  See My Results <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4 results + recommendation ── */}
          {step === 4 && quizSubmitted && recommendation && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">
                  {quizScore >= 4 ? 'Excellent knowledge!' : quizScore >= 2 ? 'Good foundation!' : 'Great starting point!'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  You answered {quizScore} of {QUIZ.length} correctly — your recommended level is{' '}
                  <span className="font-semibold text-foreground capitalize">{derivedLevel}</span>.
                </p>
              </div>

              {/* Recommended program */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Recommended Starting Program</p>
                </div>
                <h3 className="font-bold text-base mb-1">{recommendation.title}</h3>
                <p className="text-sm text-muted-foreground">{recommendation.why}</p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                You can explore any program after setup — this is just a starting suggestion.
              </p>

              <Button onClick={finish} className="w-full rounded-xl gap-2 font-semibold" size="lg">
                {t('onboard.finish')} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
