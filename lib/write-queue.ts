// Central registry of in-flight Supabase write promises.
//
// trackWrite() — register a promise before fire-and-forget dispatch. Returns
// the same promise so callers who care about the outcome (e.g. a save button
// that should show an error) can await it; callers who don't can ignore it.
// flushWrites() — await all pending writes up to `timeoutMs`.
//
// signOut() calls flushWrites() so the session token is never invalidated
// while a write is still in flight.

import { toast } from 'sonner'

const pending = new Set<Promise<unknown>>()

// Cloud writes are frequent (every keystroke-adjacent save, toggle, etc.) —
// a burst of failures (e.g. offline) should surface once, not spam a toast
// per write.
let lastErrorToastAt = 0
function notifyWriteFailed() {
  const now = Date.now()
  if (now - lastErrorToastAt < 4000) return
  lastErrorToastAt = now
  toast.error("Couldn't save to the cloud", {
    description: 'Your change is kept on this device and will sync once the connection is back.',
  })
}

export function trackWrite<T>(p: PromiseLike<T>): Promise<T> {
  const normalized = Promise.resolve(p)
  pending.add(normalized)
  normalized
    .then((result: unknown) => {
      if (result && typeof result === 'object' && 'error' in result && (result as { error: unknown }).error) {
        console.error('[mwalimu] Supabase write failed:', (result as { error: unknown }).error)
        notifyWriteFailed()
      }
    })
    .catch((err: unknown) => {
      console.error('[mwalimu] Supabase write threw:', err)
      notifyWriteFailed()
    })
    .finally(() => pending.delete(normalized))
  return normalized
}

export async function flushWrites(timeoutMs = 3000): Promise<void> {
  if (pending.size === 0) return
  await Promise.race([
    Promise.allSettled([...pending]),
    new Promise<void>(r => setTimeout(r, timeoutMs)),
  ])
}
