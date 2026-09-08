'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getProgramById, getLessonById, getNextLesson, getPrevLesson,
} from '@/lib/learning-paths-data'
import {
  getProgress, completeLesson, saveReflection, isLessonComplete,
  getDiscussions, addDiscussionPost, type DiscussionPost, type ProgramProgress,
} from '@/lib/learning-progress'
import { useProfile } from '@/context/profile-context'
import { recordActivity } from '@/lib/streak'
import { getLowBandwidth, speak, stopSpeaking, canSpeak } from '@/lib/accessibility'
import { renderReading, stripMd } from '@/lib/render-md'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle2, ChevronLeft, ChevronRight, Play, BookOpen,
  PenLine, MessageCircle, Send, Clock, Lightbulb, Video, Sparkles,
  Volume2, VolumeX, Share2, Check,
} from 'lucide-react'

const LESSON_CONTEXT_KEY = 'mwalimu_current_lesson'

type Tab = 'lesson' | 'reading' | 'reflect' | 'discuss'
const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'lesson',  label: 'Lesson',      icon: Video        },
  { id: 'reading', label: 'Reading',     icon: BookOpen     },
  { id: 'reflect', label: 'Reflection',  icon: PenLine      },
  { id: 'discuss', label: 'Discussion',  icon: MessageCircle },
]

