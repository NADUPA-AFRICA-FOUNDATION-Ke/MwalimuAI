'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { BackButton } from '@/components/back-button'
import { useProfile } from '@/context/profile-context'
import { recordActivity } from '@/lib/streak'
import { PenLine, RefreshCw, ChevronDown, ChevronUp, Calendar, Flame, Sparkles, Lock, CheckCircle, Laugh, Smile, Meh, Frown, Annoyed, type LucideIcon } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const JOURNAL_KEY = 'mwalimu_journal'

const MOODS: { icon: LucideIcon; label: string; value: number; color: string }[] = [
  { icon: Laugh,   label: 'Energised', value: 5, color: 'text-green-600 dark:text-green-400'  },
  { icon: Smile,   label: 'Good',      value: 4, color: 'text-blue-600 dark:text-blue-400'    },
  { icon: Meh,     label: 'Okay',      value: 3, color: 'text-yellow-600 dark:text-yellow-400'},
  { icon: Frown,   label: 'Tired',     value: 2, color: 'text-orange-600 dark:text-orange-400'},
  { icon: Annoyed, label: 'Stressed',  value: 1, color: 'text-red-600 dark:text-red-400'      },
]

const PROMPTS: string[] = [
  'What was one moment today where a learner surprised you — positively or negatively? What does it tell you about them, or about your teaching?',
  'Describe a lesson this week that didn\'t go as planned. What would you do differently, and what can you learn from it?',
  'Which learner are you most concerned about right now? What\'s one specific thing you could try next week?',
  'What teaching practice are you most proud of this week? What made it effective?',
  'What has been hardest about implementing CBC this week? What support would help?',
  'Describe a moment this week when you felt genuinely effective as a teacher. What were you doing?',
  'What is one thing you\'ve been putting off that, if you addressed it, would reduce your stress significantly?',
  'How are you managing your energy this term? What\'s depleting you, and what\'s restoring you?',
  'If a trusted colleague observed your teaching today, what do you think they would see? What would you want them to see that\'s different?',
  'What does your classroom feel like for your quietest learners right now? What\'s one thing you could do for them?',
  'Describe one interaction with a parent or guardian this week. What went well? What could have gone better?',
  'What CBC competency have your learners developed most noticeably this month? What teaching choices contributed to that?',
  'Where are you carrying guilt or self-criticism about your teaching? Is it warranted — or is it unrealistic expectation?',
  'Who in your school community supports you? Have you told them lately that you appreciate them?',
  'What does a good day at school feel like for you? When did you last have one?',
  'Describe one learner\'s growth since the start of term. What specific things have you done that contributed?',
  'What professional goal did you set at the start of this term? How are you tracking against it?',
  'What does assessment feel like in your classroom right now — routine or stressful? What would "routine" look like?',
  'If you had one hour of additional preparation time each week, how would you use it? What does that tell you about your priorities?',
  'What\'s something you\'ve started doing differently since starting this PD program? What difference has it made?',
  'Describe a boundary you need to set. What is the cost of not setting it?',
  'What do you enjoy most about CBC that you didn\'t expect to enjoy? What surprised you?',
  'How are your learners\' energy levels this week compared to yours? What does that gap (or similarity) mean?',
  'What\'s one thing you\'d tell yourself at the start of this term, knowing what you know now?',
  'Describe your teaching space. What does it communicate to learners about what you value?',
  'Who is the hardest learner in your class to reach? What do you know about what makes them tick?',
  'What\'s your teaching "why"? Write it down today. Has it shifted since you started teaching?',
  'What part of your work feels most aligned with your values right now? What feels most misaligned?',
  'Describe one thing you\'ve done for your own wellbeing this week. Did it work?',
  'What would it mean for you to be "enough" as a teacher — not perfect, but genuinely enough?',
]

interface JournalEntry {
  id: string
  date: string
  displayDate: string
  prompt: string
  content: string
  mood: number
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function displayDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getDailyPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return PROMPTS[dayOfYear % PROMPTS.length]
}

const MOOD_LABELS: Record<number, { label: string; icon: LucideIcon; color: string }> =
  Object.fromEntries(MOODS.map(m => [m.value, { label: m.label, icon: m.icon, color: m.color }]))

