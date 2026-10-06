'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation } from 'convex/react'
import { ShieldAlert, EyeOff } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'

/**
 * Protects an assessment while it is open. A web page cannot control the device it runs on, so this works in layers:
 * it blocks what the browser lets a page block (copy, cut, paste, drag, right-click, selecting, printing, the usual
 * shortcuts), hides the questions whenever the window loses focus, a screenshot shortcut is pressed or developer tools
 * look open, marks the page with a faint watermark naming the learner, and records every attempt on the server for staff.
 * The answer key never reaches the browser and marking happens on the server, so tampering with this page gains nothing.
 *
 * Assistive input (dictation, switch access, on-screen keyboards that insert text) can be switched on: it only allows
 * text to be inserted into answer boxes. Everything else stays blocked, and the choice is recorded for staff.
 */

type GuardEvent = { type: string; at: number; detail?: string }
const GuardContext = createContext<{ assistive: boolean; record: (type: string, detail?: string) => void }>({ assistive: false, record: () => {} })
export const useAssessmentGuard = () => useContext(GuardContext)

/** Shortcuts that copy, paste, print, save, view source, open developer tools or take screenshots. */
function blockedShortcut(e: KeyboardEvent): string | null {
  const k = e.key.toLowerCase()
  const mod = e.ctrlKey || e.metaKey
  if (k === 'printscreen') return 'screenshot_key'
  if (k === 'f12') return 'devtools_open'
  if (e.metaKey && e.shiftKey && ['3', '4', '5', '6', 's'].includes(k)) return 'screenshot_key' // macOS / Windows snipping
  if (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) return 'devtools_open'
  if (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k)) return 'devtools_open'
  if (mod && k === 'u') return 'devtools_open'
  if (mod && k === 'c') return 'copy'
  if (mod && k === 'x') return 'cut'
  if (mod && k === 'v') return 'paste'
  if (mod && k === 'a') return 'select_all'
  if (mod && (k === 'p' || k === 's')) return 'print'
  return null
}

const DEVTOOLS_GAP = 160

