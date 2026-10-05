import { z } from 'zod'

/**
 * Prompts and output schemas for the admin AI assistant. Pure and dependency-light so they can be tested
 * without a model. Everything the model writes is a DRAFT: staff review and edit it, and the normal
 * review-and-publish process still applies.
 */

export const SYSTEM = `You are an instructional designer who writes professional-development content for Kenyan teachers.
Follow these rules in everything you write:
- Align with Kenya's Competency Based Curriculum (CBC) and KICD guidance. Name competencies and strands only when you are sure of them; never invent KICD document titles, statistics, quotes or URLs.
- Write for busy teachers in real classrooms, including low-resource and large-class settings. Use Kenyan examples, local materials and realistic constraints.
- Plain, warm, practical English at a Grade 8 reading level. Short paragraphs. No jargon without a one-line explanation.
- Teach by doing: give steps a teacher can try tomorrow.
- Use Markdown the app can render: "##" and "###" headings, short bullet and numbered lists, **bold** for key terms, simple tables, "> " for a quote or callout. No HTML, no images.
- Respond with ONE JSON object only. No prose before or after it, no code fences.`

export const LEVELS = ['PP1–PP2', 'Grades 1–3', 'Grades 4–6', 'Grades 7–9', 'Senior School', 'School leaders', 'All teachers'] as const

// ── Output schemas ──────────────────────────────────────────────────────────

export const lessonSchema = z.object({
  duration: z.string().min(1).max(40),
  videoTitle: z.string().max(300).default(''),
  videoPoints: z.array(z.string().max(500)).max(8).default([]),
  reading: z.string().min(150).max(20000),
  reflectionPrompt: z.string().max(1000).default(''),
  reflectionPlaceholder: z.string().max(500).default(''),
})

export const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(5).max(1000),
        options: z.array(z.string().min(1).max(500)).length(4),
        correct: z.number().int().min(0).max(3),
        explanation: z.string().max(2000).default(''),
      }),
    )
    .min(1)
    .max(20),
})

export const outlineSchema = z.object({
  title: z.string().min(3).max(200),
  tagline: z.string().max(300).default(''),
  description: z.string().max(3000).default(''),
  track: z.enum(['core', 'stem', 'languages', 'humanities', 'leadership', 'wellbeing']).default('core'),
  hours: z.number().min(0.5).max(100).default(4),
  outcomes: z.array(z.string().max(300)).max(8).default([]),
  modules: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(1000).default(''),
        lessons: z
          .array(z.object({ title: z.string().min(2).max(200), duration: z.string().max(40).default('10 min'), objective: z.string().max(500).default('') }))
          .min(1)
          .max(10),
      }),
    )
    .min(1)
    .max(12),
  assignment: z.object({
    title: z.string().max(300).default(''),
    context: z.string().max(5000).default(''),
    task: z.string().max(5000).default(''),
    hints: z.array(z.string().max(500)).max(10).default([]),
    rubric: z.array(z.string().max(500)).max(10).default([]),
  }),
  certificate: z.object({ subtitle: z.string().max(300).default(''), skills: z.array(z.string().max(200)).max(10).default([]) }),
})

export const improveSchema = z.object({ text: z.string().min(1).max(60000) })

export const reviewSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().max(1000),
  strengths: z.array(z.string().max(300)).max(6).default([]),
  issues: z
    .array(z.object({ severity: z.enum(['high', 'medium', 'low']), text: z.string().max(400), fix: z.string().max(500).default('') }))
    .max(12)
    .default([]),
})

export const recommendSchema = z.object({
  ideas: z
    .array(z.object({ title: z.string().max(200), why: z.string().max(500), evidence: z.string().max(300).default(''), type: z.enum(['new_path', 'improve_lesson', 'improve_quiz', 'new_resource']).default('new_path') }))
    .min(1)
    .max(8),
})

// ── Prompts ─────────────────────────────────────────────────────────────────

const trim = (s: string | undefined, n: number) => (s ?? '').trim().slice(0, n)

export type OutlineInput = { topic: string; audience: string; outcomes?: string; modules: number; lessonsPerModule: number; notes?: string }
export function outlinePrompt(i: OutlineInput) {
  return `Design a professional-development learning path for Kenyan teachers.

Topic: ${trim(i.topic, 300)}
Audience: ${trim(i.audience, 100)}
What teachers should be able to do afterwards: ${trim(i.outcomes, 1000) || '(you decide, 3 to 5 outcomes)'}
Extra notes from the author: ${trim(i.notes, 1000) || 'none'}

Create exactly ${i.modules} modules, each with exactly ${i.lessonsPerModule} lessons, in a sensible learning order (foundations first, practice later). Each lesson title must be specific and each "objective" one sentence starting with a verb. Lesson duration like "12 min". Also write one practical end-of-path assignment with a rubric (3 to 5 criteria) and the certificate subtitle and 3 to 5 skills.

JSON shape:
{"title":string,"tagline":string,"description":string,"track":"core"|"stem"|"languages"|"humanities"|"leadership"|"wellbeing","hours":number,"outcomes":string[],"modules":[{"title":string,"description":string,"lessons":[{"title":string,"duration":string,"objective":string}]}],"assignment":{"title":string,"context":string,"task":string,"hints":string[],"rubric":string[]},"certificate":{"subtitle":string,"skills":string[]}}`
}

