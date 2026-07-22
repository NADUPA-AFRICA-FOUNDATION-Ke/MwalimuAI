'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  BookOpen, MessageSquare, FileText, Trophy, Users,
  Sparkles, Clock, ChevronRight, Flame, Check, CheckCircle2, X,
} from 'lucide-react'
import Link from 'next/link'
import { getStreak, recordActivity, getBadgeInput, computeBadges } from '@/lib/streak'
import { useProfile } from '@/context/profile-context'

export default function DashboardPage() {
  const { profile, user, syncReady } = useProfile()
  const [streak, setStreak] = useState({ current: 0, longest: 0, totalDays: 0, weekDays: Array(7).fill(false) as boolean[] })
  const [badgesEarned, setBadgesEarned] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [toolsUsed, setToolsUsed] = useState(0)
  const [communityPosts, setCommunityPosts] = useState(0)
  const [learningProgress, setLearningProgress] = useState(0)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

  useEffect(() => {
    // syncReady flips to true after profile-context finishes syncing cloud data
    // into localStorage — reads here always see real values, not empty-cache zeros.
    if (!syncReady || !user) return

    recordActivity('login', user.id)
    const s = getStreak()
    setStreak(s)
    const input = getBadgeInput()
    setBadgesEarned(computeBadges(input).filter(b => b.earned).length)
    setCompletedLessons(input.completedLessons)
    setToolsUsed(input.toolsUsed)
    setCommunityPosts(input.communityPosts)

    try {
      const raw = localStorage.getItem('mwalimu_learning_progress')
      if (raw) {
        const all = JSON.parse(raw) as Record<string, { completedLessons?: string[] }>
        const maxLessons = Object.values(all).reduce(
          (best, p) => Math.max(best, p.completedLessons?.length ?? 0), 0
        )
        setLearningProgress(Math.min(99, Math.round((maxLessons / 12) * 100)))
      }
    } catch {}

    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') setShowPaymentSuccess(true)
  }, [syncReady, user])

  const teacherName = profile?.name && profile.name !== 'Teacher' ? profile.name : 'Teacher'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const today = new Date()
  // Fixed Mon→Sun week grid: always reads left-to-right, today highlighted in place
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)) // rewind to Monday
  const weekGridDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const daysFromToday = Math.round((today.getTime() - d.getTime()) / 86_400_000)
    const isToday   = daysFromToday === 0
    const isFuture  = daysFromToday < 0
    const active    = !isFuture && daysFromToday < 7 ? streak.weekDays[daysFromToday] : false
    const label     = isToday ? 'Today' : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][i]
    return { label, active, isToday, isFuture }
  })

  // ── Streak milestones with personality ──────────────
  const MILESTONES = [
    { days: 1,   name: 'Chalk Dust',        emoji: '🖊️', flavour: 'Every legend starts somewhere.' },
    { days: 3,   name: 'Morning Register',  emoji: '📋', flavour: 'Three days. A pattern is forming.' },
    { days: 7,   name: 'Full Week Champ',   emoji: '🏆', flavour: 'A whole school week. Respect.' },
    { days: 14,  name: 'Two-Week Terror',   emoji: '💪', flavour: 'Most teachers quit here. You did not.' },
    { days: 21,  name: 'Habit Machine',     emoji: '⚙️', flavour: 'Science says 21 days builds a habit.' },
    { days: 30,  name: 'CBC Believer',      emoji: '⭐', flavour: 'A whole month. Your students feel it.' },
    { days: 60,  name: 'Iron Mwalimu',      emoji: '🔥', flavour: 'Two months of pure commitment.' },
    { days: 100, name: 'Blackboard Legend', emoji: '👑', flavour: 'One hundred days. The stuff of myth.' },
  ] as const

  const earnedMilestones = MILESTONES.filter(m => streak.current >= m.days)
  const nextMilestone    = MILESTONES.find(m => streak.current < m.days) ?? MILESTONES[MILESTONES.length - 1]
  const prevGoalDays     = earnedMilestones.length > 0 ? earnedMilestones[earnedMilestones.length - 1].days : 0
  const goalProgress     = streak.current >= nextMilestone.days
    ? 100
    : Math.round(((streak.current - prevGoalDays) / (nextMilestone.days - prevGoalDays)) * 100)

  const MOTIVATION_MAP = [
    { max: 0,   msg: 'Start today. Even one lesson changes things.' },
    { max: 1,   msg: 'You showed up. That is the hardest part done.' },
    { max: 2,   msg: 'Two in a row. Do not let tomorrow be the one you skip.' },
    { max: 6,   msg: 'You are building something real here.' },
    { max: 13,  msg: 'A full week. Your students notice the difference.' },
    { max: 20,  msg: 'Two weeks straight. Most teachers quit here. You did not.' },
    { max: 29,  msg: 'Three weeks. This is becoming who you are.' },
    { max: 59,  msg: 'A whole month. You are the example your students need.' },
    { max: 99,  msg: 'Two months of pure commitment. Legendary stuff.' },
    { max: 9999, msg: 'One hundred days. You are the legend now.' },
  ]
  const motivationalMsg = MOTIVATION_MAP.find(m => streak.current <= m.max)?.msg ?? ''

  const streakEmoji  = streak.current >= 100 ? '👑' : streak.current >= 60 ? '🔥' : streak.current >= 30 ? '⭐' : streak.current >= 14 ? '💪' : streak.current >= 7 ? '🏆' : streak.current >= 3 ? '🌿' : streak.current >= 1 ? '🌱' : '📚'
  const streakEmojiLabel = streak.current >= 100 ? 'Crown' : streak.current >= 60 ? 'Fire' : streak.current >= 30 ? 'Star' : streak.current >= 14 ? 'Muscle' : streak.current >= 7 ? 'Trophy' : streak.current >= 3 ? 'Leaf' : streak.current >= 1 ? 'Seedling' : 'Books'

  return (
    <div className="space-y-7">

      {/* Payment success */}
      {showPaymentSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium flex-1">Payment successful. Welcome to the Professional tier.</p>
          <button onClick={() => setShowPaymentSuccess(false)} className="shrink-0 p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Editorial header ─────────────────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            {streak.current >= 3 && (
              <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[11px] font-semibold">
                <Flame className="w-3 h-3" />
                {streak.current}-day streak
              </div>
            )}
            <h1 className="text-[26px] md:text-3xl font-bold tracking-tight leading-snug">
              {greeting}, {teacherName}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {learningProgress > 0
                ? `You're ${learningProgress}% through your current program.`
                : 'Your AI coaching session is ready when you are.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/dashboard/ai-coach">
              <Button size="sm" className="gap-2 rounded-xl px-5 shadow-sm shadow-primary/15 active:scale-[0.97] transition-transform">
                <MessageSquare className="w-3.5 h-3.5" />
                AI Coach
              </Button>
            </Link>
            <Link href="/dashboard/modules">
              <Button size="sm" variant="outline" className="gap-2 rounded-xl px-5 border-border/70 active:scale-[0.97] transition-transform">
                <BookOpen className="w-3.5 h-3.5" />
                Modules
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-6 h-px bg-border/50" />
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        <div className="glass rounded-xl p-4 stagger-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Lessons</p>
          <p className="text-[32px] font-bold gradient-text tabular-nums leading-none">{completedLessons}</p>
          <p className="text-xs text-muted-foreground mt-1.5">of 36 completed</p>
          <Progress value={Math.min(100, (completedLessons / 36) * 100)} className="h-0.5 mt-3" />
        </div>

        <div className="glass rounded-xl p-4 stagger-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Tools</p>
          <p className="text-[32px] font-bold text-accent tabular-nums leading-none">{toolsUsed}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {toolsUsed === 0 ? 'none tried yet' : `of 7 available`}
          </p>
          <div className="flex gap-0.5 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`flex-1 h-0.5 rounded-full transition-colors ${i < toolsUsed ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-4 stagger-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Posts</p>
          <p className="text-[32px] font-bold gradient-text tabular-nums leading-none">{communityPosts}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {communityPosts === 0 ? 'share with colleagues' : 'contributions'}
          </p>
          <div className="flex gap-0.5 mt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex-1 h-0.5 rounded-full transition-colors ${i < Math.min(communityPosts, 5) ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-4 stagger-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Badges</p>
          <p className="text-[32px] font-bold text-accent tabular-nums leading-none">{badgesEarned}</p>
          <p className="text-xs text-muted-foreground mt-1.5">of 12 earned</p>
          <div className="flex gap-0.5 mt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`flex-1 h-0.5 rounded-full transition-colors ${i < Math.min(badgesEarned, 6) ? 'bg-accent' : 'bg-border'}`} />
            ))}
          </div>
        </div>

      </div>

      {/* ── Continue Learning ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2.5">
            <span className="block w-[3px] h-4 bg-primary rounded-full" aria-hidden="true" />
            Continue Learning
          </h2>
          <Link href="/dashboard/modules" className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-0.5 transition-colors">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          <div className="glass rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] relative cursor-pointer group">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-200">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${learningProgress > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {learningProgress > 0 ? 'In Progress' : 'Start Here'}
                  </span>
                  {learningProgress > 0 && (
                    <span className="text-[10px] font-semibold text-primary tabular-nums">{learningProgress}%</span>
                  )}
                </div>
                <h3 className="font-semibold text-sm tracking-tight">CBC Foundations Program</h3>
                <p className="text-xs text-muted-foreground mt-1">Build your core CBC knowledge and classroom skills</p>
                {learningProgress > 0
                  ? <Progress value={learningProgress} className="h-1 mt-2.5" />
                  : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Begin your first lesson today</span>
                    </div>
                  )
                }
              </div>
            </div>
            <Link href="/dashboard/learning" className="absolute inset-0 rounded-xl" aria-label="CBC Foundations Program" />
          </div>

          <div className="glass rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] relative cursor-pointer group">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors duration-200">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1.5">
                  <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">Recommended</span>
                </div>
                <h3 className="font-semibold text-sm tracking-tight">Learner-Centered Pedagogy</h3>
                <p className="text-xs text-muted-foreground mt-1">Student-focused teaching approaches for CBC classrooms</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>4 hours · 8 lessons</span>
                </div>
              </div>
            </div>
            <Link href="/dashboard/modules" className="absolute inset-0 rounded-xl" aria-label="Start Learner-Centered Pedagogy" />
          </div>

        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2.5 mb-4">
          <span className="block w-[3px] h-4 bg-accent rounded-full" aria-hidden="true" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/ai-coach',    icon: Sparkles, label: 'AI Coach',     sub: 'Get instant help',  color: 'bg-primary/10 text-primary group-hover:bg-primary/15', shape: 'rounded-full'  },
            { href: '/dashboard/assessment',  icon: FileText, label: 'Assessment',   sub: 'Personalise path',  color: 'bg-accent/10  text-accent  group-hover:bg-accent/15',  shape: 'rounded-xl'   },
            { href: '/dashboard/community',   icon: Users,    label: 'Community',    sub: 'Join discussions',  color: 'bg-primary/10 text-primary group-hover:bg-primary/15', shape: 'rounded-lg'   },
            { href: '/dashboard/achievements',icon: Trophy,   label: 'Achievements', sub: 'View your badges',  color: 'bg-accent/10  text-accent  group-hover:bg-accent/15',  shape: 'rounded-2xl'  },
          ].map(({ href, icon: Icon, label, sub, color, shape }) => (
            <Link key={href} href={href}>
              <div className="glass rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] cursor-pointer group">
                <div className={`w-9 h-9 ${color} ${shape} flex items-center justify-center mb-3 transition-colors duration-200`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="font-semibold text-sm tracking-tight">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Streak Tracker ───────────────────────────────── */}
      <div className="glass rounded-xl overflow-hidden">

        {/* Earned milestone badges */}
        {earnedMilestones.length > 0 && (
          <div className="px-5 pt-4 pb-0 flex flex-wrap gap-1.5">
            {earnedMilestones.map(m => (
              <span
                key={m.days}
                title={m.flavour}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[11px] font-semibold select-none"
              >
                <span aria-hidden="true">{m.emoji}</span> {m.name}
              </span>
            ))}
          </div>
        )}

        <div className="p-5">

          {/* Header: emoji + count + motivation */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-xl select-none" role="img" aria-label={`${streakEmojiLabel}: ${streak.current}-day streak`}>
                {streakEmoji}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-accent tabular-nums">{streak.current}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {streak.current === 1 ? 'day streak' : 'day streak'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px]">
                  {motivationalMsg}
                </p>
              </div>
            </div>
            <Link href="/dashboard/achievements">
              <Button
                size="sm"
                variant="outline"
                className="text-xs rounded-lg h-7 px-3 border-border/60 hover:border-primary/40 hover:text-primary transition-all active:scale-[0.97] shrink-0"
              >
                All Badges
              </Button>
            </Link>
          </div>

          {/* Mon→Sun fixed week grid */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">This week</p>
          <div className="flex gap-2 mb-5">
            {weekGridDays.map(({ label, active, isToday: isTodayCell, isFuture }, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ${
                  active
                    ? 'bg-accent text-white shadow-sm shadow-accent/25'
                    : isTodayCell
                      ? 'border-2 border-dashed border-accent/50'
                      : isFuture
                        ? 'bg-muted/30 opacity-40'
                        : 'bg-muted/60'
                }`}>
                  {active
                    ? <Check className="w-3 h-3" />
                    : isTodayCell
                      ? <span className="w-1.5 h-1.5 rounded-full bg-accent/40 inline-block" />
                      : <span className="w-1 h-1 rounded-full bg-muted-foreground/20 inline-block" />
                  }
                </div>
                <span className={`text-[9px] font-semibold w-full text-center truncate ${
                  isTodayCell ? 'text-accent' : isFuture ? 'text-muted-foreground/40' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Next milestone goal */}
          <div className="rounded-xl bg-muted/40 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-xl select-none" role="img" aria-label={`${nextMilestone.name} milestone`}>{nextMilestone.emoji}</span>
                <div>
                  <p className="text-xs font-bold tracking-tight">{nextMilestone.name}</p>
                  <p className="text-[10px] text-muted-foreground">{nextMilestone.days}-day milestone</p>
                </div>
              </div>
              {streak.current < nextMilestone.days ? (
                <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                  {nextMilestone.days - streak.current} to go
                </span>
              ) : (
                <span className="text-[11px] font-bold text-accent shrink-0">Achieved!</span>
              )}
            </div>
            <Progress value={goalProgress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1.5 italic">{nextMilestone.flavour}</p>
          </div>

        </div>
      </div>

    </div>
  )
}
