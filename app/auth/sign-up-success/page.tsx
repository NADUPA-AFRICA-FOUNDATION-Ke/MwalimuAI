'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Mail, CheckCircle, RefreshCw } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import Link from 'next/link'

export default function Page() {
  const router = useRouter()
  const [userEmail, setUserEmail]     = useState<string | null>(null)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [checkState, setCheckState]   = useState<'idle' | 'checking' | 'unverified'>('idle')
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserEmail(session.user.email ?? null)
    })
  }, [])

  const handleResend = async () => {
    setResendError(null)
    if (!userEmail) { setResendError('Session expired. Please sign in again.'); return }
    setResendState('sending')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      setResendState('sent')
    } catch {
      setResendState('idle')
      setResendError('Could not resend email. Please wait a moment and try again.')
    }
  }

  const handleCheckVerified = async () => {
    setCheckState('checking')
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.refreshSession()
      if (data.user?.email_confirmed_at) {
        window.location.href = '/dashboard'
      } else {
        setCheckState('unverified')
        setTimeout(() => setCheckState('idle'), 3000)
      }
    } catch {
      setCheckState('idle')
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
          <Link href="/" className="flex items-center justify-center gap-3 self-center">
            <BrandMark className="h-11 w-11" />
            <span className="text-xl font-bold tracking-tight">Mwalimu AI</span>
          </Link>

          <Card>
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a verification link to{' '}
                {userEmail
                  ? <strong className="text-foreground">{userEmail}</strong>
                  : 'your email address'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Click the link in the email to verify your account. Once done, come back and click the button below.
              </p>

              <Button onClick={handleCheckVerified} className="w-full gap-2" disabled={checkState === 'checking'}>
                {checkState === 'checking'
                  ? <><Spinner className="size-4" /> Checking…</>
                  : <><CheckCircle className="size-4" /> I&apos;ve verified my email</>}
              </Button>

              {checkState === 'unverified' && (
                <p role="alert" className="text-sm text-center text-destructive">
                  Email not verified yet. Please click the link in your email first.
                </p>
              )}

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-xs text-muted-foreground">didn&apos;t get the email?</span>
                <div className="flex-1 border-t border-border" />
              </div>

              {resendState === 'sent' ? (
                <p className="text-sm text-center text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5">
                  <CheckCircle className="size-4" aria-hidden="true" /> Verification email sent
                </p>
              ) : (
                <Button variant="outline" onClick={handleResend} disabled={resendState === 'sending'} className="w-full gap-2">
                  {resendState === 'sending'
                    ? <><Spinner className="size-4" /> Sending…</>
                    : <><RefreshCw className="size-4" /> Resend verification email</>}
                </Button>
              )}

              {resendError && (
                <p role="alert" className="text-sm text-center text-destructive">{resendError}</p>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Wrong account?{' '}
                <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in with a different account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
