'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowLeft, MonitorSmartphone } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { OAuthButtons } from '@/components/oauth-buttons'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { ConvexNativeAuthBoundary, FORCED_LOGOUT_FLAG } from '@/context/profile-context'

const DARK = 'var(--hero-bg)'

function mapError(msg: string): string {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials') || msg.includes('Invalid credentials'))
    return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed'))
    return 'Please verify your email before signing in.'
  if (msg.includes('too many requests') || msg.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('already exists') || msg.includes('already registered'))
    return 'This account has already moved to Convex. Use your Convex password or reset it.'
  if (msg.includes('Invalid password'))
    return 'For security, migrated accounts need a password of at least 8 characters. Please reset your password.'
  return 'Sign-in failed. Please try again.'
}

export default function LoginPage() {
  return <ConvexNativeAuthBoundary><LoginContent /></ConvexNativeAuthBoundary>
}

function LoginContent() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [deviceNotice, setDeviceNotice] = useState(false)
  const router = useRouter()
  const { signIn } = useAuthActions()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/dashboard')
  }, [authLoading, isAuthenticated, router])

  // Shown when this device was signed out because the account was used
  // to sign in somewhere else (single-device policy).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FORCED_LOGOUT_FLAG)) {
        setDeviceNotice(true)
        sessionStorage.removeItem(FORCED_LOGOUT_FLAG)
      }
    } catch {}
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await signIn('password', { flow: 'signIn', email: normalizedEmail, password })
      if (!result.signingIn) throw new Error('Invalid credentials')
      router.push('/dashboard')
    } catch (authError) {
      setError(mapError(authError instanceof Error ? authError.message : ''))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full">

      {/* ── Left panel — dark brand ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: DARK }}>

        {/* Subtle radial highlight */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 10%, oklch(0.54 0.14 163 / 0.30) 0%, transparent 60%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <BrandMark className="w-9 h-9" />
            <span className="font-bold text-base text-white tracking-tight">Mwalimu AI</span>
          </Link>
        </div>

        {/* Centre copy */}
        <div className="relative z-10">
          <p className="text-[11px] font-bold text-white/75 uppercase tracking-widest mb-5">For Kenya&apos;s CBC teachers</p>
          <h2 className="text-[2.4rem] font-black text-white leading-[1.1] tracking-tight mb-6">
            Professional learning<br />for Kenyan CBC<br />
            <span style={{ color: 'var(--accent)' }}>teachers.</span>
          </h2>
          <p className="text-white/80 text-[15px] leading-relaxed max-w-xs">
            Access learning modules, an AI Coach, teacher tools, community discussions, and progress tracking.
          </p>
        </div>

        {/* Product summary */}
        <div className="relative z-10 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-white text-sm font-semibold leading-relaxed">A shared place for learning and planning</p>
          <p className="text-white/70 text-xs leading-relaxed mt-1">Sign in to return to the work saved on your account.</p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <BrandMark className="w-7 h-7" />
            <span className="font-bold text-sm tracking-tight">Mwalimu AI</span>
          </Link>
          <p className="text-sm text-gray-400">
            No account?{' '}
            <Link href="/auth/sign-up" className="text-primary font-semibold hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-10 py-12">
          <div className="w-full max-w-[380px]">

            <div className="mb-8">
              <h1 className="text-[1.8rem] font-black tracking-tight text-gray-900 mb-2">Welcome back</h1>
              <p className="text-gray-400 text-[15px]">Sign in to return to your learning workspace.</p>
            </div>

            <form onSubmit={handleLogin} noValidate className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-semibold text-gray-700">Email address</Label>
                <Input
                  id="email" type="email" inputMode="email" autoComplete="email" spellCheck={false}
                  placeholder="you@school.ac.ke" required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 text-[14px] focus:border-primary focus:ring-primary/20 placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[13px] font-semibold text-gray-700">Password</Label>
                  <Link href="/auth/forgot-password" className="text-[12px] text-primary hover:underline underline-offset-4">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-[14px] pr-10 focus:border-primary focus:ring-primary/20"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {deviceNotice && !error && (
                <div role="status" className="flex items-start gap-2.5 text-[13px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <MonitorSmartphone className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>You were signed out because your account signed in on another device. Mwalimu AI allows one active device at a time.</span>
                </div>
              )}
              {error && (
                <div id="login-error" role="alert" aria-live="assertive" className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading}
                className="w-full h-11 rounded-xl text-[14px] font-semibold btn-primary-glow">
                {isLoading ? <><Spinner className="mr-2 size-4" />Signing in…</> : 'Sign in →'}
              </Button>

            </form>

            <div className="mt-6">
              <OAuthButtons />
            </div>

            <p className="text-center text-[12px] text-gray-300 mt-8">
              By signing in you agree to our{' '}
              <Link href="/privacy" className="text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors">
                Privacy Policy
              </Link>{' '}and{' '}
              <Link href="/terms" className="text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors">
                Terms &amp; Conditions
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
