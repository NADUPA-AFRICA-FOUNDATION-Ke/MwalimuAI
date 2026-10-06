import { NextResponse } from 'next/server'
import dns from 'node:dns/promises'
import { ConvexHttpClient } from 'convex/browser'
import { ConvexError } from 'convex/values'
import { api } from '@/convex/_generated/api'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CATEGORIES = ['account', 'technical', 'payment', 'content', 'certificate', 'feedback', 'other'] as const

async function domainCanReceiveMail(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  if (!domain) return false
  try {
    if ((await dns.resolveMx(domain)).length > 0) return true
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    if (code !== 'ENODATA' && code !== 'ENOTFOUND') return true // a lookup problem on our side must not block a real person
  }
  // No MX record: mail servers fall back to the domain's own address.
  try {
    return (await dns.resolve4(domain)).length > 0
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    return code !== 'ENODATA' && code !== 'ENOTFOUND' ? true : false
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit)

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }

  // Honeypot: bots fill this field; silently accept without sending mail.
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ ok: true })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const startedAt = typeof body.startedAt === 'number' ? body.startedAt : 0

  if (startedAt > 0 && Date.now() - startedAt < 1500) {
    return NextResponse.json({ error: 'Please take a moment to complete the form.' }, { status: 400 })
  }
  if (name.length < 2 || name.length > 100 || !emailPattern.test(email) || subject.length < 3 || subject.length > 160 || message.length < 10 || message.length > 4000) {
    return NextResponse.json({ error: 'Please check the form and complete each field.' }, { status: 400 })
  }

  // Check that the address can plausibly receive mail (its domain exists and has a mail server), so a typo is caught
  // now instead of leaving a conversation nobody can be reached about. This does not prove the mailbox is theirs.
  if (!(await domainCanReceiveMail(email))) {
    return NextResponse.json({ error: 'That email address does not look right: its domain cannot receive mail. Please check it for typos.' }, { status: 400 })
  }

  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return NextResponse.json({ error: 'Support is temporarily unavailable. Please try again later.' }, { status: 503 })
  const category = CATEGORIES.find((c) => c === body.category) ?? 'other'
  try {
    const result = await new ConvexHttpClient(url).mutation(api.tickets.createPublic, { name, email, subject, body: message, category })
    return NextResponse.json({ ok: true, number: result.number, token: result.token })
  } catch (e) {
    const data = e instanceof ConvexError ? (e.data as { code?: string; message?: string }) : undefined
    if (data?.code === 'RATE_LIMITED') return NextResponse.json({ error: data.message }, { status: 429 })
    if (data?.code === 'INVALID_ARGUMENT') return NextResponse.json({ error: data.message }, { status: 400 })
    return NextResponse.json({ error: 'We could not send your message. Please try again later.' }, { status: 502 })
  }
}
