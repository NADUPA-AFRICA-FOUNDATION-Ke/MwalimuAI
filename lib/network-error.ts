/**
 * True when a request failed because it never got a response (offline, dropped mobile signal, connection reset),
 * as opposed to the server answering with an error. Browsers word this differently.
 */
export function isNetworkFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed|internet connection appears to be offline/i.test(msg)
}

export const NETWORK_MESSAGE = 'Can’t reach Mwalimu AI. Check your internet connection and try again.'

/** Runs `fn`, retrying only when the connection dropped (never when the server said no). */
export async function retryOnNetworkFailure<T>(fn: () => Promise<T>, delaysMs: number[] = [1000, 3000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (!isNetworkFailure(e) || attempt >= delaysMs.length) throw e
      await new Promise((r) => setTimeout(r, delaysMs[attempt]))
    }
  }
}
