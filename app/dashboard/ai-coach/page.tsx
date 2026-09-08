'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/back-button'
import {
  Send, Lightbulb, AlertCircle, RefreshCw, Wifi, WifiOff,
  Cpu, BookMarked, X, Globe, Plus, Trash2, MessageSquare, Menu,
} from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { useProfile } from '@/context/profile-context'
import { authHeaders } from '@/lib/authed-fetch'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────

const LESSON_CONTEXT_KEY = 'mwalimu_current_lesson'

interface LessonContext {
  programId: string; moduleId: string; lessonId: string
  programTitle: string; moduleTitle: string; lessonTitle: string
}

interface Conversation {
  id: string; title: string; created_at: string; updated_at: string
}

interface SavedMessage {
  id: string; role: 'user' | 'assistant'; content: string; created_at: string
}

type Backend = 'groq' | 'ollama' | null

const SUGGESTED = [
  'How do I implement formative assessment in my CBC classroom?',
  'What strategies work best for diverse learners?',
  'How can I integrate technology into my teaching?',
  'Tell me about competency-based grading',
]

function mkTitle(text: string) {
  const t = text.trim()
  return t.length > 55 ? t.slice(0, 55) + '…' : t
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function groupConversations(convs: Conversation[]) {
  const s = new Date()
  const today     = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()
  const yesterday = today - 86_400_000
  const last7     = today - 7  * 86_400_000
  const last30    = today - 30 * 86_400_000

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today',             items: [] },
    { label: 'Yesterday',         items: [] },
    { label: 'Previous 7 days',   items: [] },
    { label: 'Previous 30 days',  items: [] },
    { label: 'Older',             items: [] },
  ]

  for (const c of convs) {
    const t = new Date(c.updated_at).getTime()
    if      (t >= today)     groups[0].items.push(c)
    else if (t >= yesterday) groups[1].items.push(c)
    else if (t >= last7)     groups[2].items.push(c)
    else if (t >= last30)    groups[3].items.push(c)
    else                     groups[4].items.push(c)
  }

  return groups.filter(g => g.items.length > 0)
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1" role="status" aria-label="AI Coach is typing">
      {[0, 1, 2].map(i => (
        <div key={i}
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce motion-reduce:animate-none"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────

interface SidebarProps {
  conversations: Conversation[]
  selectedId: string | null
  loading: boolean
  onSelect: (id: string, messages: SavedMessage[]) => void
  onNewChat: () => void
  onDelete: (id: string) => void
}

function Sidebar({ conversations, selectedId, loading, onSelect, onNewChat, onDelete }: SidebarProps) {
  const messages = useQuery(api.ai.listMessages, selectedId ? { conversationId: selectedId as Id<'aiConversations'>, limit: 500 } : 'skip')
  const deleteConversation = useMutation(api.ai.deleteConversation)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSelect = (convId: string) => {
    if (convId === selectedId) return
    onSelect(convId, [])
  }

  useEffect(() => {
    if (!selectedId || !messages) return
    onSelect(selectedId, messages.map(m => ({ id: m._id, role: m.role, content: m.content, created_at: new Date(m.createdAt).toISOString() })))
  }, [messages, onSelect, selectedId])

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setDeletingId(convId)
    await deleteConversation({ conversationId: convId as Id<'aiConversations'> })
    setDeletingId(null)
    onDelete(convId)
  }

  const groups = groupConversations(conversations)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* New chat */}
      <div className="px-3 pb-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border border-border/60 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground text-muted-foreground"
        >
          <Plus className="w-4 h-4 shrink-0" />
          New chat
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {loading ? (
          <div className="text-xs text-muted-foreground px-3 py-4" role="status" aria-live="polite">Loading conversations…</div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground/40">
            <MessageSquare className="w-7 h-7 mb-2" />
            <p className="text-xs">No conversations yet</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(conv => (
                  <div
                    key={conv.id}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group relative cursor-pointer ${
                      selectedId === conv.id
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(conv.id)}
                      aria-current={selectedId === conv.id ? 'page' : undefined}
                      className="flex-1 min-w-0 min-h-11 text-left truncate leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      {conv.title}
                    </button>
                    <button
                      type="button"
                      onClick={e => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      aria-label={`Delete conversation ${conv.title}`}
                      className="min-w-11 min-h-11 inline-flex items-center justify-center opacity-60 group-hover:opacity-100 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── ChatPanel ─────────────────────────────────────────────────────
// Re-mounts (via key) when conversation changes, loading saved messages.

interface ChatPanelProps {
  conversationId: string | null
  userId: string
  initialMessages: SavedMessage[]
  lang: string
  profile: { name: string; subjects: string[]; grades: string[]; cbcLevel: string } | null
  onConversationCreated: (id: string, title: string) => void
  onMessageSaved: (convId: string) => void
  onToggleSidebar: () => void
}

function ChatPanel({
  conversationId: initConvId, userId, initialMessages,
  lang, profile,
  onConversationCreated, onMessageSaved, onToggleSidebar,
}: ChatPanelProps) {
  const [input, setInput]           = useState('')
  const [backend, setBackend]       = useState<Backend>(null)
  const [isOnline, setIsOnline]     = useState(true)
  const [lessonCtx, setLessonCtx]   = useState<LessonContext | null>(null)
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const convIdRef                   = useRef<string | null>(initConvId)
  const hasSentMessageRef           = useRef(false)
  const createConversation = useMutation(api.ai.createConversation)
  const appendMessage = useMutation(api.ai.appendMessage)
  const showSuggestions             = initialMessages.length === 0

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    try {
      const raw = localStorage.getItem(LESSON_CONTEXT_KEY)
      if (raw) setLessonCtx(JSON.parse(raw) as LessonContext)
    } catch {}
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  const uiInitialMessages = initialMessages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    parts: [{ type: 'text' as const, text: m.content }],
  }))

  // Capture the id once at mount so it never changes mid-stream.
  // ChatPanel already remounts (key prop) when switching conversations,
  // so the correct id is always set at mount time.
  const [stableId] = useState(() => initConvId ?? 'new')

  const { messages, status, error, sendMessage, setMessages } = useChat({
    id: stableId,
    messages: uiInitialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        lang,
        profile,
        timeZone: getBrowserTimeZone(),
        currentLesson: lessonCtx
          ? { programTitle: lessonCtx.programTitle, moduleTitle: lessonCtx.moduleTitle, lessonTitle: lessonCtx.lessonTitle }
          : null,
      }),
      fetch: async (url, init) => {
        const extra = await authHeaders()
        const headers = new Headers(init?.headers as HeadersInit)
        Object.entries(extra).forEach(([k, v]) => headers.set(k, v))
        const res = await fetch(url, { ...(init as RequestInit), headers })
        const b = res.headers.get('X-AI-Backend') as Backend
        if (b) setBackend(b)
        return res
      },
    }),
    onFinish: async ({ message }) => {
      const convId = convIdRef.current
      if (!convId) return
      const text = (message.parts as any[])
        ?.filter((p) => p.type === 'text').map((p) => p.text).join('')
        ?? (message as { content?: string }).content ?? ''

      void appendMessage({ conversationId: convId as Id<'aiConversations'>, role: 'assistant', content: text, clientId: `assistant-${Date.now()}` })

      onMessageSaved(convId)
    },
  })

  // Loading the saved conversation is allowed before the user sends anything.
  // Once a send has started, the local chat state owns the active stream; a
  // reactive sidebar update must not replace it with a partial database copy.
  useEffect(() => {
    if (hasSentMessageRef.current || status !== 'ready' || initialMessages.length === 0) return
    setMessages(initialMessages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      parts: [{ type: 'text' as const, text: m.content }],
    })))
  }, [initialMessages, setMessages, status])

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(async (text: string = input) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setInput('')
    hasSentMessageRef.current = true

    // Send to AI immediately — don't block on DB writes
    void sendMessage({ text: trimmed })

    let convId = convIdRef.current

    // Create conversation on first message
    if (!convId) {
      const id = await createConversation({ title: mkTitle(trimmed), clientId: `chat-${Date.now()}` })
      convId = id as string; convIdRef.current = convId
      onConversationCreated(convId, mkTitle(trimmed))
    }

    // Save user message — log if it fails so we can diagnose persistence issues
    if (convId) {
      void appendMessage({ conversationId: convId as Id<'aiConversations'>, role: 'user', content: trimmed, clientId: `user-${Date.now()}` })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, userId, createConversation, appendMessage, onConversationCreated, sendMessage])

  const errorMessage = (() => {
    if (!error) return null
    const msg = error.message
    if (msg.includes('not configured') || msg.includes('503'))
      return 'AI service not configured — add GROQ_API_KEY to .env.local and restart.'
    if (msg.includes('quota') || msg.includes('rate_limit') || msg.includes('rate limit'))
      return 'Online quota exceeded. If Ollama is running, the next message will use it automatically.'
    if (msg.includes('Ollama') || msg.includes('11434') || msg.includes('No AI backend'))
      return 'No AI backend available. Offline: install Ollama and run: ollama pull gemma2:2b'
    if (msg.includes('API_KEY') || msg.includes('401'))
      return 'Invalid API key — check GROQ_API_KEY in .env.local.'
    return `Something went wrong: ${msg}`
  })()

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Mobile only: sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Toggle chat history"
          >
            <Menu className="w-4 h-4" />
          </button>
          {/* Desktop: back button lives in sidebar; mobile: show it here */}
          <div className="md:hidden">
            <BackButton fallbackHref="/dashboard" label="Back" />
          </div>
        </div>

        {/* Backend indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {backend === 'groq' && (
            <><Wifi className="w-3.5 h-3.5 text-primary" /><span className="text-primary font-medium">Groq</span></>
          )}
          {backend === 'ollama' && (
            <><Cpu className="w-3.5 h-3.5 text-accent" /><span className="text-accent font-medium">Ollama (local)</span></>
          )}
          {!backend && (
            <>{isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-destructive" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span></>
          )}
        </div>
      </div>

      {/* Banners */}
      {lang === 'sw' && (
        <div role="status" aria-live="polite" className="mx-4 mb-1 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl text-xs shrink-0">
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span>Majibu ya AI yanaweza kuwa na makosa ya Kiswahili. Thibitisha istilahi muhimu.</span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" aria-live="assertive" className="mx-4 mb-2 flex items-start gap-3 bg-destructive/10 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm shrink-0">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {lessonCtx && (
        <div role="status" className="mx-4 mb-2 flex items-center gap-3 bg-primary/6 border border-primary/20 px-4 py-2.5 rounded-xl text-sm shrink-0">
          <BookMarked className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Studying · </span>
            <span className="font-medium text-xs">{lessonCtx.lessonTitle}</span>
            <span className="text-xs text-muted-foreground"> in {lessonCtx.programTitle}</span>
          </div>
          <Link href={`/dashboard/learning/${lessonCtx.programId}/${lessonCtx.moduleId}/${lessonCtx.lessonId}`}
            className="text-xs text-primary hover:underline shrink-0">
            Back to lesson
          </Link>
          <button type="button" onClick={() => setLessonCtx(null)} className="min-w-11 min-h-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground ml-1 shrink-0" aria-label="Dismiss lesson context">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isOnline && messages.length === 0 && backend !== 'ollama' && (
        <div role="status" aria-live="polite" className="mx-4 mb-2 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm shrink-0">
          <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You&apos;re offline. Messages will use Ollama if it&apos;s running. Setup: <code className="bg-amber-100 px-1 rounded">ollama pull gemma2:2b</code></span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-5" aria-live="polite" aria-busy={isLoading}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
              <Lightbulb className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2 tracking-tight">Your AI Coach</h1>
            <p className="text-muted-foreground max-w-md mb-8 leading-relaxed text-sm">
              Get personalised guidance on CBC implementation, assessment strategies, and teaching techniques.
            </p>
            {showSuggestions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED.map((q, i) => (
                  <button type="button" key={i} onClick={() => handleSend(q)}
                    className="min-h-11 text-left p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground group">
                    <span className="text-primary text-xs font-semibold mr-1.5">→</span>{q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message, idx) => {
              const textContent = (message.parts as any[])
                ?.filter((p) => p.type === 'text').map((p) => p.text).join('')
                ?? (message as { content?: string }).content ?? ''

              return (
                <div key={message.id ?? idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mr-2 mt-1">
                      <Lightbulb className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    {message.role === 'user'
                      ? textContent
                      : <MarkdownRenderer content={textContent} compact />
                    }
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-md px-4 md:px-8 py-4 pb-20 md:pb-4">
        {error && (
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => handleSend(
                (messages.findLast(m => m.role === 'user') as any)
                  ?.parts?.find((p: { type: string }) => p.type === 'text')?.text ?? ''
              )}
              className="min-h-11 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}
        <form className="flex gap-2 max-w-4xl mx-auto" onSubmit={e => { e.preventDefault(); void handleSend() }}>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={isOnline ? 'Ask your AI coach anything about CBC…' : 'Offline — using local Ollama…'}
            aria-label="Message to AI coach"
            autoComplete="off"
            disabled={isLoading}
            className="flex-1 rounded-xl border-border/60 focus:border-primary/50 bg-background"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="rounded-xl gap-2 px-5">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function AICoachPage() {
  const { lang, profile, user } = useProfile()
  const remoteConversations = useQuery(api.ai.listConversations, user ? { limit: 100 } : 'skip')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convLoading, setConvLoading]     = useState(true)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [chatMessages, setChatMessages]   = useState<SavedMessage[]>([])
  const [chatKey, setChatKey]             = useState('new')
  const [sidebarOpen, setSidebarOpen]     = useState(false)

  useEffect(() => {
    if (remoteConversations !== undefined) {
      setConversations(remoteConversations.map(c => ({ id: c._id, title: c.title, created_at: new Date(c.createdAt).toISOString(), updated_at: new Date(c.updatedAt).toISOString() })))
      setConvLoading(false)
    }
  }, [remoteConversations])

  const handleNewChat = useCallback(() => {
    setSelectedConvId(null)
    setChatMessages([])
    setChatKey(`new-${Date.now()}`)
    setSidebarOpen(false)
  }, [])

  const handleSelectConversation = useCallback((id: string, messages: SavedMessage[]) => {
    const isSameConversation = id === selectedConvId
    setSelectedConvId(id)
    setChatMessages(messages)
    // Sidebar message hydration can arrive after a newly created chat has
    // started streaming. Keep that live ChatPanel mounted in that case.
    if (!isSameConversation) setChatKey(id)
    setSidebarOpen(false)
  }, [selectedConvId])

  const handleConversationCreated = useCallback((id: string, title: string) => {
    setSelectedConvId(id)
    const now = new Date().toISOString()
    setConversations(prev => [{ id, title, created_at: now, updated_at: now }, ...prev])
  }, [])

  const handleMessageSaved = useCallback((convId: string) => {
    const now = new Date().toISOString()
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, updated_at: now } : c)
    )
  }, [])

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (selectedConvId === id) handleNewChat()
  }, [selectedConvId, handleNewChat])

  const profileForChat = profile ? {
    name: profile.name, subjects: profile.subjects,
    grades: profile.grades, cbcLevel: profile.cbcLevel,
  } : null

  const sidebarContent = (
    <Sidebar
      conversations={conversations}
      selectedId={selectedConvId}
      loading={convLoading}
      onSelect={handleSelectConversation}
      onNewChat={handleNewChat}
      onDelete={handleDeleteConversation}
    />
  )

  return (
    <div className="flex -mx-4 -mt-4 md:-mx-8 md:-mt-8" style={{ height: 'calc(100dvh - 57px)' }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-border/50 bg-sidebar">
        <div className="px-4 pt-4 pb-3 shrink-0 border-b border-border/40">
          <BackButton fallbackHref="/dashboard" label="Back to Dashboard" />
          <p className="text-xs font-semibold text-muted-foreground mt-3 mb-0.5 px-0.5">AI Coach</p>
        </div>
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
              <div>
                <p className="text-sm font-semibold">Chat history</p>
                <p className="text-xs text-muted-foreground">Your past conversations</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-3">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      {/* Chat panel — key forces full remount when conversation changes */}
      <ChatPanel
        key={chatKey}
        conversationId={selectedConvId}
        userId={user?.id ?? ''}
        initialMessages={chatMessages}
        lang={lang}
        profile={profileForChat}
        onConversationCreated={handleConversationCreated}
        onMessageSaved={handleMessageSaved}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />
    </div>
  )
}
