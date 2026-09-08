import { NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
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
  if (name.length < 2 || name.length > 100 || !emailPattern.test(email) || subject.length < 3 || subject.length > 160 || message.length < 10 || message.length > 5000) {
    return NextResponse.json({ error: 'Please check the form and complete each field.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Support email is temporarily unavailable. Please email support@mwalimu.ai.' }, { status: 503 })

  const from = process.env.AUTH_EMAIL_FROM ?? 'Mwalimu AI <onboarding@resend.dev>'
  const to = process.env.SUPPORT_EMAIL ?? 'support@mwalimu.ai'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[Mwalimu AI contact] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<h2>${escapeHtml(subject)}</h2><p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    }),
  })

  if (!response.ok) return NextResponse.json({ error: 'We could not send your message. Please try again later.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
