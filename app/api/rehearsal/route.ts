import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { requireAuthUser } from '@/lib/require-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
})
const GROQ_MODEL   = process.env.GROQ_MODEL   ?? 'openai/gpt-oss-20b'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma2:2b'

let groqFailedAt = 0
const GROQ_COOLDOWN_MS = 60_000
function markGroqFailed() { groqFailedAt = Date.now() }
function groqOnCooldown() { return Date.now() - groqFailedAt < GROQ_COOLDOWN_MS }

async function isOllamaAvailable(): Promise<boolean> {
  if (process.env.VERCEL) return false
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) })
    if (!res.ok) return false
    const { models } = (await res.json()) as { models: Array<{ name: string }> }
    const base = OLLAMA_MODEL.split(':')[0]
    return Array.isArray(models) && models.some(m =>
      m.name === OLLAMA_MODEL || m.name.startsWith(base + ':') || m.name === base,
    )
  } catch { return false }
}

// Truncate lesson plan to keep system prompt lean — the simulation only needs the topic/gist
const MAX_LESSON_PLAN_CHARS = 600

function buildSystem(lessonPlan: string, grade: string, lang?: string) {
  const langInstruction = lang === 'sw'
    ? `LUGHA: Jibu KWA KISWAHILI pekee — majibu yote ya darasa, maswali ya wanafunzi, na maoni lazima yaandikwe kwa Kiswahili. Mwalimu ataweza kujibu pia kwa Kiswahili. Tumia lugha ya kawaida ya watoto wa shule za Kenya — mchanganyiko wa Kiswahili sanifu na misemo ya kila siku darasani. Usirudi Kiingereza isipokuwa kwa majina ya vitu halisi (jina la darasa, nambari, n.k.).

`
    : ''

  const planSnippet = lessonPlan.length > MAX_LESSON_PLAN_CHARS
    ? lessonPlan.slice(0, MAX_LESSON_PLAN_CHARS) + '...'
    : lessonPlan

  return `${langInstruction}You are simulating a lively class of ${grade} learners in a Kenyan CBC classroom.

The teacher has shared this lesson plan:
---
${planSnippet}
---

Your role:
- Play the entire class as a group, not a single student
- After each teacher message, respond as the class would: mix of questions, confusion, enthusiasm, off-task comments, short answers, cheeky remarks
- Represent different learner types: the eager learner who always raises a hand, the confused one who asks "But teacher, I don't understand...", the quiet one who only speaks when called upon, the distracted one, the one who gives a surprisingly deep answer
- Keep responses natural and age-appropriate for ${grade} Kenyan learners
- Use Kenyan classroom language naturally (e.g. "Sawa teacher", "Yes teacher!", "Eh?", "I know I know!", "Teacher teacher teacher!")
- After 3-4 exchanges, include one simulated disruption or unexpected situation (a learner says something off-topic, two students start arguing quietly, someone asks to go to the bathroom at a key moment)
- Keep each response to 4–8 lines — a realistic classroom snapshot, not a novel

Start: When the teacher sends their first message (usually introducing the topic), respond as the class arriving, settling in, and reacting to the opening.`
}

export async function POST(req: Request) {
  const { userId, error: authError } = await requireAuthUser(req)
  if (authError) return authError

  const limit = rateLimit(`rehearsal:${userId}`, 60, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)

  let parsed: { messages?: unknown; lessonPlan?: string; grade?: string; lang?: string }
  try { parsed = await req.json() } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { messages, lessonPlan, grade, lang } = parsed
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages are required.' }, { status: 400 })
  }

  // Cap history to last 10 messages to prevent unbounded token growth
  const recentMessages = messages.slice(-10)
  const converted = await convertToModelMessages(recentMessages as Parameters<typeof convertToModelMessages>[0])
  const system    = buildSystem(lessonPlan ?? '', grade ?? 'Grade 4', lang)

  const canUseGroq = process.env.GROQ_API_KEY && !groqOnCooldown()

  if (canUseGroq) {
    const result = streamText({
      model: groq(GROQ_MODEL),
      system,
      messages: converted,
      temperature: 0.85,
      maxOutputTokens: 400,
      maxRetries: 0,
      onError({ error }: { error: unknown }) {
        const msg = String(error)
        if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('TooManyRequests')) {
          markGroqFailed()
        }
      },
    })
    const response = result.toUIMessageStreamResponse()
    response.headers.set('X-AI-Backend', 'groq')
    return response
  }

  const ollamaUp = await isOllamaAvailable()
  if (!ollamaUp) {
    return Response.json(
      { error: 'No AI backend available. Add GROQ_API_KEY to .env.local.' },
      { status: 503 },
    )
  }

  const result = streamText({
    model: ollama(OLLAMA_MODEL),
    system,
    messages: converted,
    temperature: 0.85,
    maxOutputTokens: 400,
    maxRetries: 0,
  })
  const response = result.toUIMessageStreamResponse()
  response.headers.set('X-AI-Backend', 'ollama')
  return response
}
