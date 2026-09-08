import { generateText } from 'ai'
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

const SYSTEM = `You are an AI-content detection specialist. Your job is to assess whether a given piece of educational writing was likely produced by an AI writing tool.

Analyse the text for these indicators of AI-generated content:
1. Unusually uniform sentence length and structure
2. Formulaic phrasing ("It is important to note that...", "In conclusion...", "Furthermore...")
3. Absence of personal voice, specific student names, or real classroom anecdotes
4. Perfectly balanced lists — exactly 3 points per section with identical structure
5. Overly formal register that doesn't match typical teacher writing
6. Generic statements that could apply to any classroom, any teacher
7. Suspiciously comprehensive coverage with no gaps or uncertainty
8. Lack of spelling mistakes, informal contractions, or natural imperfections

Respond ONLY with a JSON object in this exact format (no markdown, no explanation outside the JSON):
{
  "score": <integer 0–100, where 100 = almost certainly AI-generated>,
  "verdict": "<one of: 'Likely AI-generated' | 'Possibly AI-assisted' | 'Appears human-written'>",
  "flags": [<array of up to 5 short strings describing specific signals found>],
  "summary": "<1–2 sentence plain-English explanation for the teacher>"
}`

export interface DetectionResult {
  score:   number
  verdict: 'Likely AI-generated' | 'Possibly AI-assisted' | 'Appears human-written'
  flags:   string[]
  summary: string
}

export async function POST(req: Request) {
  const { userId, error: authError } = await requireAuthUser(req)
  if (authError) return authError

  const limit = rateLimit(`detect-ai:${userId}`, 30, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)

  let parsed: { text?: unknown }
  try { parsed = await req.json() } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const text = typeof parsed.text === 'string' ? parsed.text : ''

  if (!text || text.trim().length < 50) {
    return Response.json({ error: 'Text too short to analyse' }, { status: 400 })
  }

  const prompt = `Analyse this teacher-submitted work for AI-generation indicators:\n\n---\n${text.slice(0, 3000)}\n---`

  const canUseGroq = process.env.GROQ_API_KEY

  try {
    const model = canUseGroq ? groq(GROQ_MODEL) : (await isOllamaAvailable() ? ollama(OLLAMA_MODEL) : null)
    if (!model) {
      return Response.json({ error: 'No AI backend available' }, { status: 503 })
    }

    const { text: raw } = await generateText({
      model,
      system: SYSTEM,
      prompt,
      temperature: 0.1,
      maxOutputTokens: 400,
      maxRetries: 1,
    })

    // Extract JSON from the response (guard against any surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const result = JSON.parse(jsonMatch[0]) as DetectionResult

    // Clamp score to 0–100
    result.score = Math.max(0, Math.min(100, Math.round(result.score)))

    return Response.json(result)
  } catch {
    return Response.json({ error: 'Detection failed' }, { status: 500 })
  }
}
