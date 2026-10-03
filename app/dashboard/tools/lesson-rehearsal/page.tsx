'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackButton } from '@/components/back-button'
import { useProfile } from '@/context/profile-context'
import { recordToolUsed } from '@/lib/streak'
import { authHeaders } from '@/lib/authed-fetch'
import {
  Users, Send, RefreshCw, AlertCircle, Play, RotateCcw,
} from 'lucide-react'
import { saveToolOutput, type ToolOutput } from '@/lib/tool-history'
import { ToolHistoryPanel } from '@/components/tool-history-panel'

const GRADES = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']

export default function LessonRehearsalPage() {
  const { lang, user } = useProfile()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [lessonPlan, setLessonPlan]   = useState('')
  const [grade, setGrade]             = useState('Grade 4')
  const [phase, setPhase]             = useState<'setup' | 'chat'>('setup')
  const [inputText, setInputText]     = useState('')
  const [historyKey, setHistoryKey]   = useState(0)

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/rehearsal',
      fetch: async (url, init) => {
        const extra = await authHeaders()
        const headers = new Headers(init?.headers as HeadersInit)
        Object.entries(extra).forEach(([k, v]) => headers.set(k, v))
        return fetch(url, { ...(init as RequestInit), headers })
      },
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const startRehearsal = () => {
    if (lessonPlan.trim().length < 30) return
    recordToolUsed('lesson-rehearsal', user?.id)
    setMessages([])
    setPhase('chat')
    const opener = `Good morning class! Today we are going to learn about ${lessonPlan.split('\n')[0].slice(0, 80)}. Please sit down and get ready.`
    sendMessage({ text: opener }, { body: { lessonPlan, grade, lang } })
  }

  const handleSend = () => {
    const text = inputText.trim()
    if (!text || isLoading) return
    sendMessage({ text }, { body: { lessonPlan, grade, lang } })
    setInputText('')
  }

  const reset = () => {
    if (user && messages.length > 1) {
      const transcript = messages
        .map(m => {
          const text = m.parts?.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map(p => p.text).join('') ?? ''
          return `${m.role === 'user' ? 'Teacher' : 'Class'}: ${text}`
        })
        .join('\n\n')
      saveToolOutput(
        user.id,
        'lesson-rehearsal',
        `${grade} · ${lessonPlan.split('\n')[0].slice(0, 60)}`,
        { lessonPlan, grade },
        transcript,
      )
      setHistoryKey(k => k + 1)
    }
    setMessages([])
    setPhase('setup')
    setInputText('')
  }

  const restoreEntry = (entry: ToolOutput) => {
    const i = entry.input as { lessonPlan?: string; grade?: string }
    if (i.lessonPlan) setLessonPlan(i.lessonPlan)
    if (i.grade) setGrade(i.grade)
  }

  // ── Setup phase ──────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <BackButton fallbackHref="/dashboard/tools" label="Back to Teacher Tools" />
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Lesson Rehearsal</h1>
              <p className="text-sm text-muted-foreground">Practice teaching with an AI class before the real lesson</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Paste your lesson plan, select the grade, then click <strong>Begin Rehearsal</strong>.
              The AI will simulate a real class — asking questions, showing confusion, getting distracted.
              Practice your responses before the real thing.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Grade *</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Your Lesson Plan *</Label>
            <Textarea
              placeholder="Paste your lesson plan here — topic, objectives, activities, assessment methods..."
              value={lessonPlan}
              onChange={e => setLessonPlan(e.target.value)}
              className="rounded-xl resize-none min-h-[200px] text-sm"
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              The more detail you provide, the more realistic the simulation.
            </p>
          </div>

          <Button
            onClick={startRehearsal}
            disabled={lessonPlan.trim().length < 30}
            className="w-full rounded-xl gap-2 font-semibold"
            size="lg"
          >
            <Play className="w-4 h-4" /> Begin Rehearsal
          </Button>
        </div>

        <ToolHistoryPanel toolId="lesson-rehearsal" refreshKey={historyKey} onRestore={restoreEntry} />
      </div>
    )
  }

  // ── Chat phase ───────────────────────────────────────────────
  const lastMsg       = messages[messages.length - 1]
  const classIsTyping = isLoading && (!lastMsg || lastMsg.role === 'user')

  return (
    <div className="max-w-2xl flex flex-col app-fill">
      {/* Header */}
      <div className="shrink-0 px-1 pt-1 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">Rehearsal — {grade}</p>
            <p className="text-xs text-muted-foreground mt-0.5">AI is playing your class</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="rounded-xl gap-1.5 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> New Rehearsal
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.map((msg, i) => {
          const isUser      = msg.role === 'user'
          const isStreaming  = isLoading && i === messages.length - 1 && !isUser
          const textContent = msg.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map(p => p.text)
            .join('') ?? ''

          return (
            <div key={msg.id ?? i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Users className="w-3.5 h-3.5 text-accent" />
                </div>
              )}
              <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                {!isUser && (
                  <p className="text-xs font-semibold text-accent/70 uppercase tracking-wide mb-1">
                    Class response
                  </p>
                )}
                {textContent}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-accent/50 rounded-sm animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          )
        })}

        {/* "Class is thinking" indicator — shown before the first assistant token arrives */}
        {classIsTyping && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mr-2 mt-1">
              <Users className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="px-4 py-3 bg-muted rounded-2xl rounded-tl-sm">
              <p className="text-xs font-semibold text-accent/70 uppercase tracking-wide mb-1">Class response</p>
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error.message}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-md pt-3 pb-1">
        <div className="flex gap-2">
          <Textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder="What you say to the class next…"
            disabled={isLoading}
            rows={2}
            className="flex-1 rounded-xl resize-none text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            className="rounded-xl px-4 self-end"
          >
            {isLoading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