export function AssessmentGuard({
  attempt,
  watermark,
  children,
  title = 'This assessment is monitored',
}: {
  /** When set, a server-side attempt is opened and events are recorded against it. */
  attempt?: { programId: string; kind: 'pre' | 'post'; onStarted?: (id: Id<'assessmentAttempts'>) => void }
  watermark: string
  children: ReactNode
  title?: string
}) {
  const start = useMutation(api.assessmentIntegrity.startAttempt)
  const log = useMutation(api.assessmentIntegrity.logEvents)
  const setAssistiveOnServer = useMutation(api.assessmentIntegrity.setAssistive)
  const [started, setStarted] = useState(false)
  const [assistive, setAssistive] = useState(false)
  const [hidden, setHidden] = useState<string | null>(null)
  // The watermark appears only once someone tries to capture or inspect the page.
  const [marked, setMarked] = useState(false)
  const [starting, setStarting] = useState(false)
  const attemptId = useRef<Id<'assessmentAttempts'> | null>(null)
  const queue = useRef<GuardEvent[]>([])
  const lastByType = useRef<Record<string, number>>({})

  const record = useCallback((type: string, detail?: string) => {
    const now = Date.now()
    if (now - (lastByType.current[type] ?? 0) < 1500) return // one entry per burst
    lastByType.current[type] = now
    queue.current.push({ type, at: now, ...(detail ? { detail } : {}) })
  }, [])

  // Send queued events every few seconds and when the page is closed.
  useEffect(() => {
    if (!started || !attempt) return
    const flush = () => {
      const id = attemptId.current
      if (!id || queue.current.length === 0) return
      const batch = queue.current.splice(0, 50)
      void log({ attemptId: id, events: batch }).catch(() => queue.current.unshift(...batch))
    }
    const t = setInterval(flush, 3000)
    window.addEventListener('pagehide', flush)
    return () => {
      clearInterval(t)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [started, attempt, log])

  // The blocks themselves.
  useEffect(() => {
    if (!started) return
    const stop = (type: string) => (e: Event) => {
      const target = e.target as HTMLElement | null
      const inAnswerBox = !!target?.closest?.('textarea, input')
      // Assistive input may put text INTO answer boxes; nothing may be copied OUT.
      if (assistive && inAnswerBox && (type === 'paste' || type === 'drop')) {
        record(type, 'assistive')
        return
      }
      e.preventDefault()
      e.stopPropagation()
      record(type)
    }
    const onCopy = stop('copy'), onCut = stop('cut'), onPaste = stop('paste'), onDrop = stop('drop'), onDrag = stop('drop'), onMenu = stop('context_menu')
    const onSelect = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.('textarea, input')) return
      e.preventDefault()
    }
    const onKey = (e: KeyboardEvent) => {
      const type = blockedShortcut(e)
      if (!type) return
      if (assistive && type === 'paste' && (e.target as HTMLElement | null)?.closest?.('textarea, input')) return record('paste', 'assistive')
      e.preventDefault()
      e.stopPropagation()
      record(type, e.key)
      if (type === 'screenshot_key' || type === 'devtools_open' || type === 'print') setMarked(true)
      if (type === 'screenshot_key' || type === 'devtools_open') {
        setHidden(type === 'screenshot_key' ? 'A screenshot key was pressed.' : 'Developer tools are not allowed during an assessment.')
        // Overwrite whatever a screenshot tool may have put on the clipboard.
        void navigator.clipboard?.writeText?.('').catch(() => {})
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        void navigator.clipboard?.writeText?.('').catch(() => {})
        setHidden('A screenshot key was pressed.')
        setMarked(true)
        record('screenshot_key', 'PrintScreen')
      }
    }
    const onBlur = () => { setHidden('The assessment is hidden while this window is not in front.'); record('window_blur') }
    const onVisibility = () => { if (document.hidden) { setHidden('The assessment is hidden while you are on another tab or app.'); record('tab_hidden') } }
    const onBeforePrint = () => { record('print'); setMarked(true) }
    const onFullscreen = () => { if (!document.fullscreenElement) record('fullscreen_exit') }

    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCut, true)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('drop', onDrop, true)
    document.addEventListener('dragstart', onDrag, true)
    document.addEventListener('contextmenu', onMenu, true)
    document.addEventListener('selectstart', onSelect, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('keyup', onKeyUp, true)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('fullscreenchange', onFullscreen)
    window.addEventListener('blur', onBlur)
    window.addEventListener('beforeprint', onBeforePrint)

    // Developer tools: a docked panel makes the page much smaller than the window. Side panels, toolbars and zoom can
    // do that too, so this is only recorded, never shown. Opening tools with their shortcut keys is blocked and shown.
    let wasDocked = false
    const check = setInterval(() => {
      const docked = window.outerWidth - window.innerWidth > DEVTOOLS_GAP || window.outerHeight - window.innerHeight > DEVTOOLS_GAP
      if (docked && !wasDocked) record('devtools_open', 'window-size')
      wasDocked = docked
    }, 2000)

    // Printing shows a blank page, and nothing can be selected outside answer boxes.
    const style = document.createElement('style')
    style.dataset.assessmentGuard = 'true'
    style.textContent = '@media print { body { display: none !important; } } [data-guarded] { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; } [data-guarded] textarea, [data-guarded] input { -webkit-user-select: text; user-select: text; }'
    document.head.appendChild(style)

    return () => {
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('cut', onCut, true)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('drop', onDrop, true)
      document.removeEventListener('dragstart', onDrag, true)
      document.removeEventListener('contextmenu', onMenu, true)
      document.removeEventListener('selectstart', onSelect, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('keyup', onKeyUp, true)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('fullscreenchange', onFullscreen)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('beforeprint', onBeforePrint)
      clearInterval(check)
      style.remove()
    }
  }, [started, assistive, record])

  // Only one tab may hold an assessment: a newer tab takes over and older ones hide.
  useEffect(() => {
    if (!started || typeof BroadcastChannel === 'undefined') return
    const me = Math.random().toString(36).slice(2)
    const ch = new BroadcastChannel('mwalimu-assessment')
    ch.onmessage = (e) => {
      if (e.data?.type === 'claim' && e.data.id !== me) {
        setHidden('This assessment was opened in another tab. Only one tab can be used.')
        record('second_tab')
      }
    }
    ch.postMessage({ type: 'claim', id: me })
    return () => ch.close()
  }, [started, record])

  const begin = async (withAssistive: boolean) => {
    setStarting(true)
    try {
      if (attempt) {
        const id = await start({ programId: attempt.programId, kind: attempt.kind, assistive: withAssistive })
        attemptId.current = id
        attempt.onStarted?.(id)
      }
      setAssistive(withAssistive)
      setStarted(true)
      try { await document.documentElement.requestFullscreen?.() } catch { /* not available on every device */ }
    } finally {
      setStarting(false)
    }
  }

  const turnOnAssistive = async () => {
    setAssistive(true)
    record('assistive_on')
    if (attemptId.current) void setAssistiveOnServer({ attemptId: attemptId.current }).catch(() => {})
  }

  if (!started) {
    return (
      <div className="glass max-w-2xl rounded-2xl p-7">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Copying, pasting, printing and screenshots are blocked, and the questions hide whenever you leave this window or tab.</li>
              <li>Developer tools are not allowed. Trying to capture or inspect the page adds a watermark with your account.</li>
              <li>Leaving the window, screenshot keys and copy or paste attempts are recorded for our staff.</li>
              <li>Work in one tab only. Opening the assessment in another tab hides this one.</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Use dictation, switch access or another tool that types for you? Choose <b>Start with assistive input</b>: it lets those tools put text into answer boxes. This is recorded so our staff know.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={starting} onClick={() => begin(false)}>Start assessment</Button>
              <Button variant="outline" disabled={starting} onClick={() => begin(true)}>Start with assistive input</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <GuardContext.Provider value={{ assistive, record }}>
      <div data-guarded className="relative" onCopy={(e) => e.preventDefault()}>
        {children}
        {marked && <Watermark text={watermark} />}
        {hidden && (
          <div role="alertdialog" aria-modal="true" aria-labelledby="guard-hidden-h" className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-center text-white">
            <div className="max-w-md">
              <EyeOff className="mx-auto mb-4 h-10 w-10" aria-hidden="true" />
              <p id="guard-hidden-h" className="text-lg font-semibold">Assessment hidden</p>
              <p className="mt-2 text-sm text-white/80">{hidden} This has been recorded.</p>
              <Button className="mt-6" variant="secondary" onClick={() => setHidden(null)}>Return to the assessment</Button>
            </div>
          </div>
        )}
        {!assistive && (
          <button type="button" onClick={turnOnAssistive} className="mt-4 text-xs text-muted-foreground underline underline-offset-4">
            I use dictation or another assistive input tool
          </button>
        )}
      </div>
    </GuardContext.Provider>
  )
}

/** A faint, repeated, unselectable label across the questions so a photo or screenshot can be traced to the account. */
function Watermark({ text }: { text: string }) {
  const [stamp] = useState(() => new Date().toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' }))
  const label = `${text} · ${stamp}`
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none" style={{ zIndex: 5 }}>
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-12 opacity-[0.07]">
        {Array.from({ length: 80 }, (_, i) => (
          <span key={i} className="whitespace-nowrap text-sm font-semibold text-foreground">{label}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * For answer boxes: refuses text that was not typed (pasted, dropped, injected by a tool) unless assistive input is on.
 * Put `onBeforeInput` on the <textarea>/<input> and pass every change through `accept(previous, next)`.
 */
export function useGuardedTextInput() {
  const { assistive, record } = useAssessmentGuard()
  return {
    onBeforeInput: (e: React.FormEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const type = (e.nativeEvent as InputEvent).inputType ?? ''
      if (!assistive && /insertFromPaste|insertFromDrop|insertFromYank|insertReplacementText/.test(type)) {
        e.preventDefault()
        record(type.includes('Drop') ? 'drop' : 'paste')
      }
    },
    /** Typing adds a few characters at a time; a sudden large jump is text inserted by something else. */
    accept: (previous: string, next: string) => {
      if (!assistive && next.length - previous.length > 40) {
        record('large_insert', String(next.length - previous.length))
        return previous
      }
      return next
    },
  }
}

/** A textarea that only accepts typed text inside an AssessmentGuard (pasted or injected text is refused unless assistive input is on). */
export function GuardedTextarea({ value, onValueChange, ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & { value: string; onValueChange: (v: string) => void }) {
  const guard = useGuardedTextInput()
  return (
    <textarea
      {...rest}
      value={value}
      onBeforeInput={guard.onBeforeInput}
      onChange={(e) => onValueChange(guard.accept(value, e.target.value))}
      className={`flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm ${rest.className ?? ''}`}
    />
  )
}
