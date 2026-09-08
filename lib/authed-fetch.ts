async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!deploymentUrl) return null
    const namespace = deploymentUrl.replace(/[^a-zA-Z0-9]/g, '')
    return localStorage.getItem(`__convexAuthJWT_${namespace}`)
  } catch {
    return null
  }
}

/**
 * Drop-in replacement for fetch() that automatically attaches
 * the current Convex Auth access token as an Authorization header.
 * Same-origin cookies remain the fallback during provider cutover.
 */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  const isSameOrigin = typeof window !== 'undefined'
    && new URL(url, window.location.href).origin === window.location.origin
  if (token && isSameOrigin && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(url, {
    ...init,
    headers,
  })
}

/**
 * Returns auth headers for use in custom fetch overrides (e.g. useChat transports).
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
