import { z } from 'zod'
import { authedFetch } from '@/lib/authed-fetch'
import type { improveSchema, lessonSchema, outlineSchema, quizSchema, recommendSchema, reviewSchema, ImproveAction } from '@/lib/admin-ai'

export type Outline = z.infer<typeof outlineSchema>
export type LessonDraft = z.infer<typeof lessonSchema>
export type QuizDraft = z.infer<typeof quizSchema>
export type ReviewResult = z.infer<typeof reviewSchema>
export type Ideas = z.infer<typeof recommendSchema>

type Tasks = {
  path_outline: { params: { topic: string; audience: string; outcomes?: string; modules: number; lessonsPerModule: number; notes?: string }; result: Outline }
  lesson: { params: { path: string; module: string; title: string; objective?: string; audience?: string; outline?: string; existing?: string }; result: LessonDraft }
  quiz: { params: { path: string; kind: 'pre' | 'post'; count: number; difficulty: 'easy' | 'mixed' | 'hard'; context: string }; result: QuizDraft }
  improve: { params: { action: ImproveAction; text: string }; result: z.infer<typeof improveSchema> }
  review: { params: { kind: string; content: string }; result: ReviewResult }
  recommend: { params: { evidence: string }; result: Ideas }
}

/** Calls the AI assistant. Throws an Error whose message is safe to show to staff. */
export async function askAi<K extends keyof Tasks>(task: K, params: Tasks[K]['params']): Promise<Tasks[K]['result']> {
  let res: Response
  try {
    res = await authedFetch('/api/admin/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, ...params }) })
  } catch {
    throw new Error('Could not reach the AI assistant. Check your connection and try again.')
  }
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: Tasks[K]['result']; error?: string }
  if (!res.ok || !body.ok || !body.data) {
    if (res.status === 429) throw new Error('You have used the assistant a lot this hour. Please wait a little and try again.')
    throw new Error(body.error ?? 'The AI assistant could not finish that. Please try again.')
  }
  return body.data
}
