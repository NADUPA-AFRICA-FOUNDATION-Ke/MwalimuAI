import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const requestedNext = searchParams.get('next') ?? '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard'
  const destination = new URL(next, origin)

  // ConvexAuthProvider completes verification in the browser. Preserve all
  // callback values while preventing an external/open redirect.
  searchParams.forEach((value, key) => {
    if (key !== 'next') destination.searchParams.set(key, value)
  })
  return NextResponse.redirect(destination)
}
