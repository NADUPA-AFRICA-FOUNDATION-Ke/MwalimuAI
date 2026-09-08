import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing-header'
import { MarketingFooter } from '@/components/marketing-footer'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">This page is not here</h1>
        <p className="mb-8 text-muted-foreground">The link may be outdated, or the page may have moved. Let&apos;s get you back to Mwalimu AI.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild><Link href="/">Go to homepage</Link></Button>
          <Button asChild variant="outline"><Link href="/support">Visit support</Link></Button>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
