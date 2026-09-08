import { NextResponse, type NextRequest } from 'next/server'

/**
 * Convex Auth's React client stores and refreshes its session in browser
 * storage, so middleware cannot reliably inspect it. Dashboard protection is
 * performed by ProfileProvider's Convex auth state on the client.
 */
export function proxy(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  if (process.env.NODE_ENV === 'production' && forwardedProto === 'http') {
    const secureUrl = request.nextUrl.clone()
    secureUrl.protocol = 'https:'
    return NextResponse.redirect(secureUrl, 308)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
}
