import { ConvexHttpClient, } from 'convex/browser'
import { ConvexError } from 'convex/values'
import { api } from '@/convex/_generated/api'

/**
 * Counts one AI request against the learner's daily allowance (and the platform ceiling) before any money is spent.
 * Returns a ready-made response when the request must stop, or null when it may proceed.
 */
export async function consumeAi(req: Request, tool: string): Promise<Response | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
  if (!token || !url) return Response.json({ error: 'Please sign in again.', code: 'unauthenticated' }, { status: 401 })
  try {
    const client = new ConvexHttpClient(url)
    client.setAuth(token)
    await client.mutation(api.aiUsage.consume, { tool })
    return null
  } catch (e) {
    const data = e instanceof ConvexError ? (e.data as { code?: string; message?: string }) : undefined
    if (data?.code === 'AI_LIMIT') return Response.json({ error: data.message, code: 'ai_limit' }, { status: 429 })
    if (data?.code === 'AI_PAUSED' || data?.code === 'AI_BUSY') return Response.json({ error: data.message, code: 'ai_unavailable' }, { status: 503 })
    if (data?.code === 'ACCOUNT_SUSPENDED') return Response.json({ error: data.message, code: 'suspended' }, { status: 403 })
    console.error('[ai-guard]', e instanceof Error ? e.message : e)
    return Response.json({ error: 'The AI tools are unavailable right now. Please try again in a moment.', code: 'ai_unavailable' }, { status: 503 })
  }
}
