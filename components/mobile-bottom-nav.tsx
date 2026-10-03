'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useProfile } from '@/context/profile-context'
import { getT } from '@/lib/i18n'
import { TAB_ROUTES, isImmersiveScreen } from '@/lib/nav'

/**
 * Phone tab bar: five destinations, each icon + one-line label. The active tab changes the icon
 * (heavier stroke, tinted pill) and the label (colour and weight), not colour alone.
 * Opaque, so nothing shows through, and it clears the home indicator by at least 8px.
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { lang } = useProfile()
  const t = getT(lang)

  // Lessons and assessments take the whole screen; their own action bar replaces the tabs.
  if (isImmersiveScreen(pathname)) return null

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[max(8px,env(safe-area-inset-bottom))]"
      aria-label="Primary navigation"
    >
      <ul className="flex items-stretch justify-around">
        {TAB_ROUTES.map(({ href, icon: Icon, labelKey, shortKey }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={t(labelKey)}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 touch-manipulation"
              >
                <span
                  className={cn(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150',
                    isActive ? 'bg-primary/12 text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />
                </span>
                <span className={cn('text-xs leading-tight', isActive ? 'font-semibold text-primary' : 'font-medium text-muted-foreground')}>
                  {t(shortKey)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
