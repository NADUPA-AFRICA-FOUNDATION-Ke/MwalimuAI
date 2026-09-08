'use client'

import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ConvexNativeAuthBoundary } from '@/context/profile-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { BackButton } from '@/components/back-button'
import { Mail, CheckCircle } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import Link from 'next/link'

export default function Page() {
  return <ConvexNativeAuthBoundary><ForgotPasswordContent /></ConvexNativeAuthBoundary>
}

function ForgotPasswordContent() {
  const [email, setEmail]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const { signIn } = useAuthActions()
  const provisionMigratedAccount = useAction(api.auth.provisionMigratedAccount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      try { localStorage.setItem('mwalimu_password_reset_email', normalizedEmail) } catch {}
      await provisionMigratedAccount({ email: normalizedEmail })
      await signIn('password', {
        flow: 'reset',
        email: normalizedEmail,
        redirectTo: '/auth/reset-password',
      })
      // Always show success — don't reveal whether the email exists
      setSent(true)
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : ''
      setError(message.includes('Password reset is not enabled')
        ? 'Password reset email is being configured. Please contact support for account access.'
        : 'Could not send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.52 0.20 160 / 0.15) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.70 0.20 55 / 0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.52 0.20 160 / 0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <BackButton fallbackHref="/auth/login" />

          <Link href="/" className="flex items-center justify-center gap-3 self-center">
            <BrandMark className="h-11 w-11" />
            <span className="text-xl font-bold tracking-tight">Mwalimu AI</span>
          </Link>

          <Card>
            {sent ? (
              <>
                <CardHeader className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription>
                    If an account exists for <strong className="text-foreground">{email}</strong>, you&apos;ll receive a password reset link shortly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Check your spam folder if it doesn&apos;t arrive within a few minutes.
                  </p>
                  <Button asChild variant="outline" className="w-full"><Link href="/auth/login">Back to sign in</Link></Button>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle className="text-2xl">Reset your password</CardTitle>
                  <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="flex flex-col gap-5">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                          <Input id="email" type="email" inputMode="email" autoComplete="email" spellCheck={false}
                            placeholder="you@example.com" required className="pl-9"
                            aria-invalid={!!error}
                            aria-describedby={error ? 'forgot-password-error' : undefined}
                            value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                      </div>

                      {error && (
                        <p id="forgot-password-error" role="alert" aria-live="assertive" className="text-sm text-destructive rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                          {error}
                        </p>
                      )}

                      <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
                        {isLoading ? <><Spinner className="mr-2 size-4" />Sending…</> : 'Send reset email'}
                      </Button>
                    </div>

                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Remember your password?{' '}
                      <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
                    </div>
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
