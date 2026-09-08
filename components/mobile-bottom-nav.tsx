'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, Wand2, BookMarked, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/context/profile-context'
import { getT } from '@/lib/i18n'

const NAV_ITEMS = [
  { href: '/dashboard',           icon: Home,       labelKey: 'nav.dashboard' as const },
  { href: '/dashboard/learning',  icon: BookMarked, labelKey: 'nav.learning'  as const },
  { href: '/dashboard/ai-coach',  icon: Sparkles,   labelKey: 'nav.aiCoach'  as const },
  { href: '/dashboard/tools',     icon: Wand2,      labelKey: 'nav.tools'    as const },
  { href: '/dashboard/community', icon: Users,      labelKey: 'nav.community' as const },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { lang } = useProfile()
  const t = getT(lang)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 min-h-11 py-2 px-1 transition-colors duration-150',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'w-10 h-7 flex items-center justify-center rounded-full transition-all duration-200',
                  isActive && 'bg-primary/10'
                )}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className={cn('text-[10px] leading-none', isActive ? 'font-semibold' : 'font-medium')}>
                {t(labelKey)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
