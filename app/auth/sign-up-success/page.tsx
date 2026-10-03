'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth } from 'convex/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { ConvexNativeAuthBoundary } from '@/context/profile-context'
import Link from 'next/link'

export default function Page() {
  return <ConvexNativeAuthBoundary><SuccessContent /></ConvexNativeAuthBoundary>
}

function SuccessContent() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    try { setUserEmail(localStorage.getItem('mwalimu_last_auth_email')) } catch {}
  }, [])

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10">

      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex items-center justify-center gap-3 self-center">
            <BrandMark className="h-11 w-11" />
            <span className="text-xl font-bold tracking-tight">Mwalimu AI</span>
          </Link>

          <Card>
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-7 w-7 text-green-700 dark:text-green-400" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl"><h1>Your account is ready</h1></CardTitle>
              <CardDescription>
                {userEmail
                  ? <>You&apos;re signed in as <strong className="text-foreground">{userEmail}</strong>.</>
                  : 'Your Mwalimu AI account has been created.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {isLoading ? (
                <Button disabled className="w-full gap-2"><Spinner className="size-4" /> Finishing sign in…</Button>
              ) : isAuthenticated ? (
                <Button onClick={() => router.push('/dashboard')} className="w-full gap-2">
                  Continue to dashboard
                </Button>
              ) : (
                <Button asChild className="w-full"><Link href="/auth/login">Sign in</Link></Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Convex Auth now securely manages your account and session.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
