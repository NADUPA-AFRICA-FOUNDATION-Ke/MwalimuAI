import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

function unauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
}

export async function requireAuth(req: Request): Promise<Response | null> {
  const result = await requireAuthUser(req)
  return result.error
}

export async function requireAuthUser(req: Request): Promise<{ userId: string | null; error: Response | null }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!token || !url) return { userId: null, error: unauthorized() }
  try {
    const client = new ConvexHttpClient(url)
    client.setAuth(token)
    const profile = await client.query(api.profiles.me, {})
    return profile ? { userId: profile.legacySupabaseUserId ?? profile._id, error: null } : { userId: null, error: unauthorized() }
  } catch {
    return { userId: null, error: unauthorized() }
  }
}