export default function LessonPage() {
  const params = useParams<{ programId: string; moduleId: string; lessonId: string }>()
  const router = useRouter()
  const { profile, lang, user, syncReady } = useProfile()

  const program = getProgramById(params.programId)
  const found   = program ? getLessonById(program, params.moduleId, params.lessonId) : null
  const { module: mod, lesson } = found ?? {}

  const [tab, setTab]                       = useState<Tab>('lesson')
  const [progress, setProgress]             = useState<ProgramProgress>({ completedLessons: [], reflections: {} })
  const [reflection, setReflection]         = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [discussions, setDiscussions]       = useState<DiscussionPost[]>([])
  const [newPost, setNewPost]               = useState('')
  const [mounted, setMounted]               = useState(false)
  const [isSpeaking, setIsSpeaking]         = useState(false)
  const [lowBandwidth, setLowBandwidthState] = useState(false)
  const [shared, setShared]                 = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!program || !mod || !lesson) return
    const p = getProgress(program.id)
    setProgress(p)
    setReflection(p.reflections[`${mod.id}/${lesson.id}`] ?? '')
    const localDiscs = getDiscussions(program.id, mod.id, lesson.id)
    setDiscussions(localDiscs)
    setLowBandwidthState(getLowBandwidth())

    // Write current lesson to localStorage so AI Coach can pick it up
    try {
      localStorage.setItem(LESSON_CONTEXT_KEY, JSON.stringify({
        programId:    program.id,
        moduleId:     mod.id,
        lessonId:     lesson.id,
        programTitle: program.title,
        moduleTitle:  mod.title,
        lessonTitle:  lesson.title,
      }))
    } catch {}
    setMounted(true)
  }, [program, mod, lesson, user?.id])

  // Re-read progress after cloud sync so lesson completion shows correctly.
  // Reflection only updates if the user hasn't typed anything yet.
  useEffect(() => {
    if (!syncReady || !program || !mod || !lesson) return
    const p = getProgress(program.id)
    setProgress(p)
    setReflection(prev => prev || (p.reflections[`${mod.id}/${lesson.id}`] ?? ''))
  }, [syncReady, program, mod, lesson])

  if (!program || !mod || !lesson) {
    return <div className="p-8 text-muted-foreground">Lesson not found.</div>
  }

  const lessonDone = mounted && isLessonComplete(progress, mod.id, lesson.id)
  const nextLesson = getNextLesson(program, mod.id, lesson.id)
  const prevLesson = getPrevLesson(program, mod.id, lesson.id)

  const handleComplete = () => {
    completeLesson(program.id, mod.id, lesson.id)
    recordActivity('lesson', user?.id)
    setProgress(getProgress(program.id))
    if (nextLesson) {
      router.push(`/dashboard/learning/${program.id}/${nextLesson.moduleId}/${nextLesson.lessonId}`)
    } else {
      router.push(`/dashboard/learning/${program.id}?completed=true`)
    }
  }

  const handleReflectionChange = (text: string) => {
    setReflection(text)
    setReflectionSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveReflection(program.id, mod.id, lesson.id, text)
      setReflectionSaved(true)
    }, 800)
  }

  const handlePostDiscussion = () => {
    if (!newPost.trim()) return
    const authorName = profile?.name ?? 'Anonymous Teacher'
    const post = addDiscussionPost(program.id, mod.id, lesson.id, newPost.trim(), authorName, user?.id)
    setDiscussions(prev => [...prev, post])
    setNewPost('')
  }

  const modIndex   = program.modules.findIndex(m => m.id === mod.id)
  const lessonIndex = mod.lessons.findIndex(l => l.id === lesson.id)
  const lessonNum  = program.modules.slice(0, modIndex).reduce((s, m) => s + m.lessons.length, 0) + lessonIndex + 1
  const totalLessons = program.modules.reduce((s, m) => s + m.lessons.length, 0)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Link href={`/dashboard/learning/${program.id}`} className="hover:text-foreground transition-colors">{program.shortTitle}</Link>
        <ChevronRight className="w-3 h-3" />
        <span>{mod.title}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{lesson.title}</span>
      </div>

      {/* Lesson header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-muted-foreground">Lesson {lessonNum} of {totalLessons}</span>
            {lessonDone && (
              <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{lesson.title}</h1>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> {lesson.duration}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs shrink-0">
          <Link href="/dashboard/ai-coach">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Ask AI Coach
          </Link>
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-5">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                tab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="glass rounded-2xl p-6 min-h-[400px]">

        {/* Lesson tab */}
        {tab === 'lesson' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">{lesson.videoTitle}</h2>
              <div className="flex gap-2">
                {/* WhatsApp share */}
                <button
                  onClick={async () => {
                    const text = `📚 *${lesson.title}* — ${program.title} (Mwalimu AI)\n\nKey points:\n${lesson.videoPoints.map((p, i) => `${i+1}. ${p}`).join('\n')}`
                    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
                    window.open(url, '_blank')
                    setShared(true)
                    setTimeout(() => setShared(false), 2000)
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-600 transition-colors"
                  title="Share via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shared ? 'Opened!' : 'WhatsApp'}
                </button>
              </div>
            </div>

            {/* Video placeholder — hidden in low-bandwidth mode */}
            {!lowBandwidth && (
              <button type="button" aria-label="Continue to lesson reading" className="relative w-full bg-gray-900 dark:bg-gray-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-5 group cursor-pointer" onClick={() => setTab('reading')}>
                <span className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
                <span className="relative z-10 text-center">
                  <span className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-colors">
                    <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                  </span>
                  <span className="block text-white font-semibold text-sm mb-1">{lesson.videoTitle}</span>
                  <span className="block text-white/60 text-xs">{lesson.duration} · Click to continue to reading</span>
                </span>
              </button>
            )}
            {lowBandwidth && (
              <div className="bg-muted/30 rounded-xl p-3 mb-5 flex items-center gap-2 text-xs text-muted-foreground">
                <VolumeX className="w-3.5 h-3.5 shrink-0" />
                <span>Low-bandwidth mode: video hidden. All content available in the Reading tab.</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In this lesson</p>
                {canSpeak() && (
                  <button
                    onClick={() => {
                      if (isSpeaking) { stopSpeaking(); setIsSpeaking(false) }
                      else {
                        speak(lesson.videoPoints.join('. '), lang, () => setIsSpeaking(false))
                        setIsSpeaking(true)
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isSpeaking ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                  >
                    {isSpeaking ? <><VolumeX className="w-3.5 h-3.5" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Listen</>}
                  </button>
                )}
              </div>
              {lesson.videoPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-sm leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
            <Button className="mt-6 rounded-xl gap-2" onClick={() => setTab('reading')}>
              <BookOpen className="w-4 h-4" /> Continue to Reading
            </Button>
          </div>
        )}

        {/* Reading tab */}
        {tab === 'reading' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{lesson.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* WhatsApp share */}
                <button
                  onClick={() => {
                    const summary = `📖 *${lesson.title}*\n${stripMd(lesson.reading).slice(0, 300)}...\n\n_Read the full lesson on Mwalimu AI_`
                    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank')
                  }}
                  className="text-xs text-muted-foreground hover:text-green-600 transition-colors flex items-center gap-1"
                  title="Share reading via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                {/* Audio button */}
                {canSpeak() && (
                  <button
                    onClick={() => {
                      if (isSpeaking) { stopSpeaking(); setIsSpeaking(false) }
                      else {
                        speak(stripMd(lesson.reading), lang, () => setIsSpeaking(false))
                        setIsSpeaking(true)
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isSpeaking ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                  >
                    {isSpeaking ? <><VolumeX className="w-3.5 h-3.5" /> Stop audio</> : <><Volume2 className="w-3.5 h-3.5" /> Listen</>}
                  </button>
                )}
              </div>
            </div>
            {renderReading(lesson.reading)}
            <div className="flex items-center gap-2 mt-5 pt-5 border-t border-border/40">
              <Lightbulb className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs text-muted-foreground">
                Take your time with this reading. When you&apos;re ready, move to the Reflection tab to apply what you&apos;ve learned.
              </p>
            </div>
            <Button className="mt-4 rounded-xl gap-2" onClick={() => setTab('reflect')}>
              <PenLine className="w-4 h-4" /> Go to Reflection
            </Button>
          </div>
        )}

        {/* Reflection tab */}
        {tab === 'reflect' && (
          <div>
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-primary mb-1">Reflection Prompt</p>
              <p className="text-sm leading-relaxed">{lesson.reflectionPrompt}</p>
            </div>
            <Textarea
              placeholder={lesson.reflectionPlaceholder}
              value={reflection}
              onChange={e => handleReflectionChange(e.target.value)}
              className="rounded-xl resize-none min-h-[180px] text-sm"
              rows={7}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {reflectionSaved
                  ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Saved automatically</span>
                  : reflection ? 'Saving...' : 'Your reflection is saved automatically'
                }
              </p>
              <p className="text-xs text-muted-foreground">{reflection.split(/\s+/).filter(Boolean).length} words</p>
            </div>
          </div>
        )}

        {/* Discussion tab */}
        {tab === 'discuss' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4.5 h-4.5 text-accent" />
              <h2 className="font-semibold">Module Discussion</h2>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{discussions.length} posts</span>
            </div>
            <div className="flex-1 space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
              {discussions.map(post => (
                <div key={post.id} className={`rounded-xl p-3.5 text-sm ${post.isOwn ? 'bg-primary/8 border border-primary/20' : 'bg-muted/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-xs font-semibold ${post.isOwn ? 'text-primary' : 'text-foreground'}`}>
                      {post.isOwn ? 'You' : post.author}
                    </p>
                    <span className="text-xs text-muted-foreground">{post.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{post.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-border/40">
              <Textarea
                placeholder="Share a thought, question, or classroom experience related to this lesson..."
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                className="rounded-xl resize-none flex-1 text-sm"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handlePostDiscussion() } }}
              />
              <Button size="sm" onClick={handlePostDiscussion} disabled={!newPost.trim()} className="rounded-xl self-end gap-1.5 shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Ctrl+Enter to post</p>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between mt-5 gap-3">
        <div>
          {prevLesson ? (
            <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Link href={`/dashboard/learning/${program.id}/${prevLesson.moduleId}/${prevLesson.lessonId}`}>
                <ChevronLeft className="w-4 h-4" /> Previous
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
              <Link href={`/dashboard/learning/${program.id}`}>
                <ChevronLeft className="w-4 h-4" /> Program Overview
              </Link>
            </Button>
          )}
        </div>

        <Button
          onClick={handleComplete}
          className={`rounded-xl gap-2 font-semibold ${lessonDone ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''}`}
          size="sm"
        >
          {lessonDone ? (
            <><CheckCircle2 className="w-4 h-4" /> {nextLesson ? 'Next Lesson' : 'Finish Module'}</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Mark Complete & Continue</>
          )}
        </Button>
      </div>
    </div>
  )
}
