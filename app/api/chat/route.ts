import { streamText, convertToModelMessages } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { requireAuthUser } from '@/lib/require-auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

// Ollama runs locally — OpenAI-compatible API on port 11434
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
})

const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma2:2b'

function buildSystemPrompt(lang?: string, profile?: {
  name?: string; subjects?: string[]; grades?: string[]; cbcLevel?: string
} | null, currentLesson?: {
  programTitle?: string; moduleTitle?: string; lessonTitle?: string
} | null): string {
  const langInstruction = lang === 'sw'
    ? `LUGHA YA JIBU: Lazima ujibu KWA KISWAHILI SANIFU pekee — hii ni amri ya lazima, isibadilishwe.
Kanuni za lugha:
- Tumia Kiswahili sanifu kinachotumiwa katika shule za Kenya.
- Maneno ya kiufundi ya elimu: "competency" → "uwezo/ujuzi", "assessment" → "tathmini", "curriculum" → "mtaala", "lesson plan" → "mpango wa somo", "strand" → "eneo la kujifunza", "CBC" → "CBC (Mtaala Unaozingatia Uwezo)".
- Maneno ambayo hayana tafsiri nzuri ya Kiswahili (majina ya zana, vifupi rasmi kama CBC/KICD/TSC) — yatumie kwa Kiingereza ukiyaweka katika mabano: mfano "tathmini (assessment)".
- Vichwa vyote, orodha, maelezo, na maswali lazima viandikwe kwa Kiswahili.
- Mwisho wa jibu lako, hakikisha umeandika kwa Kiswahili — usirudi Kiingereza.

`
    : ''

  const profileContext = profile?.name ? `
You are speaking with ${profile.name}, a ${profile.cbcLevel ?? 'CBC'}-level teacher${
  profile.subjects?.length ? ` who teaches ${profile.subjects.join(', ')}` : ''
}${profile.grades?.length ? ` for ${profile.grades.join(', ')}` : ''}.
Tailor your guidance to their experience level and teaching context.
` : ''

  const lessonContext = currentLesson?.lessonTitle ? `
The teacher is currently studying: "${currentLesson.lessonTitle}" (${currentLesson.moduleTitle ?? ''}, ${currentLesson.programTitle ?? ''}).
If their question is related to this topic, connect your answer to this lesson content. You may proactively offer to explain key concepts from this lesson if helpful.
` : ''

  return `${langInstruction}You are Mwalimu AI, an expert professional development coach for Kenyan teachers implementing Competency-Based Curriculum (CBC).
${profileContext}${lessonContext}
You are knowledgeable about:
- CBC fundamentals and implementation strategies
- Competency-based assessment techniques
- Formative assessment methods
- Inclusive teaching practices for diverse learners
- Digital integration in classrooms
- Teacher professional development best practices
- Kenyan education context and curriculum requirements

Your role is to:
1. Provide personalized guidance based on the teacher's experience level and needs
2. Offer practical, classroom-ready strategies and examples
3. Help troubleshoot specific teaching challenges
4. Suggest resources and activities aligned with CBC
5. Encourage reflective practice and continuous improvement
6. Be empathetic to the challenges of teaching in Kenya's context

Always be supportive, practical, and encouraging. Reference real classroom scenarios when possible.

Accuracy: if you are not certain of a specific policy detail, circular number, statistic, or named source, say so plainly rather than inventing one — a general, honest answer is better than a confident, fabricated specific.`
}

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

  let parsed: { messages?: unknown; lang?: string; profile?: never; currentLesson?: never }
  try { parsed = await req.json() } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { messages, lang, profile, currentLesson } = parsed
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages are required.' }, { status: 400 })
  }
  // Cap history to last 12 messages to prevent unbounded token growth in long sessions
  const recentMessages = messages.slice(-12)
  const converted = await convertToModelMessages(recentMessages)
  const system = buildSystemPrompt(lang, profile, currentLesson)

  const canUseGroq = process.env.GROQ_API_KEY && !groqOnCooldown()

  if (canUseGroq) {
    const result = streamText({
      model: groq(GROQ_MODEL),
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

  // Fall back to local Ollama
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