export type LessonInput = { path: string; module: string; title: string; objective?: string; audience?: string; outline?: string; existing?: string }
export function lessonPrompt(i: LessonInput) {
  return `Write one lesson for the learning path "${trim(i.path, 200)}", module "${trim(i.module, 200)}".

Lesson title: ${trim(i.title, 200)}
Objective: ${trim(i.objective, 500) || '(infer from the title)'}
Audience: ${trim(i.audience, 100) || 'Kenyan teachers'}
Where it sits in the path (for continuity, do not repeat other lessons): ${trim(i.outline, 1500) || 'n/a'}
${i.existing?.trim() ? `The author's notes or rough draft to build on:\n"""\n${trim(i.existing, 6000)}\n"""` : ''}

The "reading" is the lesson body in Markdown, 500 to 800 words: a short real-classroom scenario to open, the key ideas with examples, a step-by-step "Try it this week" activity using low-cost materials, and a short "Check yourself" list of 3 questions. "videoPoints" are 3 to 5 key points a short video would cover. "reflectionPrompt" is one open question the teacher answers in a journal; "reflectionPlaceholder" is a short hint of what a good answer includes. "duration" like "12 min".

JSON shape: {"duration":string,"videoTitle":string,"videoPoints":string[],"reading":string,"reflectionPrompt":string,"reflectionPlaceholder":string}`
}

export type QuizInput = { path: string; kind: 'pre' | 'post'; count: number; difficulty: 'easy' | 'mixed' | 'hard'; context: string }
export function quizPrompt(i: QuizInput) {
  return `Write ${i.count} multiple-choice questions for the ${i.kind === 'pre' ? 'PRE-assessment (a diagnostic of what teachers already know, no trick questions)' : 'POST-assessment (checks they learned the lessons; teachers need 85% to earn a certificate, so every question must be fair and unambiguous)'} of the learning path "${trim(i.path, 200)}".

Difficulty: ${i.difficulty}.
Base every question ONLY on this material:
"""
${trim(i.context, 14000)}
"""

Rules: exactly 4 options per question, exactly one clearly correct option, plausible wrong options that reflect real misconceptions, similar length across options, no "all of the above" or "none of the above", vary the position of the correct answer (correct is the index 0 to 3), and give a one-sentence explanation of why the answer is right.

JSON shape: {"questions":[{"question":string,"options":[string,string,string,string],"correct":0|1|2|3,"explanation":string}]}`
}

export const IMPROVE_ACTIONS = {
  simplify: 'Rewrite in simpler words and shorter sentences (Grade 6 reading level) without losing any meaning.',
  shorten: 'Cut it by about a third. Keep every key idea and the activity; remove repetition and filler.',
  expand: 'Expand it with one more concrete Kenyan classroom example and one more practical tip. Keep the existing structure.',
  kiswahili: 'Translate into clear, natural Kiswahili suitable for teachers. Keep the Markdown structure and any English technical terms in brackets where helpful.',
  proofread: 'Fix spelling, grammar and punctuation only. Do not change wording or structure otherwise.',
  examples: 'Add short Kenyan classroom examples (local materials, large classes, mixed abilities) where the text is abstract. Keep everything else.',
  cbc: 'Strengthen the CBC alignment: connect the ideas to relevant core competencies and learner-centred, competency-based practice, without inventing document names.',
} as const
export type ImproveAction = keyof typeof IMPROVE_ACTIONS

export function improvePrompt(action: ImproveAction, text: string) {
  return `${IMPROVE_ACTIONS[action]}

Keep the Markdown formatting. Return only the revised text.

TEXT:
"""
${trim(text, 30000)}
"""

JSON shape: {"text":string}`
}

export function reviewPrompt(kind: string, content: string) {
  return `Review this ${kind} written for Kenyan teachers' professional development, as a careful editor and CBC specialist.

Score 0 to 100 for: clarity, practicality for real classrooms, correct and fair content, CBC alignment, and completeness. List at most 8 issues, most important first. For each: severity (high = wrong, confusing or unusable; medium = weak; low = polish), what is wrong, and a concrete fix. Do not praise generically. Flag any claim that looks invented (statistics, quotes, document titles). For quiz questions flag ambiguous wording, more than one defensible answer, or a giveaway.

CONTENT:
"""
${trim(content, 20000)}
"""

JSON shape: {"score":number,"summary":string,"strengths":string[],"issues":[{"severity":"high"|"medium"|"low","text":string,"fix":string}]}`
}

export function recommendPrompt(evidence: string) {
  return `You advise a team building professional-development content for Kenyan teachers. Using ONLY the evidence below, suggest up to 6 specific things to build or fix next, most valuable first. Each idea needs a short title, why it matters, and the evidence it rests on (quote the numbers). Do not invent data.

EVIDENCE:
"""
${trim(evidence, 12000)}
"""

JSON shape: {"ideas":[{"title":string,"why":string,"evidence":string,"type":"new_path"|"improve_lesson"|"improve_quiz"|"new_resource"}]}`
}

// ── Parsing ─────────────────────────────────────────────────────────────────

/** Pulls the first JSON object out of a model reply, tolerating code fences and stray prose. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('{')
  if (start < 0) throw new Error('no JSON object in the reply')
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
    } else if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return JSON.parse(cleaned.slice(start, i + 1))
  }
  throw new Error('the JSON object was cut off')
}
