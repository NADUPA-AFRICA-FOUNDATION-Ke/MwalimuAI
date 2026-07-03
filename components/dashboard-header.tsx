'use client'

import Link from 'next/link'
import { LogOut, Menu, Sun, Moon, Monitor, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/brand-mark'
import { NotificationCenter } from '@/components/notification-center'
import { useTheme } from 'next-themes'
import { useProfile } from '@/context/profile-context'
import { getT } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  onLogout: () => void
  onMenuToggle?: () => void
  sidebarCollapsed?: boolean
  onToggleCollapse?: () => void
}

const AVATAR_COLORS = [
  '#16a34a', '#d97706', '#2563eb', '#9333ea',
  '#e11d48', '#0891b2', '#c2410c', '#0d9488',
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />
  const cycle = { light: 'dark', dark: 'system', system: 'light' } as const
  const next = cycle[theme as keyof typeof cycle] ?? 'light'
  const Icon = { light: Sun, dark: Moon, system: Monitor }[theme as keyof typeof cycle] ?? Monitor
  return (
    <button onClick={() => setTheme(next)}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
      aria-label={`Switch to ${next} mode`}>
      <Icon className="w-4 h-4" />
    </button>
  )
}

export function DashboardHeader({ onLogout, onMenuToggle, sidebarCollapsed, onToggleCollapse }: DashboardHeaderProps) {
  const { profile, lang, toggleLang, mounted } = useProfile()
  const t = getT(lang)

  const displayName = mounted && profile?.name ? profile.name : 'Teacher'
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarBg    = AVATAR_COLORS[(displayName.charCodeAt(0) || 84) % AVATAR_COLORS.length]

  return (
    <header className="sticky top-0 z-40 h-[60px] border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="flex items-center h-full px-3 md:px-4 gap-1">

        {/* Left */}
        <div className="flex items-center gap-1 shrink-0">
          {onMenuToggle && (
            <button onClick={onMenuToggle}
              className="md:hidden w-8 h-8 flex items-center justify-center hover:bg-muted/70 rounded-lg transition-colors"
              aria-label="Open navigation">
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}
          {onToggleCollapse && (
            <button onClick={onToggleCollapse}
              className="hidden md:flex w-8 h-8 items-center justify-center hover:bg-muted/70 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={sidebarCollapsed}>
              <PanelLeft className={cn('w-4 h-4 transition-transform duration-200', sidebarCollapsed && 'rotate-180')} />
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-2 ml-1 group">
            <BrandMark className="w-7 h-7 transition-transform duration-150 group-hover:scale-105" />
            <span className="font-bold text-[13.5px] hidden sm:inline tracking-tight">Mwalimu AI</span>
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Language toggle */}
          <button onClick={toggleLang}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
            title={t('header.langToggle')}>
            {t('header.langToggle')}
          </button>

          <ThemeToggle />
          <NotificationCenter />

          {/* Avatar */}
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border/40">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white"
              style={{ background: avatarBg, fontSize: '10px', fontWeight: 800 }}>
              {initials}
            </div>
            <span className="font-medium text-[13px] hidden md:block truncate max-w-[150px] text-foreground">
              {displayName}
            </span>
          </div>

          <button onClick={onLogout}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150 ml-0.5"
            title={t('header.logout')}
            aria-label={t('header.logout')}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  )
}
