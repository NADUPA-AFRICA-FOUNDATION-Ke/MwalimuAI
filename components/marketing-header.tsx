'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Menu, X, Accessibility } from 'lucide-react'
import { OPEN_A11Y_EVENT } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand-mark'

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/pricing',  label: 'Pricing'  },
  { href: '/about',    label: 'About'    },
  { href: '/blog',     label: 'Blog'     },
]

interface MarketingHeaderProps {
  activePath?: string
  overlay?: boolean
}

export function MarketingHeader({ activePath, overlay = false }: MarketingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!overlay) return
    const handleScroll = () => setScrolled(window.scrollY > 40)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [overlay])

  const lightHeader = !overlay || scrolled
  const pathname = usePathname()
  const router = useRouter()
  const isHome = pathname === '/'
  // Every page except the home page offers Back (installed apps have no browser back button).
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <header
      className={`${overlay ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)] transition-colors duration-200 ${lightHeader ? 'bg-background border-border/70' : 'bg-transparent border-transparent'}`}
      style={lightHeader ? undefined : { borderBottomWidth: 1 }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">

        <div className="flex items-center gap-1">
        {!isHome && (
          <button type="button" onClick={goBack} aria-label="Back"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors ${lightHeader ? 'text-foreground hover:bg-secondary' : 'text-white hover:bg-white/10'}`}>
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        <Link href="/" className="flex min-h-11 items-center gap-2.5 group">
          <BrandMark className="w-9 h-9 group-hover:scale-110 transition-transform duration-200" />
          <span className={`font-bold text-lg tracking-tight ${lightHeader ? 'text-foreground' : 'text-white'}`}>Mwalimu AI</span>
        </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV.map(({ href, label }) => {
            const isActive = activePath === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-4 py-2.5 text-sm font-medium rounded-lg transition-colors group ${
                  isActive
                    ? `${lightHeader ? 'text-foreground bg-primary/8' : 'text-white bg-card/10'}`
                    : `${lightHeader ? 'text-muted-foreground hover:text-foreground hover:bg-primary/5' : 'text-white/75 hover:text-white hover:bg-card/10'}`
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full" />
                )}
                {!isActive && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className={`hidden md:inline-flex h-11 rounded-lg px-5 text-sm font-semibold ${lightHeader ? 'border-border text-foreground hover:bg-secondary' : 'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white'}`}>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild className="hidden md:inline-flex h-11 rounded-lg px-5 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/auth/sign-up">Create account</Link>
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className={`md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl transition-colors ${lightHeader ? 'hover:bg-muted text-foreground' : 'text-white hover:bg-card/10'}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="mobile-navigation" aria-hidden={!menuOpen} className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t ${lightHeader ? 'border-border/60 bg-background' : 'border-white/20 bg-[var(--hero-bg)]'} ${menuOpen ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 py-3 flex flex-col gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
              className={`flex min-h-12 items-center px-4 text-base font-medium rounded-xl transition-colors ${lightHeader ? 'hover:bg-primary/8 hover:text-foreground text-muted-foreground' : 'text-white/80 hover:bg-card/10 hover:text-white'}`}
            >
              {label}
            </Link>
          ))}
          <button type="button" tabIndex={menuOpen ? 0 : -1}
            onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event(OPEN_A11Y_EVENT)) }}
            className={`flex min-h-12 items-center gap-2 px-4 text-base font-medium rounded-xl transition-colors ${lightHeader ? 'text-muted-foreground hover:bg-primary/8 hover:text-foreground' : 'text-white/80 hover:bg-card/10 hover:text-white'}`}>
            <Accessibility className="h-5 w-5" aria-hidden="true" />Accessibility options
          </button>
          <div className="flex gap-2 pt-3 mt-1 border-t border-border/50">
            <Button asChild variant="outline" className="flex-1 w-full rounded-xl" tabIndex={menuOpen ? 0 : -1}>
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
            </Button>
            <Button asChild className="flex-1 w-full rounded-xl" tabIndex={menuOpen ? 0 : -1}>
              <Link href="/auth/sign-up" onClick={() => setMenuOpen(false)}>Create account</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
