import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const requestedNext = searchParams.get('next') ?? '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard'
  let destination = new URL(next, origin)
  // The prefix check alone is not enough: URL parsing turns '/\\evil.com' (and tab/newline tricks) into another host.
  // Only ever redirect to this site.
  if (destination.origin !== origin) destination = new URL('/dashboard', origin)

  // ConvexAuthProvider completes verification in the browser. Preserve all
  // callback values while preventing an external/open redirect.
  searchParams.forEach((value, key) => {
    if (key !== 'next') destination.searchParams.set(key, value)
  })
  return NextResponse.redirect(destination)
}
