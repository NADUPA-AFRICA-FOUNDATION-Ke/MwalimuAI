'use client'

import { useState, useEffect } from 'react'
import { BackButton } from '@/components/back-button'
import { computeBadges, getBadgeInput, type BadgeStatus } from '@/lib/streak'
import { useProfile } from '@/context/profile-context'
import {
  Trophy, BookOpen, BookMarked, GraduationCap, Flame, Calendar,
  PenLine, Users, Wand2, FlaskConical, Heart, Globe, Star, Lock, Check,
} from 'lucide-react'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  BookOpen, BookMarked, GraduationCap, Flame, Calendar,
  PenLine, Users, Wand2, FlaskConical, Heart, Globe, Star,
}

const COLOR_MAP: Record<string, { ring: string; bg: string; icon: string; text: string; bar: string }> = {
  blue:    { ring: 'ring-blue-200 dark:ring-blue-800',    bg: 'bg-blue-50 dark:bg-blue-950/30',    icon: 'text-blue-600 dark:text-blue-400',    text: 'text-blue-700 dark:text-blue-300',    bar: 'bg-blue-500'    },
  purple:  { ring: 'ring-purple-200 dark:ring-purple-800', bg: 'bg-purple-50 dark:bg-purple-950/30', icon: 'text-purple-600 dark:text-purple-400', text: 'text-purple-700 dark:text-purple-300', bar: 'bg-purple-500'  },
  amber:   { ring: 'ring-amber-200 dark:ring-amber-800',  bg: 'bg-amber-50 dark:bg-amber-950/30',  icon: 'text-amber-800 dark:text-amber-400',  text: 'text-amber-700 dark:text-amber-300',  bar: 'bg-amber-500'   },
  orange:  { ring: 'ring-orange-200 dark:ring-orange-800', bg: 'bg-orange-50 dark:bg-orange-950/30', icon: 'text-orange-700 dark:text-orange-400', text: 'text-orange-700 dark:text-orange-300', bar: 'bg-orange-500' },
  green:   { ring: 'ring-green-200 dark:ring-green-800',  bg: 'bg-green-50 dark:bg-green-950/30',  icon: 'text-green-700 dark:text-green-400',  text: 'text-green-700 dark:text-green-300',  bar: 'bg-green-500'   },
  pink:    { ring: 'ring-pink-200 dark:ring-pink-800',    bg: 'bg-pink-50 dark:bg-pink-950/30',    icon: 'text-pink-600 dark:text-pink-400',    text: 'text-pink-700 dark:text-pink-300',    bar: 'bg-pink-500'    },
  teal:    { ring: 'ring-teal-200 dark:ring-teal-800',    bg: 'bg-teal-50 dark:bg-teal-950/30',    icon: 'text-teal-600 dark:text-teal-400',    text: 'text-teal-700 dark:text-teal-300',    bar: 'bg-teal-500'    },
  violet:  { ring: 'ring-violet-200 dark:ring-violet-800', bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-600 dark:text-violet-400', text: 'text-violet-700 dark:text-violet-300', bar: 'bg-violet-500' },
  cyan:    { ring: 'ring-cyan-200 dark:ring-cyan-800',    bg: 'bg-cyan-50 dark:bg-cyan-950/30',    icon: 'text-cyan-600 dark:text-cyan-400',    text: 'text-cyan-700 dark:text-cyan-300',    bar: 'bg-cyan-500'    },
  rose:    { ring: 'ring-rose-200 dark:ring-rose-800',    bg: 'bg-rose-50 dark:bg-rose-950/30',    icon: 'text-rose-600 dark:text-rose-400',    text: 'text-rose-700 dark:text-rose-300',    bar: 'bg-rose-500'    },
  emerald: { ring: 'ring-emerald-200 dark:ring-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-700 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
  yellow:  { ring: 'ring-yellow-200 dark:ring-yellow-800', bg: 'bg-yellow-50 dark:bg-yellow-950/30', icon: 'text-yellow-800 dark:text-yellow-400', text: 'text-yellow-700 dark:text-yellow-300', bar: 'bg-yellow-500' },
}

interface BadgeProgress {
  current: number
  total: number
  label: string
}

// Maps badge ID → progress derived from the badge input
function getBadgeProgress(badgeId: string, input: ReturnType<typeof getBadgeInput>): BadgeProgress | null {
  switch (badgeId) {
    case 'first-lesson':
      return { current: Math.min(input.completedLessons, 1), total: 1, label: `${input.completedLessons}/1 lesson` }
    case 'module-master':
      return { current: Math.min(input.completedModules, 1), total: 1, label: `${input.completedModules}/1 module` }
    case 'program-grad':
      return { current: Math.min(input.certificates, 1), total: 1, label: `${input.certificates}/1 certificate` }
    case 'week-warrior':
      return { current: input.streak.current, total: 7, label: `${input.streak.current}/7 day streak` }
    case 'month-learner':
      return { current: input.streak.totalDays, total: 30, label: `${input.streak.totalDays}/30 active days` }
    case 'reflective':
      return { current: input.journalEntries, total: 5, label: `${input.journalEntries}/5 journal entries` }
    case 'community-voice':
      return { current: Math.min(input.communityPosts, 1), total: 1, label: `${input.communityPosts}/1 community post` }
    case 'tool-ninja':
      return { current: input.toolsUsed, total: 4, label: `${input.toolsUsed}/4 tools used` }
    case 'researcher':
      return { current: input.actionResearch ? 1 : 0, total: 1, label: input.actionResearch ? 'Completed' : 'Not started' }
    case 'wellbeing-champ':
      return { current: input.wellbeingProgram ? 1 : 0, total: 1, label: input.wellbeingProgram ? 'Completed' : 'Not completed' }
    case 'kiswahili':
      return { current: input.usedSwahili ? 1 : 0, total: 1, label: input.usedSwahili ? 'Used' : 'Switch to Kiswahili in settings' }
    case 'early-adopter':
      return { current: input.streak.totalDays, total: 10, label: `${input.streak.totalDays}/10 active days` }
    default:
      return null
  }
}

function BadgeCard({ badge, progress }: { badge: BadgeStatus; progress: BadgeProgress | null }) {
  const Icon  = ICON_MAP[badge.icon] ?? Trophy
  const color = COLOR_MAP[badge.color] ?? COLOR_MAP.blue

  if (badge.earned) {
    return (
      <div className={`rounded-2xl p-5 text-center ring-1 ${color.ring} ${color.bg}`}>
        <div className={`w-14 h-14 rounded-full ring-2 ${color.ring} bg-background flex items-center justify-center mx-auto mb-3`}>
          <Icon className={`w-7 h-7 ${color.icon}`} />
        </div>
        <h3 className="font-bold text-sm mb-1">{badge.name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{badge.desc}</p>
        <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wide ${color.text}`}>
          <Check className="w-3 h-3" /> Earned
        </div>
      </div>
    )
  }

  const pct = progress ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0

  return (
    <div className="glass rounded-2xl p-5 text-center hover:opacity-90 transition-opacity">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 relative">
        <Icon className="w-7 h-7 text-muted-foreground" />
        <Lock className="w-3.5 h-3.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
      </div>
      <h3 className="font-bold text-sm mb-1 text-muted-foreground">{badge.name}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{badge.desc}</p>

      {/* Progress bar */}
      {progress && (
        <div className="space-y-1.5">
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${COLOR_MAP[badge.color]?.bar ?? 'bg-primary'} ${pct > 0 ? 'opacity-60' : 'opacity-0'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress.label}</p>
        </div>
      )}
    </div>
  )
}

export default function AchievementsPage() {
  const { syncReady } = useProfile()
  const [badges, setBadges]     = useState<BadgeStatus[]>([])
  const [badgeInput, setBadgeInput] = useState<ReturnType<typeof getBadgeInput> | null>(null)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    const input = getBadgeInput()
    setBadgeInput(input)
    setBadges(computeBadges(input))
    setMounted(true)
  }, [syncReady])

  const earned    = badges.filter(b => b.earned)
  const notEarned = badges.filter(b => !b.earned)
  const pct       = badges.length ? Math.round((earned.length / badges.length) * 100) : 0

  return (
    <div className="max-w-4xl space-y-8">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Achievements & Badges</h1>
          <p className="text-sm text-muted-foreground">Earned automatically by doing the work — no manual claiming needed</p>
        </div>
      </div>

      {/* Overview */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between gap-6 flex-col sm:flex-row">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Badges earned</p>
            <p className="text-4xl font-bold gradient-text tabular-nums">
              {earned.length}<span className="text-xl text-muted-foreground font-normal">/{badges.length}</span>
            </p>
            {earned.length === 0 && mounted && (
              <p className="text-xs text-muted-foreground mt-1">Complete your first lesson to earn your first badge</p>
            )}
          </div>

          {/* Circular progress */}
          <div className="w-28 h-28 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted opacity-20" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="currentColor" strokeWidth="8"
                strokeDasharray={`${(2 * Math.PI * 42 * pct) / 100} ${2 * Math.PI * 42}`}
                strokeLinecap="round"
                className="text-primary transition-all duration-700"
              />
            </svg>
            <div className="relative -mt-28 h-28 flex items-center justify-center">
              <span className="text-2xl font-bold">{pct}%</span>
            </div>
          </div>

          {/* Next badge hint */}
          {notEarned.length > 0 && mounted && badgeInput && (
            <div className="text-sm text-muted-foreground max-w-xs">
              <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-1">Next to earn</p>
              <p className="font-semibold text-sm">{notEarned[0].name}</p>
              <p className="text-xs mt-0.5">{notEarned[0].desc}</p>
              {getBadgeProgress(notEarned[0].id, badgeInput) && (
                <p className="text-xs mt-1 text-primary font-medium">
                  {getBadgeProgress(notEarned[0].id, badgeInput)?.label}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      {mounted && badgeInput && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Lessons Done', value: badgeInput.completedLessons, icon: BookOpen },
            { label: 'Day Streak', value: badgeInput.streak.current, icon: Flame },
            { label: 'Journal Entries', value: badgeInput.journalEntries, icon: PenLine },
            { label: 'Tools Used', value: badgeInput.toolsUsed, icon: Wand2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass rounded-xl p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Earned */}
      {mounted && earned.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Earned ({earned.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {earned.map(b => (
              <BadgeCard key={b.id} badge={b} progress={badgeInput ? getBadgeProgress(b.id, badgeInput) : null} />
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {mounted && notEarned.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Still to earn ({notEarned.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {notEarned.map(b => (
              <BadgeCard key={b.id} badge={b} progress={badgeInput ? getBadgeProgress(b.id, badgeInput) : null} />
            ))}
          </div>
        </div>
      )}

      {!mounted && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
