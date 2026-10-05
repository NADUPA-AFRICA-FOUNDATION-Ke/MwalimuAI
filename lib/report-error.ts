import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

/** Server-side: record an error so staff see it in the console. Never throws; reporting must not cause errors. */
export async function reportServerError(source: 'server' | 'api', error: unknown, route?: string) {
  try {
    const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return
    const err = error instanceof Error ? error : new Error(String(error))
    await new ConvexHttpClient(url).mutation(api.errors.report, { source, message: err.message || err.name, stack: err.stack, route })
  } catch {
    /* ignore */
  }
}
