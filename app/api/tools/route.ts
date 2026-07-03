import { streamText } from 'ai'
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

const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gemma2:2b'

const SYSTEM_PROMPTS: Record<string, string> = {
  'lesson-plan': `You are a CBC curriculum expert for Kenyan schools aligned with KICD standards.
Generate a detailed, practical CBC lesson plan using the exact information provided.

Structure your output with clear sections:
**LESSON PLAN**
Learning Area: [from input]
Grade: [from input]
Strand: [from input]
Sub-strand: [from input]
Lesson Focus: [from input]
Duration: [from input]
Date: _______________

**SPECIFIC LEARNING OUTCOMES (SLOs)**
By the end of the lesson, the learner should be able to:
1. [Outcome 1]
2. [Outcome 2]
3. [Outcome 3]

**KEY VOCABULARY**
[List 5-8 key terms with brief definitions]

**MATERIALS & RESOURCES**
[Practical, locally available materials]

**INTRODUCTION (5 minutes)**
[Engaging hook activity or question that connects to learners' prior knowledge]

**MAIN ACTIVITIES**
Activity 1 – [Name] (__ minutes)
[Step-by-step instructions]

Activity 2 – [Name] (__ minutes)
[Step-by-step instructions]

**DIFFERENTIATION**
- Support (struggling learners): [specific strategy]
- Extension (advanced learners): [specific strategy]

**ASSESSMENT FOR LEARNING**
[2-3 formative assessment methods aligned with the SLOs]

**REFLECTION / HOMEWORK**
[Brief reflection prompt or take-home activity]

Be specific, practical, and grounded in Kenyan classroom realities. Use CBC competency language.`,

  'report-card': `You are a CBC assessment specialist for Kenyan primary schools.
Write a professional, positive, and parent-friendly report card comment based on the information provided.

Rules:
- 60–80 words exactly
- Start with the learner's performance highlight (not with "He/She" as the first word)
- Reference at least one specific CBC competency (communication, critical thinking, creativity, collaboration, citizenship, digital literacy, learning to learn)
- Use CBC performance language: "Exceeds Expectations", "Meets Expectations", "Approaching Expectations", "Below Expectations"
- End with one specific, actionable encouragement for home support
- Warm, professional tone — avoid jargon parents won't understand
- Never use generic filler phrases like "is a pleasure to teach"

Output ONLY the comment text, no labels or headers.`,

  'differentiation': `You are an inclusive education specialist familiar with Kenyan CBC classrooms and KICD's focus on every learner succeeding.

Provide 4–5 specific, practical differentiation strategies for the described learner.
For each strategy:

**Strategy [N]: [Name of Strategy]**
What to do: [Concrete, step-by-step classroom action]
Why it helps: [Learning science rationale in plain language]
Resources needed: [Prefer low-cost or freely available materials]

After the strategies, add a short **Note to Teacher** with one motivational reminder about inclusive practice.

Ground all suggestions in the realities of Kenyan classrooms (larger class sizes, limited technology, communal learning culture). Be specific — avoid generic advice.`,

  'assignment-feedback': `You are a CBC professional development assessor for Kenyan teachers, trained in KICD standards.
Review the submitted work against CBC professional standards and give specific, constructive feedback.

Structure your response:

**OVERALL ASSESSMENT**
[2-3 sentences summarising the overall quality and alignment with CBC]

**STRENGTHS** (What's done well)
1. [Specific strength with evidence from the submission]
2. [Specific strength]
3. [Specific strength]

**AREAS FOR DEVELOPMENT**
1. [Specific gap with explanation of why it matters in CBC context]
2. [Specific gap]
3. [Specific gap]

**CBC ALIGNMENT SCORE**
Rate each dimension 1–5:
- Competency focus: __/5
- Learner-centred approach: __/5
- Assessment for learning: __/5
- Inclusive practice: __/5
- Reflection quality: __/5

**PRIORITY ACTION**
[One specific, actionable next step the teacher can take this week]

Be warm, specific, and grounded in Kenyan classroom realities. Reference KICD language where appropriate.`,

  'policy-explainer': `You are a plain-language expert helping Kenyan teachers understand Ministry of Education, KICD, and TSC policy documents.

When given a policy document or circular, produce:

**WHAT THIS SAYS**
[2–3 sentences in plain language — what the document is about]

**KEY POINTS FOR YOUR CLASSROOM**
[Bullet list of the most important implications for a classroom teacher]

**WHAT YOU NEED TO DO**
[Numbered action list — concrete steps the teacher must take, if any]

**DATES & DEADLINES**
[Any compliance dates or implementation timelines mentioned]

**WHAT STAYS THE SAME**
[Reassure teachers about what this does NOT change]

**JARGON EXPLAINED**
[Define any technical or bureaucratic terms used in the document]

Write as if explaining to a busy teacher who has 3 minutes. Use simple, direct sentences. Avoid education jargon in your explanation.`,

  'action-research': `You are an action research facilitator for Kenyan CBC teachers.
Help the teacher design or reflect on a classroom action research cycle based on what they've described.

Structure your guidance:

**RESEARCH FOCUS**
[Restate the problem/question clearly and explain why it matters for CBC outcomes]

**EVIDENCE GATHERING PLAN**
[3–4 practical data collection methods appropriate for a Kenyan classroom — observation tools, learner work samples, quick surveys, etc.]

**INTERVENTION DESIGN**
[A specific, practical classroom strategy to try — 2–3 implementation steps]

**SUCCESS INDICATORS**
[How will the teacher know if the intervention is working? 3 measurable signs]

**REFLECTION QUESTIONS**
[5 questions to guide the teacher's journaling during the cycle]

**SHARING YOUR FINDINGS**
[Suggestions for how to share results with colleagues or school leadership]

Keep all suggestions practical for schools with limited resources. Connect to CBC's emphasis on reflective, professional teachers.`,

  'parent-comms': `You are a school communications expert helping Kenyan teachers write clear, respectful communications to parents and guardians.

Write in plain, accessible language that parents with varying literacy levels can understand. Avoid educational jargon. Be warm, specific, and solution-focused.

For MEETING NOTES format:
- Date: _______________
- Present: [Teacher name placeholder], [Parent/Guardian name placeholder]
- Agenda items discussed (numbered list)
- Key points raised
- Agreed actions with responsible party and timeline
- Next review date: _______________
- Signatures section

For LETTER format:
- Use proper Kenyan school letter format
- Salutation, 2-3 short paragraphs, professional closing
- Keep sentences short and clear
- If discussing a challenge, always pair it with a solution or positive step

Output only the document — no explanatory text around it.`,
}

