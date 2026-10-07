'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, PanelLeft } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { NotificationCenter } from '@/components/notification-center'
import { GlobalSearch, SearchButton } from '@/components/global-search'
import { AccountSheet } from '@/components/account-sheet'
import { useProfile } from '@/context/profile-context'
import { getT } from '@/lib/i18n'
import { parentRoute, screenTitle } from '@/lib/nav'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  onLogout: () => void
  sidebarCollapsed?: boolean
  onToggleCollapse?: () => void
}

/**
 * App bar. Phones: a back control and the screen title on every sub-screen (an installed app has no
 * browser back button), the product mark on tab screens. It reserves the top safe area so it never
 * sits under the status bar or notch. Desktop keeps the sidebar toggle and product name.
 */
export function DashboardHeader({ onLogout, sidebarCollapsed, onToggleCollapse }: DashboardHeaderProps) {
  const { profile, lang, mounted } = useProfile()
  const t = getT(lang)
  const pathname = usePathname()
  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)

  const name = mounted && profile?.name ? profile.name : 'Teacher'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  // Every screen except the dashboard home offers Back, tab screens included.
  const showBack = pathname.replace(/\/$/, '') !== '/dashboard'
  const title = screenTitle(pathname, t)

  // History may be empty (deep link, refresh, freshly installed app): fall back to the parent screen.
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(parentRoute(pathname))
  }

  return (
    <header className="sticky top-0 z-40 h-[calc(var(--app-header-h)+env(safe-area-inset-top,0px))] border-b border-border bg-background pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-full items-center gap-1 px-2 md:px-4">
        {/* Left */}
        {showBack && (
          <button type="button" onClick={goBack} aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-secondary">
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        {onToggleCollapse && (
          <button type="button" onClick={onToggleCollapse} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={sidebarCollapsed}
            className="hidden h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:flex">
            <PanelLeft className={cn('h-5 w-5 transition-transform duration-200', sidebarCollapsed && 'rotate-180')} aria-hidden="true" />
          </button>
        )}
        <Link href="/dashboard" aria-label="Mwalimu AI home" className={cn('flex min-h-11 min-w-11 items-center gap-2 px-1', showBack && 'max-md:hidden')}>
          <BrandMark className="h-8 w-8" />
          <span className="hidden text-base font-bold tracking-tight md:inline">Mwalimu AI</span>
        </Link>
        <p className="min-w-0 flex-1 truncate px-1 text-lg font-semibold md:hidden">{title}</p>

        {/* Right */}
        <div className="ml-auto flex items-center gap-1">
          <SearchButton />
          <NotificationCenter />
          <button type="button" onClick={() => setAccountOpen(true)} aria-label="Account and settings" aria-haspopup="dialog"
            className="flex h-11 w-11 items-center justify-center rounded-full">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">{initials}</span>
          </button>
        </div>
      </div>
      <GlobalSearch />
      <AccountSheet open={accountOpen} onOpenChange={setAccountOpen} onLogout={onLogout} />
    </header>
  )
}
