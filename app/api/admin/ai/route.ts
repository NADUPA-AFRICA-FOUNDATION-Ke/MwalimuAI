import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { ConvexHttpClient } from 'convex/browser'
import type { ZodType } from 'zod'
import { api } from '@/convex/_generated/api'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { reportServerError } from '@/lib/report-error'
import {
  IMPROVE_ACTIONS, SYSTEM, improvePrompt, improveSchema, lessonPrompt, lessonSchema, outlinePrompt, outlineSchema,
  parseJsonLoose, postPrompt, postSchema, translatePrompt, TRANSLATE_SCHEMAS, type TranslateKind, quizPrompt, quizSchema, recommendPrompt, recommendSchema, reviewPrompt, reviewSchema,
  type ImproveAction,
} from '@/lib/admin-ai'

export const maxDuration = 60

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })

function model() {
  if (process.env.ADMIN_AI_PROVIDER === 'google') return google(process.env.ADMIN_AI_MODEL ?? 'gemini-2.5-flash')
  return groq(process.env.ADMIN_AI_MODEL ?? process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b')
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

/** Only signed-in, MFA-verified staff with the right permission may use the assistant. */
async function staffFor(req: Request, permission: string) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!token || !url) return { error: json({ error: 'Please sign in again.', code: 'unauthenticated' }, 401) }
  try {
    const client = new ConvexHttpClient(url)
    client.setAuth(token)
    const me = await client.query(api.admin.me.me, {})
    if (me.state !== 'ready') return { error: json({ error: 'Staff sign-in is not complete.', code: 'unauthenticated' }, 401) }
    if (!(me.permissions as string[]).includes(permission)) return { error: json({ error: 'Your role cannot use this tool.', code: 'forbidden' }, 403) }
    return { client, email: me.email }
  } catch {
    return { error: json({ error: 'Please sign in again.', code: 'unauthenticated' }, 401) }
  }
}

/** Asks the model for JSON, validates it, and retries once with the validation error if it was off. */
async function generate<T>(schema: ZodType<T>, prompt: string, maxOutputTokens: number, temperature = 0.4): Promise<T> {
  let lastError = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model: model(),
      system: SYSTEM,
      prompt: attempt === 0 ? prompt : `${prompt}\n\nYour previous reply was rejected: ${lastError}. Return corrected JSON only.`,
      temperature,
      maxOutputTokens,
      abortSignal: AbortSignal.timeout(50_000),
    })
    try {
      const parsed = schema.safeParse(parseJsonLoose(text))
      if (parsed.success) return parsed.data
      lastError = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'invalid JSON'
    }
  }
  throw new Error(`The assistant's reply could not be used (${lastError})`)
}

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }
  const task = text(body.task, 40)
  const LIMITS: Record<string, [number, string]> = {
    path_outline: [20, 'content.edit'], lesson: [80, 'content.edit'], quiz: [40, 'content.edit'],
    improve: [100, 'content.edit'], post: [30, 'content.edit'], translate: [400, 'content.edit'], review: [80, 'content.edit'], recommend: [20, 'analytics.read'],
  }
  const rule = LIMITS[task]
  if (!rule) return json({ error: 'Unknown task.' }, 400)

  const staff = await staffFor(req, rule[1])
  if (staff.error) return staff.error
  const limit = rateLimit(`admin-ai:${task}:${staff.email}`, rule[0], 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)
  if (!process.env.GROQ_API_KEY && process.env.ADMIN_AI_PROVIDER !== 'google')
    return json({ error: 'The AI assistant is not set up yet. Ask a Super Admin to add the AI key.', code: 'ai_unavailable' }, 503)

  try {
    let data: unknown
    if (task === 'path_outline') {
      data = await generate(
        outlineSchema,
        outlinePrompt({
          topic: text(body.topic, 300), audience: text(body.audience, 100) || 'All teachers', outcomes: text(body.outcomes, 1000),
          modules: num(body.modules, 1, 8, 3), lessonsPerModule: num(body.lessonsPerModule, 1, 6, 3), notes: text(body.notes, 1000),
        }),
        6000,
      )
    } else if (task === 'lesson') {
      data = await generate(
        lessonSchema,
        lessonPrompt({
          path: text(body.path, 200), module: text(body.module, 200), title: text(body.title, 200), objective: text(body.objective, 500),
          audience: text(body.audience, 100), outline: text(body.outline, 1500), existing: text(body.existing, 6000),
        }),
        6000,
      )
    } else if (task === 'quiz') {
      data = await generate(
        quizSchema,
        quizPrompt({
          path: text(body.path, 200), kind: body.kind === 'pre' ? 'pre' : 'post', count: num(body.count, 1, 15, 8),
          difficulty: body.difficulty === 'easy' || body.difficulty === 'hard' ? body.difficulty : 'mixed', context: text(body.context, 14000),
        }),
        5000,
        0.3,
      )
    } else if (task === 'translate') {
      const kind = text(body.kind, 20) as TranslateKind
      if (!(kind in TRANSLATE_SCHEMAS)) return json({ error: 'Unknown kind.' }, 400)
      if (!body.source || typeof body.source !== 'object') return json({ error: 'There is nothing to translate.' }, 400)
      data = await generate(TRANSLATE_SCHEMAS[kind] as ZodType<unknown>, translatePrompt(kind, body.source), 8000, 0.2)
    } else if (task === 'post') {
      data = await generate(postSchema, postPrompt({ topic: text(body.topic, 300), audience: text(body.audience, 100), notes: text(body.notes, 1500), existing: text(body.existing, 8000) }), 6000)
    } else if (task === 'improve') {
      const action = text(body.action, 20) as ImproveAction
      if (!(action in IMPROVE_ACTIONS)) return json({ error: 'Unknown action.' }, 400)
      if (!text(body.text, 30000).trim()) return json({ error: 'There is no text to improve.' }, 400)
      data = await generate(improveSchema, improvePrompt(action, text(body.text, 30000)), 8000, 0.3)
    } else if (task === 'review') {
      data = await generate(reviewSchema, reviewPrompt(text(body.kind, 40) || 'content', text(body.content, 20000)), 3000, 0.2)
    } else {
      data = await generate(recommendSchema, recommendPrompt(text(body.evidence, 12000)), 3000, 0.4)
    }
    // Leave an audit trail of AI use (content tasks only).
    if (task !== 'recommend') {
      void staff.client.mutation(api.admin.contentBuilder.logAiUse, { task, subject: text(body.title ?? body.topic ?? body.kind, 120) }).catch(() => {})
    }
    return json({ ok: true, data })
  } catch (e) {
    console.error('[admin-ai]', task, e instanceof Error ? e.message : e)
    void reportServerError('api', e, `/api/admin/ai:${task}`)
    return json({ error: 'The AI assistant could not finish that. Please try again.', code: 'ai_failed' }, 502)
  }
}