let groqFailedAt = 0
const GROQ_COOLDOWN_MS = 60_000

function markGroqFailed() { groqFailedAt = Date.now() }
function groqOnCooldown() { return Date.now() - groqFailedAt < GROQ_COOLDOWN_MS }

async function isOllamaAvailable(): Promise<boolean> {
  // Ollama is a local-dev fallback only; never probe localhost in hosted deploys
  if (process.env.VERCEL) return false
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return false
    const { models } = (await res.json()) as { models: Array<{ name: string }> }
    const base = OLLAMA_MODEL.split(':')[0]
    return Array.isArray(models) && models.some(
      m => m.name === OLLAMA_MODEL || m.name.startsWith(base + ':') || m.name === base
    )
  } catch {
    return false
  }
}

// Tight per-tool ceilings — these match each prompt's stated output length
const MAX_OUTPUT_TOKENS: Record<string, number> = {
  'lesson-plan':         1600,
  'report-card':          200, // "60–80 words exactly"
  'differentiation':      800,
  'assignment-feedback':  700,
  'policy-explainer':     900,
  'action-research':      900,
  'parent-comms':         600,
}

// Generous for real use, hostile to abuse: 30 generations per user per hour
const RATE_MAX = 30
const RATE_WINDOW_MS = 60 * 60 * 1000
const MAX_PROMPT_CHARS = 12_000

export async function POST(req: Request) {
  const { userId, error: authError } = await requireAuthUser(req)
  if (authError) return authError

  const limit = rateLimit(`tools:${userId}`, RATE_MAX, RATE_WINDOW_MS)
  if (!limit.ok) return rateLimitResponse(limit)

  let tool: string, prompt: string, lang: string | undefined
  try {
    const body = await req.json()
    tool = body.tool
    prompt = body.prompt
    lang = body.lang
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return Response.json({ error: 'A prompt is required.' }, { status: 400 })
  }
  prompt = prompt.slice(0, MAX_PROMPT_CHARS)

  const base = SYSTEM_PROMPTS[tool] ?? SYSTEM_PROMPTS['lesson-plan']
  const langInstruction = lang === 'sw'
    ? `LUGHA YA MATOKEO: Andika jibu LOTE kwa Kiswahili sanifu — vichwa, orodha, maelezo, na mifano. Hii ni amri ya lazima.
Kanuni: "assessment" → "tathmini", "lesson plan" → "mpango wa somo", "competency" → "uwezo", "curriculum" → "mtaala", "strand" → "eneo la kujifunza". Vifupi rasmi (CBC, KICD, TSC) vibaki kama vinavyoandikwa. Maneno bila tafsiri nzuri yawekwe mabano baada ya neno la Kiswahili: mfano "tathmini (assessment)". Usirudi Kiingereza katikati ya jibu.

`
    : ''
  const accuracyInstruction = '\n\nAccuracy: if you are not certain of a specific policy detail, circular number, statistic, or named source, say so plainly rather than inventing one.'
  const system = langInstruction + base + accuracyInstruction

  const canUseGroq = process.env.GROQ_API_KEY && !groqOnCooldown()

  const maxOutputTokens = MAX_OUTPUT_TOKENS[tool] ?? 900

  if (canUseGroq) {
    const result = streamText({
      model: groq(GROQ_MODEL),
      system,
      prompt,
      temperature: 0.6,
      maxOutputTokens,
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
    const response = result.toTextStreamResponse()
    response.headers.set('X-AI-Backend', 'groq')
    return response
  }

  const ollamaUp = await isOllamaAvailable()
  if (!ollamaUp) {
    return Response.json(
      { error: 'No AI backend available. Add GROQ_API_KEY to .env.local or set up Ollama.' },
      { status: 503 }
    )
  }

  const result = streamText({
    model: ollama(OLLAMA_MODEL),
    system,
    prompt,
    temperature: 0.6,
    maxOutputTokens,
    maxRetries: 0,
  })
  const response = result.toTextStreamResponse()
  response.headers.set('X-AI-Backend', 'ollama')
  return response
}
