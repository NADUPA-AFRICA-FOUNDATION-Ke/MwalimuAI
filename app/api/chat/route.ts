import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { requireAuthUser } from '@/lib/require-auth'
import { consumeAi } from '@/lib/ai-guard'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { prepareImages } from '@/lib/ai-images'
import { buildSystemPrompt } from '@/lib/ai-prompt'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

// Ollama runs locally — OpenAI-compatible API on port 11434
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
})

const GROQ_MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b'
// Used only when the teacher attaches a photo.
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma2:2b'

// streamText errors happen asynchronously, so try/catch won't catch them.
// Track Groq failures so the NEXT request automatically falls back to Ollama.
let groqFailedAt = 0
const GROQ_COOLDOWN_MS = 60_000 // 1 minute

function markGroqFailed() {
  groqFailedAt = Date.now()
}

function groqOnCooldown() {
  return Date.now() - groqFailedAt < GROQ_COOLDOWN_MS
}

async function isOllamaAvailable(): Promise<boolean> {
  if (process.env.VERCEL) return false
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return false
    const { models } = (await res.json()) as { models: Array<{ name: string }> }
    const base = OLLAMA_MODEL.split(':')[0]
    return Array.isArray(models) && models.some(m => m.name === OLLAMA_MODEL || m.name.startsWith(base + ':') || m.name === base)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const { userId, error: authError } = await requireAuthUser(req)
  if (authError) return authError

  const limit = rateLimit(`chat:${userId}`, 60, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)
  const capped = await consumeAi(req, 'chat')
  if (capped) return capped

  let parsed: { messages?: unknown; lang?: string; profile?: never; currentLesson?: never; timeZone?: unknown }
  try { parsed = await req.json() } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { messages, lang, profile, currentLesson, timeZone } = parsed
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages are required.' }, { status: 400 })
  }
  // Cap history to last 12 messages to prevent unbounded token growth in long sessions
  const prepared = prepareImages(messages.slice(-12))
  if (prepared.error) return Response.json({ error: prepared.error }, { status: 400 })
  const recentMessages = prepared.messages
  const converted = await convertToModelMessages(recentMessages as Parameters<typeof convertToModelMessages>[0])
  const system = buildSystemPrompt(lang, profile, currentLesson, timeZone)

  const canUseGroq = process.env.GROQ_API_KEY && !groqOnCooldown()

  if (canUseGroq) {
    const result = streamText({
      model: groq(prepared.images ? GROQ_VISION_MODEL : GROQ_MODEL),
      system,
      messages: converted,
      temperature: 0.7,
      maxOutputTokens: 1000,
      maxRetries: 0,
      onError({ error }: { error: unknown }) {
        const msg = String(error)
        if (
          msg.includes('429') ||
          msg.includes('quota') ||
          msg.includes('rate_limit') ||
          msg.includes('rate limit') ||
          msg.includes('TooManyRequests')
        ) {
          markGroqFailed()
        }
      },
    })
    const response = result.toUIMessageStreamResponse()
    response.headers.set('X-AI-Backend', 'groq')
    return response
  }

  // Fall back to local Ollama (text only)
  if (prepared.images) return Response.json({ error: 'Photos need the online AI service, which is busy right now. Try again in a minute, or send your question without the photo.' }, { status: 503 })
  const ollamaUp = await isOllamaAvailable()
  if (!ollamaUp) {
    return Response.json(
      {
        error:
          'No AI backend available. Online: add GROQ_API_KEY to .env.local (free at console.groq.com). ' +
          'Offline: run "ollama pull gemma2:2b" to install a local model.',
      },
      { status: 503 }
    )
  }

  const result = streamText({
    model: ollama(OLLAMA_MODEL),
    system,
    messages: converted,
    temperature: 0.7,
    maxOutputTokens: 1000,
    maxRetries: 0,
  })
  const response = result.toUIMessageStreamResponse()
  response.headers.set('X-AI-Backend', 'ollama')
  return response
}
