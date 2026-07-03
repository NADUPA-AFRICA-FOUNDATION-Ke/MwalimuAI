import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// A nonce/'strict-dynamic' CSP (Next's usual documented pattern) doesn't work
// for this app: most routes are statically prerendered (fixed HTML shared
// across every request), so they can never carry a per-request nonce, and
// Next's own inline hydration + theme-flash scripts render on every page
// (static or dynamic) with no nonce attribute at all — verified by building
// and inspecting the actual output. 'unsafe-inline' is the tradeoff that
// keeps every page working; script-src 'self' still blocks the main real
// risk (loading an externally-hosted attacker script).
function buildCsp(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseWs  = supabaseUrl.replace(/^https:/, 'wss:')
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://images.unsplash.com`,
    `font-src 'self'`,
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const csp = buildCsp()

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
  const { pathname } = request.nextUrl

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

  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
