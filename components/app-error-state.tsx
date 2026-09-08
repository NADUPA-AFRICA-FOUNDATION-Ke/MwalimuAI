'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Home, LayoutDashboard, RefreshCw, SearchX, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ErrorVariant = 'not-found' | 'server' | 'dashboard' | 'auth'

const COPY: Record<ErrorVariant, {
  code: string
  label: string
  title: string
  description: string
  Icon: typeof Compass
}> = {
  'not-found': {
    code: '404',
    label: 'Page not found',
    title: 'This lesson took a wrong turn.',
    description: 'The page may have moved, or the link may be out of date. Choose a safe route back into Mwalimu AI.',
    Icon: SearchX,
  },
  server: {
    code: '500',
    label: 'Temporary problem',
    title: 'We hit a rough patch.',
    description: 'Your work is safe. Try the page again, or return to the dashboard while we reconnect the pieces.',
    Icon: ShieldAlert,
  },
  dashboard: {
    code: 'WORKSPACE',
    label: 'Dashboard unavailable',
    title: 'Your workspace needs a quick reset.',
    description: 'The dashboard could not finish loading this time. Retry to reconnect your saved learning workspace.',
    Icon: LayoutDashboard,
  },
  auth: {
    code: 'AUTH',
    label: 'Account access',
    title: 'We could not complete that sign-in.',
    description: 'The account session did not finish. Return to sign in and try again, or request a password reset.',
    Icon: Compass,
  },
}

export function AppErrorState({
  variant = 'server',
  reset,
}: {
  variant?: ErrorVariant
  reset?: () => void
}) {
  const [retrying, setRetrying] = useState(false)
  const content = COPY[variant]
  const Icon = content.Icon

  const retry = () => {
    if (!reset) return
    setRetrying(true)
    reset()
  }

  return (
    <main className="relative isolate flex min-h-[70svh] items-center justify-center overflow-hidden bg-background px-5 py-20">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[12%] top-[16%] h-24 w-24 rounded-full border-[14px] border-primary/10" />
        <div className="absolute bottom-[18%] right-[14%] h-32 w-32 rounded-full border-[18px] border-accent/10" />
        <div className="absolute left-1/2 top-1/2 h-px w-[min(80vw,720px)] -translate-x-1/2 rotate-[-12deg] bg-border/60" />
      </div>

      <div className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-7 text-center shadow-lg md:p-12">
        <div className="mx-auto mb-6 flex w-fit items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{content.code} · {content.label}</span>
        </div>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-accent/10 text-accent">
          <Icon className="h-10 w-10" strokeWidth={1.7} aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{content.description}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {reset && (
            <Button type="button" onClick={retry} disabled={retrying} className="gap-2 rounded-xl">
              <RefreshCw className={retrying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
              {retrying ? 'Trying again…' : 'Try again'}
            </Button>
          )}
          <Button asChild variant={reset ? 'outline' : 'default'} className="gap-2 rounded-xl">
            <Link href={variant === 'auth' ? '/auth/login' : variant === 'dashboard' ? '/dashboard' : '/'}>
              <Home className="h-4 w-4" aria-hidden="true" />
              {variant === 'auth' ? 'Back to sign in' : variant === 'dashboard' ? 'Back to dashboard' : 'Go to homepage'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
