import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { rateLimit } from '@/lib/rate-limit'

const page = (title: string, body: string, form?: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f7f5;color:#1c2a25"><main style="max-width:480px;margin:10vh auto;padding:24px;background:#fff;border:1px solid #dfe8e3;border-radius:12px">
<p style="font-weight:700;color:#0e5c42;margin:0 0 12px">Mwalimu AI</p><h1 style="font-size:20px;margin:0 0 12px">${title}</h1><p style="line-height:1.5">${body}</p>${form ?? ''}
<p style="margin-top:20px"><a href="/" style="color:#0e5c42">Back to Mwalimu AI</a></p></main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )

async function unsubscribe(token: string) {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !token) return false
  try {
    return await new ConvexHttpClient(url).mutation(api.emails.unsubscribe, { token })
  } catch {
    return false
  }
}

const tokenOf = (req: Request) => new URL(req.url).searchParams.get('t') ?? ''
const escapeAttr = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** The link in each email opens a confirmation page: opening a link must not unsubscribe by itself (mail scanners open links). */
export async function GET(req: Request) {
  const t = tokenOf(req)
  if (!t) return page('This link is not valid', 'Open the unsubscribe link from one of our emails, or change your email settings in the app under Settings.')
  return page(
    'Stop emails from Mwalimu AI?',
    'You will no longer get streak reminders, weekly summaries, or emails about support tickets and certificates. You can turn any of them back on in Settings.',
    `<form method="post" action="/api/unsubscribe?t=${encodeURIComponent(escapeAttr(t))}" style="margin-top:16px"><button type="submit" style="background:#0e5c42;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-weight:700;font-size:15px;cursor:pointer">Yes, unsubscribe me</button></form>`,
  )
}

/** Also what mail apps call for one-click unsubscribe (RFC 8058). */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`unsub:${ip}`, 20, 60_000).ok) return new Response('Too many requests', { status: 429 })
  const ok = await unsubscribe(tokenOf(req))
  const accepts = req.headers.get('accept') ?? ''
  if (!accepts.includes('text/html')) return new Response(null, { status: ok ? 200 : 400 })
  return ok
    ? page('You are unsubscribed', 'We will not send you any more emails. You can turn them back on in Settings whenever you like.')
    : page('That link did not work', 'It may be old or damaged. You can change your email settings in the app under Settings.')
}