export default function JournalPage() {
  const { user } = useProfile()
  const remoteEntries = useQuery(api.journal.listMine, user ? { limit: 100 } : 'skip')
  const saveRemote = useMutation(api.journal.save)
  const [entries, setEntries]       = useState<JournalEntry[]>([])
  const [content, setContent]       = useState('')
  const [mood, setMood]             = useState<number | null>(null)
  const [prompt, setPrompt]         = useState(getDailyPrompt())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saved, setSaved]           = useState(false)
  const [loading, setLoading]       = useState(true)
  const [mounted, setMounted]       = useState(false)

  // Load entries — Firestore first, localStorage fallback when offline
  useEffect(() => {
    if (!user) return

    const load = async () => {
      // Show cached entries immediately while Firestore loads
      try {
        const cached = localStorage.getItem(JOURNAL_KEY)
        if (cached) setEntries(JSON.parse(cached) as JournalEntry[])
      } catch {}

      try {
        if (remoteEntries) {
          const mapped: JournalEntry[] = remoteEntries.map(r => ({ id: r.clientId, date: r.entryDate, displayDate: displayDate(r.entryDate), prompt: r.title, content: r.content, mood: r.mood }))
          setEntries(mapped); localStorage.setItem(JOURNAL_KEY, JSON.stringify(mapped))
        }
      } finally {
        setLoading(false)
        setMounted(true)
      }
    }

    load()

    // Check for lesson context prompt
    try {
      const raw = localStorage.getItem('mwalimu_current_lesson')
      if (raw) {
        const ctx = JSON.parse(raw) as { lessonTitle?: string; programTitle?: string }
        if (ctx.lessonTitle) setPrompt(
          `You are currently studying "${ctx.lessonTitle}" in ${ctx.programTitle}. ` +
          `How does this lesson connect to your classroom? What will you try differently because of it?`
        )
      }
    } catch {}
  }, [user, remoteEntries])

  const todayEntry = entries.find(e => e.date === todayStr())
  const wordCount  = content.trim().split(/\s+/).filter(Boolean).length

  const saveEntry = async () => {
    if (!content.trim() || !mood || !user) return

    const entry: JournalEntry = {
      id:          `j-${Date.now()}`,
      date:        todayStr(),
      displayDate: displayDate(todayStr()),
      prompt,
      content:     content.trim(),
      mood,
    }

    // Optimistic update
    const updated = [entry, ...entries.filter(e => e.date !== todayStr())]
    setEntries(updated)
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated))
    setSaved(true)
    setContent('')
    setMood(null)
    setTimeout(() => setSaved(false), 3000)

    recordActivity('journal', user.id)

    void saveRemote({ clientId: entry.id, entryDate: entry.date, title: entry.prompt, content: entry.content, mood: entry.mood })
  }

  const avgMood = entries.length
    ? Math.round((entries.reduce((s, e) => s + e.mood, 0) / entries.length) * 10) / 10
    : null

  const streakDays = (() => {
    if (entries.length === 0) return 0
    const dates = [...new Set(entries.map(e => e.date))].sort().reverse()
    const ms = 86400000
    const todayMs = new Date(todayStr()).getTime()
    let streak = 0
    for (let i = 0; i < dates.length; i++) {
      const diff = Math.round((todayMs - new Date(dates[i]).getTime()) / ms)
      if (diff === i || (diff === i + 1 && i === 0)) { streak++ } else break
    }
    return streak
  })()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <PenLine className="w-5 h-5 text-accent" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Reflective Journal</h1>
              <p className="text-sm text-muted-foreground">Private daily reflections to grow your practice</p>
            </div>
          </div>
        </div>
        {mounted && entries.length > 0 && (
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-lg font-bold gradient-text">{entries.length}</p>
              <p className="text-xs text-muted-foreground">entries</p>
            </div>
            {streakDays > 0 && (
              <div>
                <p className="text-lg font-bold text-accent flex items-center gap-1">
                  <Flame className="w-4 h-4" aria-hidden="true" />{streakDays}
                </p>
                <p className="text-xs text-muted-foreground">day streak</p>
              </div>
            )}
            {avgMood !== null && (
              <div>
                <p className="text-lg font-bold text-foreground flex justify-center" aria-hidden="true">
                  {(() => { const m = MOOD_LABELS[Math.round(avgMood)]; return m ? <m.icon className={`w-5 h-5 ${m.color}`} /> : <Smile className="w-5 h-5" /> })()}
                </p>
                <p className="text-xs text-muted-foreground">avg mood</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's entry form */}
      {!todayEntry ? (
        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-2">
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                {displayDate(todayStr())} · Today&apos;s Prompt
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">{prompt}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const idx = PROMPTS.indexOf(prompt)
                setPrompt(PROMPTS[(idx + 1) % PROMPTS.length])
              }}
              className="rounded-xl ml-3 shrink-0 text-xs gap-1"
              aria-label="Get a different prompt"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Different prompt
            </Button>
          </div>

          {/* Mood */}
          <fieldset>
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
              How are you feeling today?
            </legend>
            <div className="flex gap-2">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  aria-pressed={mood === m.value}
                  aria-label={m.label}
                  className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all text-center ${
                    mood === m.value ? 'border-primary bg-primary/8' : 'border-border/50 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <m.icon className={`w-5 h-5 ${mood === m.value ? m.color : 'text-muted-foreground'}`} aria-hidden="true" />
                  <span className={`text-[10px] font-medium mt-0.5 ${mood === m.value ? 'text-primary' : 'text-muted-foreground'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Text */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label htmlFor="journal-text" className="text-xs font-medium text-muted-foreground">
                Your reflection
              </label>
              <span className="text-xs text-muted-foreground" aria-live="polite">{wordCount} words</span>
            </div>
            <Textarea
              id="journal-text"
              placeholder="Write freely — this journal is private, only visible to you. There's no right answer…"
              value={content}
              onChange={e => setContent(e.target.value)}
              className="rounded-xl resize-none text-sm min-h-[150px]"
              rows={6}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={saveEntry}
              disabled={!content.trim() || !mood}
              className="rounded-xl gap-2 font-semibold"
            >
              <PenLine className="w-4 h-4" aria-hidden="true" />
              Save Entry
            </Button>
            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-primary font-medium animate-in fade-in" role="status">
                <CheckCircle className="w-4 h-4" aria-hidden="true" /> Saved
              </p>
            )}
            {(!content.trim() || !mood) && content.length === 0 && (
              <p className="text-xs text-muted-foreground">Select a mood and write your reflection to save</p>
            )}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            {(() => { const m = MOOD_LABELS[todayEntry.mood]; return m ? <m.icon className={`w-6 h-6 shrink-0 ${m.color}`} aria-hidden="true" /> : null })()}
            <div>
              <p className="font-semibold text-sm">Today&apos;s entry saved</p>
              <p className="text-xs text-muted-foreground">{todayEntry.displayDate} · {MOOD_LABELS[todayEntry.mood]?.label}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-3">{todayEntry.content}</p>
          <p className="text-xs text-muted-foreground mt-3">Come back tomorrow for a new prompt.</p>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Your journal is private and synced to your account. No one else can see it.</span>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" aria-hidden="true" />
          Loading your journal…
        </div>
      )}

      {/* Past entries */}
      {mounted && !loading && entries.filter(e => e.date !== todayStr()).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Past Entries ({entries.filter(e => e.date !== todayStr()).length})
          </h2>
          <div className="space-y-2">
            {entries.filter(e => e.date !== todayStr()).map(entry => {
              const isOpen = expandedId === entry.id
              return (
                <div key={entry.id} className="glass rounded-2xl overflow-hidden">
                  <button
                    className="w-full text-left p-4 hover:bg-muted/20 transition-colors flex items-center gap-3"
                    onClick={() => setExpandedId(isOpen ? null : entry.id)}
                    aria-expanded={isOpen}
                  >
                    {(() => { const m = MOOD_LABELS[entry.mood]; return m ? <m.icon className={`w-5 h-5 shrink-0 ${m.color}`} aria-hidden="true" /> : <Smile className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden="true" /> })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">{entry.displayDate}</p>
                      <p className="text-sm text-muted-foreground truncate">{entry.content.slice(0, 90)}…</p>
                    </div>
                    {isOpen
                      ? <ChevronUp   className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/40 p-4 space-y-3">
                      <div className="bg-primary/5 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Prompt</p>
                        <p className="text-xs italic">{entry.prompt}</p>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mounted && !loading && entries.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Your journal is empty — write your first reflection above.</p>
        </div>
      )}
    </div>
  )
}
