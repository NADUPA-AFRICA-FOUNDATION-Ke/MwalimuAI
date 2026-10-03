/**
 * Per-user fixed-window rate limiter.
 *
 * In-memory: counts reset whenever the serverless instance recycles, so this
 * is best-effort abuse damping rather than a hard guarantee. It still stops
 * the realistic attack (a loop hammering one warm instance). For a durable
 * cross-instance limit, swap the Map for Upstash Redis (@upstash/ratelimit)
 * without changing the call sites.
 */

interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 5000

function pruneExpired(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  pruneExpired(now)

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const ok = bucket.count <= max
  return {
    ok,
    remaining: Math.max(0, max - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

/** 429 response with a Retry-After header. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.', code: 'rate_limited' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds),
      },
    },
  )
}
