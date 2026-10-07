'use client'

import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, Users, Trophy, FileText, Home, Settings,
  Download, Sparkles, Wand2, TrendingUp, BookMarked, PenLine,
  ChevronLeft, ChevronRight, LifeBuoy, School,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useProfile } from '@/context/profile-context'
import { getT, type TranslationKey } from '@/lib/i18n'

export interface SidebarNavProps {
  isOpen?: boolean
  isCollapsed?: boolean
  onClose?: () => void
  onToggleCollapse?: () => void
}

const NAV_GROUPS = [
  {
    label: 'Learn',
    items: [
      { href: '/dashboard',              labelKey: 'nav.dashboard'    as TranslationKey, icon: Home       },
      { href: '/dashboard/learning',     labelKey: 'nav.learning'     as TranslationKey, icon: BookMarked },
      { href: '/dashboard/modules',      labelKey: 'nav.modules'      as TranslationKey, icon: BookOpen   },
      { href: '/dashboard/assessment',   labelKey: 'nav.assessment'   as TranslationKey, icon: FileText   },
    ],
  },
  {
    label: 'AI & Tools',
    items: [
      { href: '/dashboard/ai-coach',     labelKey: 'nav.aiCoach'      as TranslationKey, icon: Sparkles   },
      { href: '/dashboard/tools',        labelKey: 'nav.tools'        as TranslationKey, icon: Wand2      },
      { href: '/dashboard/journal',      labelKey: 'nav.journal'      as TranslationKey, icon: PenLine    },
    ],
  },
  {
    label: 'Community',
    items: [
      { href: '/dashboard/community',    labelKey: 'nav.community'    as TranslationKey, icon: Users      },
      { href: '/dashboard/resources',    labelKey: 'nav.resources'    as TranslationKey, icon: Download   },
    ],
  },
  {
    label: 'Progress',
    items: [
      { href: '/dashboard/achievements', labelKey: 'nav.achievements' as TranslationKey, icon: Trophy     },
      { href: '/dashboard/progress',     labelKey: 'nav.progress'     as TranslationKey, icon: TrendingUp },
      { href: '/dashboard/school',       labelKey: 'nav.school'       as TranslationKey, icon: School     },
      { href: '/dashboard/support',      labelKey: 'nav.support'      as TranslationKey, icon: LifeBuoy   },
      { href: '/dashboard/settings',     labelKey: 'nav.settings'     as TranslationKey, icon: Settings   },
    ],
  },
]

// Flat list for rendering
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

export function SidebarNav({ isOpen = false, isCollapsed = false, onClose, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname()
  const { lang, user } = useProfile()
  const t         = getT(lang)
  // Tickets where support replied and is waiting on the learner: shown as a red badge on Support.
  const tickets   = useQuery(api.tickets.listMine, user ? {} : 'skip')
  const waiting   = (tickets ?? []).filter((x) => x.status === 'pending_user').length
  const badge     = (href: string) => (href === '/dashboard/support' && waiting > 0 ? waiting : 0)

  useEffect(() => {
    if (!isOpen) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isOpen, onClose])

  return (
    <TooltipProvider delayDuration={300}>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-20 md:hidden" onClick={onClose} aria-hidden />
      )}

      <nav
        className={cn(
          'sidebar-nav fixed top-0 left-0 z-30',
          'md:top-[var(--app-header-h)]',
          'h-[100dvh] md:h-[calc(100dvh-var(--app-header-h))]',
          'flex flex-col',
          'bg-background border-r border-border/40',
          'overflow-x-hidden transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Scrollable nav list */}
        <div className={cn(
          'flex-1 overflow-y-auto py-3 scrollbar-none',
          'pb-[calc(var(--bottom-nav-h)+max(8px,env(safe-area-inset-bottom,0px)))] md:pb-3',
          isCollapsed ? 'px-2' : 'px-2.5',
        )}>
          {isCollapsed
            /* Collapsed: flat icon list with tooltips */
            ? NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
                const label    = t(labelKey)
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <Link href={href} onClick={onClose} aria-current={isActive ? 'page' : undefined} aria-label={badge(href) ? `${label}, ${badge(href)} waiting on you` : label}
                        className={cn(
                          'relative flex items-center justify-center min-w-11 min-h-11 mx-auto mb-0.5 rounded-xl transition-all duration-150',
                          isActive
                            ? 'bg-secondary text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                        )}>
                        <Icon className="w-4 h-4 shrink-0" />
                        {badge(href) > 0 && <span className="absolute ml-5 -mt-5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" aria-hidden="true">{badge(href)}</span>}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
                  </Tooltip>
                )
              })
            /* Expanded: grouped list */
            : NAV_GROUPS.map(({ label: groupLabel, items }) => (
                <div key={groupLabel} className="mb-4">
                  <p className="px-3 mb-1 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {groupLabel}
                  </p>
                  {items.map(({ href, labelKey, icon: Icon }) => {
                    const label    = t(labelKey)
                    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                    return (
                      <Link key={href} href={href} onClick={onClose} aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'relative flex items-center gap-2.5 min-h-11 px-3 rounded-lg text-sm font-medium mb-0.5',
                          'transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-secondary text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        )}>
                        {isActive && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full" aria-hidden />}
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate leading-none">{label}</span>
                        {badge(href) > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground motion-reduce:animate-none">
                            {badge(href)}<span className="sr-only"> waiting on you</span>
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ))
          }
        </div>

        {/* Collapse toggle */}
        <div className="hidden md:flex items-center justify-end shrink-0 border-t border-border/30 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onToggleCollapse}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>

    </TooltipProvider>
  )
}
