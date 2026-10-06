import { Home, Sparkles, Wand2, BookMarked, Users, type LucideIcon } from 'lucide-react'
import type { TranslationKey } from '@/lib/i18n'

/**
 * One source of truth for in-app navigation, shared by the bottom tab bar, the app header
 * (title + back control) and the account sheet. Tabs are destinations, never actions.
 */
export interface TabRoute {
  href: string
  icon: LucideIcon
  labelKey: TranslationKey
  /** Short label that fits one line under the icon. */
  shortKey: TranslationKey
}

export const TAB_ROUTES: TabRoute[] = [
  { href: '/dashboard', icon: Home, labelKey: 'nav.dashboard', shortKey: 'nav.tabHome' },
  { href: '/dashboard/learning', icon: BookMarked, labelKey: 'nav.learning', shortKey: 'nav.tabLearn' },
  { href: '/dashboard/ai-coach', icon: Sparkles, labelKey: 'nav.aiCoach', shortKey: 'nav.tabCoach' },
  { href: '/dashboard/tools', icon: Wand2, labelKey: 'nav.tools', shortKey: 'nav.tabTools' },
  { href: '/dashboard/community', icon: Users, labelKey: 'nav.community', shortKey: 'nav.tabCommunity' },
]

/** Everything that is not a bottom tab, reachable from the account sheet. */
export const MORE_ROUTES: { href: string; labelKey: TranslationKey }[] = [
  { href: '/dashboard/progress', labelKey: 'nav.progress' },
  { href: '/dashboard/achievements', labelKey: 'nav.achievements' },
  { href: '/dashboard/journal', labelKey: 'nav.journal' },
  { href: '/dashboard/resources', labelKey: 'nav.resources' },
  { href: '/dashboard/modules', labelKey: 'nav.modules' },
  { href: '/dashboard/assessment', labelKey: 'nav.assessment' },
  { href: '/dashboard/school', labelKey: 'nav.school' },
  { href: '/dashboard/support', labelKey: 'nav.support' },
  { href: '/dashboard/settings', labelKey: 'nav.settings' },
]

const segments = (pathname: string) => pathname.split('?')[0].split('/').filter(Boolean)

/**
 * Lessons and assessments get the whole screen: the tab bar steps aside and a sticky action bar
 * (previous / complete / next) sits in the thumb zone instead.
 */
export const isImmersiveScreen = (pathname: string) => {
  const s = segments(pathname)
  if (s[0] !== 'dashboard' || s[1] !== 'learning') return false
  return s.length === 5 || s[3] === 'assessment' || s[3] === 'assignment'
}

/** Where "back" goes when there is no history (deep link, refresh, or a freshly installed app). */
export function parentRoute(pathname: string): string {
  const s = segments(pathname)
  if (s[0] === 'dashboard' && s[1] === 'learning' && s.length === 5) return `/dashboard/learning/${s[2]}`
  if (s.length <= 2) return '/dashboard'
  return '/' + s.slice(0, -1).join('/')
}

const TITLES: Record<string, string> = {
  assessment: 'Assessment', assignment: 'Assignment', certificate: 'Certificate', lesson: 'Lesson',
  'lesson-plan': 'Lesson plan', 'parent-comms': 'Parent messages', 'policy-explainer': 'Policy explainer',
  'action-research': 'Action research', 'assignment-feedback': 'Assignment feedback', differentiation: 'Differentiation',
  'lesson-rehearsal': 'Lesson rehearsal', 'report-card': 'Report card',
}

/** Title for the app bar. Programs and lessons are named by the page itself, so use a generic label. */
export function screenTitle(pathname: string, t: (k: TranslationKey) => string): string {
  const clean = pathname.replace(/\/$/, '')
  const tab = TAB_ROUTES.find((r) => r.href === clean)
  if (tab) return t(tab.labelKey)
  const more = MORE_ROUTES.find((r) => r.href === clean)
  if (more) return t(more.labelKey)
  const s = segments(pathname)
  const last = s[s.length - 1] ?? ''
  if (s[0] === 'dashboard' && s[1] === 'support' && s.length === 3) return 'Ticket'
  if (s[0] === 'dashboard' && s[1] === 'learning') return s.length === 3 ? 'Program' : TITLES[last] ?? 'Lesson'
  return TITLES[last] ?? last.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/** Event the accessibility widget listens for, so any screen can open its panel. */
export const OPEN_A11Y_EVENT = 'mwalimu:open-a11y'
