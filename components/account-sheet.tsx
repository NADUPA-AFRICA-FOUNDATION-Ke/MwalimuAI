'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ChevronRight, LogOut, Languages, Accessibility } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/components/ui/use-mobile'
import { useProfile } from '@/context/profile-context'
import { getT } from '@/lib/i18n'
import { MORE_ROUTES, OPEN_A11Y_EVENT } from '@/lib/nav'
import { cn } from '@/lib/utils'

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'Auto' },
] as const

/**
 * Account and "everything else" in one place: the screens that are not bottom tabs, language,
 * theme, accessibility and sign out. A bottom sheet on phones (thumb zone), a side panel on desktop.
 */
export function AccountSheet({ open, onOpenChange, onLogout }: { open: boolean; onOpenChange: (o: boolean) => void; onLogout: () => void }) {
  const { profile, user, lang, toggleLang, mounted } = useProfile()
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const t = getT(lang)
  const name = mounted && profile?.name ? profile.name : 'Teacher'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn('gap-0 overflow-y-auto p-0', isMobile ? 'max-h-[85dvh] rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom))]' : 'w-80')}
      >
        <SheetHeader className="flex-row items-center gap-3 border-b border-border p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">{initials}</span>
          <div className="min-w-0 text-left">
            <SheetTitle className="truncate text-base">{name}</SheetTitle>
            <SheetDescription className="truncate text-sm">{user?.email ?? ''}</SheetDescription>
          </div>
        </SheetHeader>

        <nav aria-label="More" className="p-2">
          <ul>
            {MORE_ROUTES.map(({ href, labelKey }) => (
              <li key={href}>
                <Link href={href} onClick={() => onOpenChange(false)} className="flex min-h-12 items-center justify-between rounded-lg px-3 text-base hover:bg-secondary">
                  {t(labelKey)}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          <button type="button" onClick={toggleLang} className="flex min-h-12 w-full items-center justify-between rounded-lg border border-border px-3 text-base hover:bg-secondary">
            <span className="flex items-center gap-2"><Languages className="h-5 w-5 text-muted-foreground" aria-hidden="true" />Language</span>
            <span className="font-semibold text-primary">{t('header.langToggle')}</span>
          </button>

          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
            {THEMES.map(({ id, label }) => (
              <button key={id} type="button" role="radio" aria-checked={theme === id} onClick={() => setTheme(id)}
                className={cn('min-h-11 rounded-md text-sm font-medium', theme === id ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground')}>
                {label}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => { onOpenChange(false); window.dispatchEvent(new Event(OPEN_A11Y_EVENT)) }}
            className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-border px-3 text-base hover:bg-secondary">
            <Accessibility className="h-5 w-5 text-muted-foreground" aria-hidden="true" />Accessibility options
          </button>

          <button type="button" onClick={() => { onOpenChange(false); onLogout() }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 text-base font-semibold text-destructive hover:bg-destructive/10">
            <LogOut className="h-5 w-5" aria-hidden="true" />{t('header.logout')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
