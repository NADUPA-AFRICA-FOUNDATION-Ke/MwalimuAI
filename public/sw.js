// Mwalimu AI — Service Worker
// Strategy: cache-first for immutable assets, network-first for pages.
// Increment CACHE_VERSION whenever a breaking schema change needs a clean slate.
const CACHE_VERSION = '3'
const STATIC_CACHE  = `mwalimu-static-v${CACHE_VERSION}`
const PAGES_CACHE   = `mwalimu-pages-v${CACHE_VERSION}`
const ALL_CACHES    = [STATIC_CACHE, PAGES_CACHE]

// ── Install: take control immediately ──────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting())

// ── Activate: delete caches from old versions ──────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith('mwalimu-') && !ALL_CACHES.includes(k))
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept GET requests from the same origin
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Never cache AI or auth API routes — always fresh
  if (url.pathname.startsWith('/api/')) return

  // _next/static/* — immutable (hashed filenames). Cache-first forever.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // _next/image/* — optimised images. Cache-first.
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Public static files: icons, images, fonts, manifests
  if (/\.(png|jpe?g|svg|webp|gif|ico|woff2?|ttf|otf|json)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // HTML navigation — network first, serve cached on failure
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES_CACHE))
    return
  }

  // Everything else (e.g. chunk prefetch) — network first
  event.respondWith(networkFirst(request, PAGES_CACHE))
})

// ── Helpers ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Can't reach network and nothing cached — let the browser show its default error
    return new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}

// On slow connections a plain network-first strategy hangs until the request
// dies, so repeat visitors never benefit from the cache. If we hold a cached
// copy, race the network against a short timeout and serve the cached copy
// when the network loses; the fetch keeps running and refreshes the cache in
// the background for next time. With nothing cached, wait as long as it takes.
const NETWORK_TIMEOUT_MS = 4000

async function networkFirst(request, cacheName) {
  const cached = await caches.match(request)

  const networkFetch = fetch(request).then(async response => {
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  })

  try {
    if (cached) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS)
      )
      return await Promise.race([networkFetch, timeout])
    }
    return await networkFetch
  } catch {
    networkFetch.catch(() => {}) // background refresh may still fail; ignore
    if (cached) return cached

    // For navigation, try to return the cached dashboard shell as fallback
    if (request.mode === 'navigate') {
      const shell = await caches.match('/dashboard')
      if (shell) return shell
    }

    return new Response('', { status: 503, statusText: 'Offline' })
  }
}
