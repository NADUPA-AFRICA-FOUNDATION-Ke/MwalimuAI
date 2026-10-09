/**
 * For text-only AI features (the lesson rehearsal): keep user and assistant turns and their plain text, nothing else.
 * File or image parts are dropped, so the AI SDK never downloads a URL a learner supplied (it fetches unsupported file
 * URLs from the server), and client-forged system turns cannot reach the model. Text is capped per message.
 */
type Part = { type?: unknown; text?: unknown }
type Msg = { role?: unknown; parts?: unknown; [k: string]: unknown }

type TextMsg = { id: string; role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] }

export function textOnlyMessages(messages: unknown[], maxChars = 4000): TextMsg[] {
  const out: TextMsg[] = []
  for (const [i, raw] of messages.entries()) {
    const m = (raw ?? {}) as Msg
    const role = m.role
    if (role !== 'user' && role !== 'assistant') continue
    const parts = (Array.isArray(m.parts) ? (m.parts as Part[]) : [])
      .filter((p) => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => ({ type: 'text' as const, text: (p.text as string).slice(0, maxChars) }))
    if (parts.length === 0) continue
    out.push({ id: typeof m.id === 'string' ? m.id : String(i), role, parts })
  }
  return out
}
