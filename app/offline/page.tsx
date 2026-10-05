import type { Metadata } from 'next'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { HeaderBack } from '@/components/header-back'
import { BrandMark } from '@/components/brand-mark'
import { OfflineRetry } from './retry'

export const metadata: Metadata = { title: 'You are offline', robots: { index: false } }

/** Shown by the service worker when a page is not cached and there is no connection. */
export default function OfflinePage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-6 py-[max(24px,env(safe-area-inset-top))] text-center">
      <HeaderBack fallbackHref="/dashboard" className="absolute left-3 top-[max(12px,env(safe-area-inset-top))]" />
      <BrandMark className="mb-6 h-12 w-12" alt="" />
      <WifiOff className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        This page has not been saved on your phone yet. Lessons you have already opened still work. Reconnect to load the rest.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <OfflineRetry />
        <Link href="/offline/lessons" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
          Read my downloaded lessons
        </Link>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 font-semibold hover:bg-secondary">
          Go to my dashboard
        </Link>
      </div>
    </main>
  )
}
