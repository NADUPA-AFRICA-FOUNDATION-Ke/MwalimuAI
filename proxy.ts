import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Auth-only middleware. CSP and the other security headers are set statically
// in next.config.mjs so public pages stay prerendered and CDN-cached — the
// previous per-request nonce CSP forced every route to render dynamically.
// This runs only on the routes that actually gate on auth, and it skips the
// Supabase auth-server round trip entirely when no session cookie is present.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-'))

  if (!hasSessionCookie) {
    // Anonymous visitor: nothing to refresh, nothing to validate.
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session on every request — keeps the cookie alive
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from the dashboard
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect verified users away from auth pages — except reset-password,
  // which must stay reachable even with an active (recovery) session, or a
  // password-reset link would bounce straight to /dashboard before the user
  // ever sets a new password.
  if (
    user && user.email_confirmed_at && pathname.startsWith('/auth') &&
    !pathname.includes('sign-up-success') && !pathname.includes('reset-password')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
