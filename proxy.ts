import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Nonce-based CSP. Every route renders dynamically (app/layout.tsx reads
// headers() to get the nonce, which forces this) so Next can apply a fresh
// per-request nonce to its own inline hydration scripts, and next-themes'
// flash-prevention script picks it up via the ThemeProvider `nonce` prop
// (components/providers.tsx) — verified by building and inspecting the
// actual rendered HTML: every inline <script> carries a matching nonce.
// 'strict-dynamic' extends that trust to scripts those scripts load (e.g.
// code-split chunk loaders) without needing a static script-src allowlist.
// style-src keeps 'unsafe-inline' — nonces don't cover inline style=""
// attributes (only <style> elements), and this app uses inline style props
// extensively for gradients/dynamic theming.
function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseWs  = supabaseUrl.replace(/^https:/, 'wss:')
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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
  const nonce = crypto.randomUUID()
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
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
