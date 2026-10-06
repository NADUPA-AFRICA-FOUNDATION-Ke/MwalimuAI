import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const dynamic = 'force-dynamic'

/** Liveness for the uptime monitor: the site is up and can reach its database. */
export async function GET() {
  const started = Date.now()
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  try {
    if (!url) throw new Error('no backend configured')
    const res = await new ConvexHttpClient(url).query(api.errors.ping, {})
    return Response.json({ ok: res.ok, backendMs: Date.now() - started }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
