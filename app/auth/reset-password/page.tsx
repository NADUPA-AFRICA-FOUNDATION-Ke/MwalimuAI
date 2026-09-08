'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { ConvexNativeAuthBoundary } from '@/context/profile-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import Link from 'next/link'

function mapError(msg: string): string {
  if (msg.includes('Invalid password') || msg.includes('least 8')) return 'Password must be at least 8 characters.'
  if (msg.includes('Invalid code') || msg.includes('Expired')) return 'This password reset link has expired or already been used.'
  if (msg.includes('same as') || msg.includes('different')) return 'New password must be different from your current password.'
  return 'Could not update password. Please try again.'
}

export default function ResetPasswordPage() {
  return (
    <ConvexNativeAuthBoundary handleCode={false}>
      <ResetPasswordContent />
    </ConvexNativeAuthBoundary>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const { signIn } = useAuthActions()
  const [password,       setPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [isLoading,      setIsLoading]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [done,           setDone]           = useState(false)
  const [noSession,      setNoSession]      = useState(false)
  const [resetCode,      setResetCode]      = useState('')
  const [email,          setEmail]          = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code') ?? ''
    const resetEmail = params.get('email') ?? localStorage.getItem('mwalimu_password_reset_email') ?? ''
    setResetCode(code)
    setEmail(resetEmail)
    setNoSession(!code || !resetEmail)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setIsLoading(true)
    try {
      await signIn('password', {
        flow: 'reset-verification',
        email,
        code: resetCode,
        newPassword: password,
      })
      try { localStorage.removeItem('mwalimu_password_reset_email') } catch {}
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (updateError) {
      setError(mapError(updateError instanceof Error ? updateError.message : ''))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      {/* Background accents */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full"
          style={{ background: 'radial-gradient(circle, oklch(0.52 0.20 160 / 0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle, oklch(0.70 0.20 55 / 0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, oklch(0.52 0.20 160 / 0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center justify-center gap-3 self-center">
            <BrandMark className="h-11 w-11" />
            <span className="text-xl font-bold tracking-tight">Mwalimu AI</span>
          </Link>

          <Card>
            {/* ── Link expired ──────────────────────────────── */}
            {noSession ? (
              <>
                <CardHeader className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-2xl">Link expired</CardTitle>
                  <CardDescription>
                    This password reset link has expired or already been used.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button asChild className="w-full"><Link href="/auth/forgot-password">Request a new link</Link></Button>
                  <Button asChild variant="outline" className="w-full"><Link href="/auth/login">Back to sign in</Link></Button>
                </CardContent>
              </>
            ) : done ? (
              /* ── Success ──────────────────────────────────── */
              <>
                <CardHeader className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-2xl">Password updated</CardTitle>
                  <CardDescription>
                    Your password has been changed. Redirecting you to the dashboard…
                  </CardDescription>
                </CardHeader>
              </>
            ) : (
              /* ── Form ─────────────────────────────────────── */
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Set a new password</CardTitle>
                  <CardDescription>Enter and confirm your new password below.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

                    <div className="grid gap-2">
                      <Label htmlFor="password">New password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Min. 8 characters"
                          required
                          aria-invalid={!!error}
                          aria-describedby={error ? 'reset-password-error' : undefined}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Confirm new password</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        aria-invalid={!!error}
                        aria-describedby={error ? 'reset-password-error' : undefined}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                    </div>

                    {error && (
                      <p id="reset-password-error" role="alert" aria-live="assertive" className="text-sm text-destructive rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                        {error}
                      </p>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <><Spinner className="mr-2 size-4" />Updating…</> : 'Set new password'}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
                        Request a new link instead
                      </Link>
                    </p>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
