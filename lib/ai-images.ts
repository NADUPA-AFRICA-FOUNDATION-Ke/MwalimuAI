/**
 * Server rules for photos sent to the AI coach: only on the newest user message, at most 2, JPEG/PNG/WebP data
 * URLs only (no remote links the server would fetch), about 1.5 MB each. Photos on earlier messages are dropped
 * so long chats stay cheap. Returns the cleaned messages, or an error message for the teacher.
 */
export const AI_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGES = 2
const MAX_DATA_URL = 2_100_000 // ≈1.5 MB of picture once base64-encoded

type Part = { type: string; mediaType?: string; url?: string; [k: string]: unknown }
type Msg = { role: string; parts?: Part[]; [k: string]: unknown }

export function prepareImages(messages: Msg[]): { messages: Msg[]; images: number; error?: string } {
  const lastUser = messages.map((m) => m.role).lastIndexOf('user')
  let images = 0
  const out = messages.map((m, i) => {
    if (!Array.isArray(m.parts)) return m
    const parts = m.parts.filter((p) => p?.type !== 'file' || i === lastUser)
    return { ...m, parts }
  })
  for (const p of (out[lastUser]?.parts ?? []) as Part[]) {
    if (p.type !== 'file') continue
    const url = typeof p.url === 'string' ? p.url : ''
    const type = typeof p.mediaType === 'string' ? p.mediaType : ''
    if (!AI_IMAGE_TYPES.includes(type) || !url.startsWith(`data:${type};base64,`)) return { messages, images: 0, error: 'Only JPG, PNG or WebP photos can be sent.' }
    if (url.length > MAX_DATA_URL) return { messages, images: 0, error: 'That photo is too large. Try a smaller one.' }
    images++
  }
  if (images > MAX_IMAGES) return { messages, images: 0, error: `Send up to ${MAX_IMAGES} photos at a time.` }
  return { messages: out, images }
}
