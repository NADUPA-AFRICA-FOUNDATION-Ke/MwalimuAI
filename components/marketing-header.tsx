'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Accessibility } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand-mark'
import { OPEN_A11Y_EVENT } from '@/lib/nav'

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
]

interface MarketingHeaderProps {
  activePath?: string
  /** Kept so existing pages compile; the header is always the same opaque light bar. */
  overlay?: boolean
}

/** Public-site header: one opaque light bar everywhere, safe-area aware, 44px targets. */
export function MarketingHeader({ activePath }: MarketingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 md:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <BrandMark className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-foreground">Mwalimu AI</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {NAV.map(({ href, label }) => {
            const isActive = activePath === href
            return (
              <Link key={href} href={href} aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 text-base font-medium ${isActive ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden md:inline-flex"><Link href="/auth/login">Sign in</Link></Button>
          <Button asChild className="hidden md:inline-flex"><Link href="/auth/sign-up">Create account</Link></Button>
          <button type="button" onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-foreground hover:bg-secondary md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation">
            {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="mobile-navigation" hidden={!menuOpen} className="border-t border-border bg-background md:hidden">
        <div className="flex flex-col gap-1 px-4 py-3">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-secondary">
              {label}
            </Link>
          ))}
          <button type="button" onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event(OPEN_A11Y_EVENT)) }}
            className="flex min-h-12 items-center gap-2 rounded-lg px-3 text-base font-medium hover:bg-secondary">
            <Accessibility className="h-5 w-5 text-muted-foreground" aria-hidden="true" />Accessibility options
          </button>
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <Button asChild variant="outline" size="lg"><Link href="/auth/login" onClick={() => setMenuOpen(false)}>Sign in</Link></Button>
            <Button asChild size="lg"><Link href="/auth/sign-up" onClick={() => setMenuOpen(false)}>Create account</Link></Button>
          </div>
        </div>
      </div>
    </header>
  )
}
