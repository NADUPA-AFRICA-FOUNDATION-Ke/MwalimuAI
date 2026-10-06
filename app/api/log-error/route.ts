import { reportServerError } from '@/lib/report-error'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { rateLimit } from '@/lib/rate-limit'

/** Receives browser error reports. Public by necessity (errors happen signed out too), so it is small and rate limited. */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`log-error:${ip}`, 20, 60_000).ok) return new Response(null, { status: 204 })
  let body: { message?: unknown; stack?: unknown; route?: unknown }
  try {
    const raw = await req.text()
    if (raw.length > 8000) return new Response(null, { status: 204 })
    body = JSON.parse(raw)
  } catch {
    return new Response(null, { status: 204 })
  }
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || typeof body.message !== 'string') return new Response(null, { status: 204 })
  try {
    await new ConvexHttpClient(url).mutation(api.errors.report, {
      source: 'browser',
      message: body.message.slice(0, 600),
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 2500) : undefined,
      route: typeof body.route === 'string' ? body.route.slice(0, 200) : undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })
  } catch (e) {
    void reportServerError('api', e, '/api/log-error')
  }
  return new Response(null, { status: 204 })
}
