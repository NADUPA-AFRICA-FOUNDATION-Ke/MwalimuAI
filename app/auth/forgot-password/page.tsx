'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BackButton } from '@/components/back-button'
import { BrandMark } from '@/components/brand-mark'
import { PublicSupportForm } from '@/components/public-support-form'

/**
 * Passwords are not reset by email. Someone locked out writes to support here; staff issue a one-time temporary
 * password and reply on the person's private conversation page.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-lg">
        <div className="flex flex-col gap-6">
          <BackButton fallbackHref="/auth/login" className="-mb-3 self-start" />
          <Link href="/" className="flex items-center justify-center gap-3 self-center">
            <BrandMark className="h-11 w-11" />
            <span className="text-xl font-bold tracking-tight">Mwalimu AI</span>
          </Link>
          <Card>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl"><h1>Locked out?</h1></CardTitle>
              <CardDescription>
                We do not send password emails. Tell us the email address on your account and our team will give you a temporary password on a private page. Sign in with it, then change it in Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PublicSupportForm defaultCategory="account" subjectPlaceholder="I can’t sign in" />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it? <Link className="text-primary underline underline-offset-4" href="/auth/login">Back to sign in</Link>. Signed up with Google? Use Continue with Google.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
