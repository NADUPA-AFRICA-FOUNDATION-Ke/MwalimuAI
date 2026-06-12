'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
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
}

export function MarketingHeader({ activePath }: MarketingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/40">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandMark className="w-9 h-9 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-bold text-lg tracking-tight">Mwalimu AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV.map(({ href, label }) => {
            const isActive = activePath === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'text-foreground bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
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
          <Link href="/auth/login" className="hidden md:block">
            <Button variant="ghost" size="sm" className="font-medium hover:text-primary hover:bg-primary/8 rounded-xl transition-all">
              Log in
            </Button>
          </Link>
          <Link href="/auth/sign-up" className="hidden md:block">
            <Button size="sm" className="font-semibold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/45 hover:-translate-y-0.5 transition-all duration-200 px-5">
              Get started free
            </Button>
          </Link>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 hover:bg-muted rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-white/30 ${menuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 py-3 flex flex-col gap-1">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 text-sm font-medium rounded-xl hover:bg-primary/8 hover:text-foreground text-muted-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-2 pt-3 mt-1 border-t border-border/50">
            <Link href="/auth/login" className="flex-1" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-xl">Log in</Button>
            </Link>
            <Link href="/auth/sign-up" className="flex-1" onClick={() => setMenuOpen(false)}>
              <Button className="w-full rounded-xl">Get started free</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
