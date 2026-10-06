import { NextResponse, type NextRequest } from 'next/server'

/**
 * Convex Auth's React client stores and refreshes its session in browser
 * storage, so middleware cannot reliably inspect it. Dashboard protection is
 * performed by ProfileProvider's Convex auth state on the client.
 *
 * Admin separation: the console lives under /admin but is only reachable on the
 * hosts listed in ADMIN_HOSTS (e.g. "admin.your-domain.org"). On those hosts the root
 * path is rewritten into /admin and nothing else is served; on every other host
 * /admin is a plain 404, so learners cannot discover it. localhost is allowed
 * outside production for development. This is obscurity and isolation only: real
 * authorisation is enforced by the Convex functions (staff role + MFA session).
 */
const adminHosts = (process.env.ADMIN_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)

// ADMIN_PATH_ENABLED=true serves the console at /admin on the normal site, for deployments that cannot add a
// separate admin hostname. Security is unchanged: it is enforced by the Convex staff role + MFA, not by the host.
const adminPathEnabled = process.env.ADMIN_PATH_ENABLED === 'true'

function isAdminHost(host: string) {
  if (adminPathEnabled) return true
  const bare = host.toLowerCase()
  if (adminHosts.includes(bare)) return true
  return (
    process.env.NODE_ENV !== 'production' &&
    (bare.startsWith('localhost') || bare.startsWith('127.0.0.1')) &&
    adminHosts.length === 0
  )
}

function hardened(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export function proxy(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  if (process.env.NODE_ENV === 'production' && forwardedProto === 'http') {
    const secureUrl = request.nextUrl.clone()
    secureUrl.protocol = 'https:'
    return NextResponse.redirect(secureUrl, 308)
  }

  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const onAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
  const adminHost = adminHosts.includes(host.toLowerCase())

  if (adminHost) {
    // Dedicated admin host: serve only the console (plus Next internals and its own static assets).
    if (onAdminPath) return hardened(NextResponse.next())
    if (
      pathname.startsWith('/_next') ||
      pathname === '/favicon.ico' ||
      /\.(png|svg|ico|webmanifest|json|txt)$/.test(pathname)
    )
      return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`
    return hardened(NextResponse.rewrite(url))
  }

  if (onAdminPath && !isAdminHost(host)) {
    return new NextResponse('Not found', { status: 404 })
  }
  return onAdminPath ? hardened(NextResponse.next()) : NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
