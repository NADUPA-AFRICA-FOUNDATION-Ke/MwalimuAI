'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, Users, Trophy, FileText, Home, Settings,
  Download, Sparkles, Wand2, TrendingUp, BookMarked, PenLine,
  ChevronLeft, ChevronRight,
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
      { href: '/dashboard/settings',     labelKey: 'nav.settings'     as TranslationKey, icon: Settings   },
    ],
  },
]

// Flat list for rendering
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

export function SidebarNav({ isOpen = false, isCollapsed = false, onClose, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname()
  const { lang }  = useProfile()
  const t         = getT(lang)

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
          'md:top-[60px]',
          'h-[100dvh] md:h-[calc(100dvh-60px)]',
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
          'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-3',
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
                      <Link href={href} onClick={onClose} aria-current={isActive ? 'page' : undefined} aria-label={label}
                        className={cn(
                          'flex items-center justify-center min-w-11 min-h-11 mx-auto mb-0.5 rounded-xl transition-all duration-150',
                          isActive
                            ? 'bg-primary/12 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                        )}>
                        <Icon className="w-4 h-4 shrink-0" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
                  </Tooltip>
                )
              })
            /* Expanded: grouped list */
            : NAV_GROUPS.map(({ label: groupLabel, items }) => (
                <div key={groupLabel} className="mb-4">
                  <p className="px-3 mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {groupLabel}
                  </p>
                  {items.map(({ href, labelKey, icon: Icon }) => {
                    const label    = t(labelKey)
                    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                    return (
                      <Link key={href} href={href} onClick={onClose} aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'relative flex items-center gap-2.5 min-h-11 px-3 rounded-lg text-[13px] font-medium mb-0.5',
                          'transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        )}>
                        {isActive && <span className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full" aria-hidden />}
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate leading-none">{label}</span>
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
