import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { requireAuthUser } from '@/lib/require-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY })
const ollama = createOpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' })
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma2:2b'

let groqFailedAt = 0
function markGroqFailed() { groqFailedAt = Date.now() }
function groqOnCooldown() { return Date.now() - groqFailedAt < 60_000 }

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) })
    if (!res.ok) return false
    const { models } = await res.json() as { models: { name: string }[] }
    const base = OLLAMA_MODEL.split(':')[0]
    return models.some(m => m.name === OLLAMA_MODEL || m.name.startsWith(base + ':') || m.name === base)
  } catch { return false }
}

export async function POST(req: Request) {
  const { userId, error: authError } = await requireAuthUser(req)
  if (authError) return authError

  const limit = rateLimit(`assignment-review:${userId}`, 20, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)

  let parsed: { assignment?: string; submission?: string; rubric?: unknown; lang?: string }
  try { parsed = await req.json() } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { lang } = parsed
  const assignment = typeof parsed.assignment === 'string' ? parsed.assignment.slice(0, 4000) : ''
  const submission = typeof parsed.submission === 'string' ? parsed.submission.slice(0, 8000) : ''
  const rubric = Array.isArray(parsed.rubric) ? parsed.rubric.filter((r): r is string => typeof r === 'string').slice(0, 10) : []
  if (!submission.trim()) {
    return Response.json({ error: 'A submission is required.' }, { status: 400 })
  }

  const langLine = lang === 'sw' ? 'IMPORTANT: Respond in Kiswahili.\n\n' : ''

  const system = `${langLine}You are an expert teacher educator and CBC specialist reviewing a reflective assignment submitted by a Kenyan teacher.

Your job is to give warm, specific, constructive feedback that:
1. Acknowledges genuine strengths — be specific about what worked well
2. Asks 1–2 reflective questions to deepen thinking
3. Suggests one concrete improvement or next step
4. Encourages continued growth

The assignment rubric criteria are:
${rubric.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Be warm but honest. This is a professional learning environment. Avoid generic praise — specific feedback is more valuable. Keep your response to 200–300 words.`

  const prompt = `Assignment: ${assignment}

Teacher's submission:
${submission}`

  const canUseGroq = process.env.GROQ_API_KEY && !groqOnCooldown()

  if (canUseGroq) {
    const result = streamText({
      model: groq(GROQ_MODEL), system, prompt,
      temperature: 0.6, maxOutputTokens: 500, maxRetries: 0,
      onError({ error }: { error: unknown }) {
        if (String(error).match(/429|quota|rate_limit|TooMany/)) markGroqFailed()
      },
    })
    return result.toTextStreamResponse()
  }

  const ollamaUp = await isOllamaAvailable()
  if (!ollamaUp) {
    return Response.json({ error: 'No AI backend available. Add GROQ_API_KEY to .env.local.' }, { status: 503 })
  }

  const result = streamText({ model: ollama(OLLAMA_MODEL), system, prompt, temperature: 0.6, maxOutputTokens: 500, maxRetries: 0 })
  return result.toTextStreamResponse()
}
