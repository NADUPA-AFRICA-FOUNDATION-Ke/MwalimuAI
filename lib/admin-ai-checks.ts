import type { z } from 'zod'
import type { lessonSchema, outlineSchema, quizSchema } from '@/lib/admin-ai'

/**
 * Plain rules a good AI draft must meet, so a model or prompt change cannot quietly make content worse.
 * Each returns a list of problems; an empty list means it passed. No model involved, so these are fast and exact.
 */
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

export function checkLesson(d: z.infer<typeof lessonSchema>): string[] {
  const out: string[] = []
  const n = words(d.reading)
  if (n < 350) out.push(`Reading is too short (${n} words; wants 350 or more)`)
  if (n > 1400) out.push(`Reading is too long (${n} words; wants 1400 or fewer)`)
  if (!/^#{2,3}\s/m.test(d.reading)) out.push('Reading has no ## headings')
  if (!/^\s*(?:[-*]|\d+\.)\s/m.test(d.reading)) out.push('Reading has no list')
  if (/<\/?[a-z][^>]*>/i.test(d.reading)) out.push('Reading contains HTML')
  if (/https?:\/\//i.test(d.reading)) out.push('Reading contains a web address (the assistant must not invent links)')
  if (!/try|activity|this week|classroom/i.test(d.reading)) out.push('Reading has no practical classroom activity')
  if (d.videoPoints.length < 3) out.push('Fewer than 3 key points')
  if (!d.reflectionPrompt.trim()) out.push('No reflection prompt')
  if (/lorem ipsum|write the lesson here/i.test(d.reading)) out.push('Reading contains placeholder text')
  return out
}

export function checkQuiz(d: z.infer<typeof quizSchema>, expect: { count: number }): string[] {
  const out: string[] = []
  if (d.questions.length !== expect.count) out.push(`Wanted ${expect.count} questions, got ${d.questions.length}`)
  const positions = new Set(d.questions.map((q) => q.correct))
  if (d.questions.length >= 4 && positions.size < 3) out.push('The correct answer sits in the same few places (easy to guess)')
  for (const [i, q] of d.questions.entries()) {
    const lens = q.options.map((o) => o.length)
    if (Math.max(...lens) > 3 * Math.max(1, Math.min(...lens)) && Math.max(...lens) > 60) out.push(`Question ${i + 1}: option lengths are very uneven`)
    if (q.options.some((o) => /all of the above|none of the above/i.test(o))) out.push(`Question ${i + 1}: uses "all/none of the above"`)
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size < 4) out.push(`Question ${i + 1}: repeats an option`)
    if (!q.explanation.trim()) out.push(`Question ${i + 1}: no explanation`)
    if (!/\?$|:$|\.\.\.$|_{2,}/.test(q.question.trim())) out.push(`Question ${i + 1}: does not read as a question`)
  }
  return out
}

export function checkOutline(d: z.infer<typeof outlineSchema>, expect: { modules: number; lessonsPerModule: number }): string[] {
  const out: string[] = []
  if (d.modules.length !== expect.modules) out.push(`Wanted ${expect.modules} modules, got ${d.modules.length}`)
  for (const [i, m] of d.modules.entries()) {
    if (m.lessons.length !== expect.lessonsPerModule) out.push(`Module ${i + 1}: wanted ${expect.lessonsPerModule} lessons, got ${m.lessons.length}`)
    for (const l of m.lessons) if (!l.objective.trim()) out.push(`Lesson "${l.title}" has no objective`)
  }
  const titles = d.modules.flatMap((m) => m.lessons.map((l) => l.title.trim().toLowerCase()))
  if (new Set(titles).size !== titles.length) out.push('Two lessons share a title')
  if (!d.assignment.task.trim() || d.assignment.rubric.length < 3) out.push('The assignment needs a task and at least 3 rubric criteria')
  if (!d.certificate.subtitle.trim() || d.certificate.skills.length < 3) out.push('The certificate needs a subtitle and at least 3 skills')
  return out
}

const SWAHILI_WORDS = /\b(na|ya|wa|kwa|ni|za|la|katika|kuwa|hii|huu|hizi|cha|vya|kama)\b/gi
/** A translation keeps the Markdown shape of the source and actually reads as Kiswahili. */
export function checkTranslation(sourceText: string, translated: string): string[] {
  const out: string[] = []
  const heads = (s: string) => (s.match(/^#{1,6}\s/gm) ?? []).length
  const items = (s: string) => (s.match(/^\s*(?:[-*]|\d+\.)\s/gm) ?? []).length
  if (heads(sourceText) !== heads(translated)) out.push(`Heading count changed (${heads(sourceText)} to ${heads(translated)})`)
  if (Math.abs(items(sourceText) - items(translated)) > 1) out.push(`List item count changed (${items(sourceText)} to ${items(translated)})`)
  const hits = (translated.match(SWAHILI_WORDS) ?? []).length
  if (words(translated) >= 15 && hits / words(translated) < 0.08) out.push('Does not look like Kiswahili (too few common Kiswahili words)')
  const ratio = words(translated) / Math.max(1, words(sourceText))
  if (ratio < 0.6 || ratio > 1.8) out.push(`Length changed a lot (${Math.round(ratio * 100)}% of the original)`)
  return out
}
