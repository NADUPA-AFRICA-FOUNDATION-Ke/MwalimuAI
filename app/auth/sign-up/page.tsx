'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { OAuthButtons } from '@/components/oauth-buttons'
import Image from 'next/image'
import { useAuthActions } from '@convex-dev/auth/react'
import { ConvexNativeAuthBoundary } from '@/context/profile-context'

const DARK = 'var(--hero-bg)'

function mapError(msg: string): string {
  if (msg.includes('already registered') || msg.includes('already exists'))
    return 'An account with this email already exists. Try signing in instead.'
  if (msg.includes('valid email')) return 'Please enter a valid email address.'
  if (msg.includes('Invalid password') || msg.includes('least 8'))
    return 'Password must be at least 8 characters.'
  if (msg.includes('rate limit') || msg.includes('after 60'))
    return 'Too many attempts. Please wait 60 seconds and try again.'
  return 'Sign-up failed. Please try again.'
}

export default function SignUpPage() {
  return <ConvexNativeAuthBoundary><SignUpContent /></ConvexNativeAuthBoundary>
}

function SignUpContent() {
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [isLoading,      setIsLoading]      = useState(false)
  const router = useRouter()
  const { signIn } = useAuthActions()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== repeatPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8)         { setError('Password must be at least 8 characters.'); return }

    setIsLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await signIn('password', {
        flow: 'signUp',
        email: normalizedEmail,
        password,
      })
      if (!result.signingIn) throw new Error('Sign-up did not complete')
      try { localStorage.setItem('mwalimu_last_auth_email', normalizedEmail) } catch {}
      router.push('/auth/sign-up-success')
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

        {/* Radial highlight */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 10%, oklch(0.54 0.14 163 / 0.30) 0%, transparent 60%)' }} />

        {/* Background classroom photo with overlay */}
        <div className="absolute inset-0 opacity-10">
          <Image
            src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80"
            alt=""
            fill
            sizes="42vw"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <BrandMark className="w-9 h-9" />
            <span className="font-bold text-base text-white tracking-tight">Mwalimu AI</span>
          </Link>
        </div>

        {/* Centre copy */}
        <div className="relative z-10">
          <p className="text-[11px] font-bold text-white/75 uppercase tracking-widest mb-5">For Kenyan CBC teachers</p>
          <h2 className="text-[2.4rem] font-black text-white leading-[1.1] tracking-tight mb-6">
            Learn, plan,<br />and reflect<br />
            <span style={{ color: 'var(--accent)' }}>in one place.</span>
          </h2>
          <ul className="space-y-3.5">
            {[
              'AI Coach for teaching questions',
              'Structured learning modules',
              'Teacher tools and progress tracking',
              'Community discussions and resources',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-white/65 text-[14px]">
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'oklch(0.54 0.14 163 / 0.40)', border: '1px solid oklch(0.54 0.14 163 / 0.35)' }}>
                  <Check className="w-3 h-3 text-white" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Product summary */}
        <div className="relative z-10 flex items-center gap-3">
          <p className="text-white/80 text-[13px]">Create a profile to start using the platform.</p>
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
            Have an account?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-10 py-12">
          <div className="w-full max-w-[380px]">

            <div className="mb-8">
              <h1 className="text-[1.8rem] font-black tracking-tight text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-400 text-[15px]">Create a profile to explore your learning workspace.</p>
            </div>

            <form onSubmit={handleSignUp} noValidate className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-semibold text-gray-700">Email address</Label>
                <Input
                  id="email" type="email" inputMode="email" autoComplete="email" spellCheck={false}
                  placeholder="you@school.ac.ke" required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'signup-error' : undefined}
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 text-[14px] focus:border-primary focus:ring-primary/20 placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                    placeholder="Min. 8 characters"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'signup-error' : undefined}
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-gray-200 bg-gray-50 text-[14px] pr-10 focus:border-primary focus:ring-primary/20 placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="repeat-password" className="text-[13px] font-semibold text-gray-700">Confirm password</Label>
                <Input
                  id="repeat-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'signup-error' : undefined}
                  value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)}
                  className="h-11 rounded-xl border-gray-200 bg-gray-50 text-[14px] focus:border-primary focus:ring-primary/20"
                />
              </div>

              {error && (
                <div id="signup-error" role="alert" aria-live="assertive" className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isLoading}
                className="w-full h-11 rounded-xl text-[14px] font-semibold btn-primary-glow mt-2">
                {isLoading ? <><Spinner className="mr-2 size-4" />Creating account…</> : 'Create free account →'}
              </Button>

            </form>

            <div className="mt-6">
              <OAuthButtons />
            </div>

            <p className="text-center text-[12px] text-gray-300 mt-8">
              By creating an account you agree to our{' '}
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
