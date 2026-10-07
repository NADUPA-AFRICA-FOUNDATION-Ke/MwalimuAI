import { describe, expect, it } from 'vitest'
import { prepareImages } from '@/lib/ai-images'

const img = (type = 'image/jpeg', body = 'AAAA') => ({ type: 'file', mediaType: type, url: `data:${type};base64,${body}` })
const user = (...parts: { type: string; mediaType?: string; url?: string }[]) => ({ role: 'user', parts: [{ type: 'text', text: 'hi' }, ...parts] })

describe('AI coach photo rules', () => {
  it('keeps photos on the newest user message and drops older ones', () => {
    const r = prepareImages([user(img()), { role: 'assistant', parts: [{ type: 'text', text: 'ok' }] }, user(img())])
    expect(r.images).toBe(1)
    expect(r.messages[0].parts!.some((p) => p.type === 'file')).toBe(false)
  })
  it('refuses remote links, other types, too many and too large', () => {
    expect(prepareImages([user({ type: 'file', mediaType: 'image/jpeg', url: 'https://evil.example/x.jpg' })]).error).toMatch(/JPG/)
    expect(prepareImages([user(img('image/gif'))]).error).toMatch(/JPG/)
    expect(prepareImages([user(img(), img(), img())]).error).toMatch(/up to 2/)
    expect(prepareImages([user(img('image/png', 'A'.repeat(2_200_000)))]).error).toMatch(/too large/)
  })
  it('passes text-only chats through untouched', () => {
    expect(prepareImages([user()]).images).toBe(0)
  })
})
