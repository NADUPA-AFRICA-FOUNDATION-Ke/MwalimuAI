'use client'

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { useTheme } from 'next-themes'
import {
  Accessibility, X, Type, Contrast, ZapOff, AlignJustify,
  Moon, Sun, RotateCcw, BookOpen,
} from 'lucide-react'
import { getA11y, saveA11y, applyA11y, DEFAULT_A11Y, type A11ySettings } from '@/lib/a11y-settings'

const TEXT_SIZES: Array<{ key: A11ySettings['textSize']; px: number; label: string }> = [
  { key: 'normal',  px: 13, label: 'Normal'   },
  { key: 'large',   px: 16, label: 'Large'    },
  { key: 'xlarge',  px: 19, label: 'X-Large'  },
  { key: 'xxlarge', px: 23, label: 'XX-Large' },
]

const TOGGLES = [
  {
    key:   'highContrast' as const,
    icon:  Contrast,
    label: 'High Contrast',
    desc:  'Stronger colours, clearer edges',
  },
  {
    key:   'wideSpacing' as const,
    icon:  AlignJustify,
    label: 'Wide Line Spacing',
    desc:  'More space between lines of text',
  },
  {
    key:   'reduceMotion' as const,
    icon:  ZapOff,
    label: 'Reduce Motion',
    desc:  'Removes all animations',
  },
  {
    key:   'dyslexiaFont' as const,
    icon:  BookOpen,
    label: 'Dyslexia-Friendly Font',
    desc:  'Easier-to-read typeface with spacing',
  },
]

// Pure visual indicator — aria-hidden so the parent button's aria-pressed carries the state
function Indicator({ on }: { on: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`w-9 h-5 rounded-full flex items-center transition-colors duration-200 flex-shrink-0 ${
        on ? 'bg-primary justify-end' : 'bg-muted-foreground/25 justify-start'
      }`}
      style={{ padding: '2px' }}
    >
      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
    </div>
  )
}

// Trap Tab/Shift+Tab within `containerRef`
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return
    const el = containerRef.current

    const FOCUSABLE =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const nodes = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!nodes.length) return
      const first = nodes[0]
      const last  = nodes[nodes.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active, containerRef])
}

export function AccessibilityWidget() {
  const [open, setOpen]           = useState(false)
  const [settings, setSettings]   = useState<A11ySettings>(DEFAULT_A11Y)
  const [mounted, setMounted]     = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const panelRef   = useRef<HTMLDivElement>(null)
  const btnRef     = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const { theme, setTheme } = useTheme()

  // Stable base id for desc elements
  const uid = useId()

  // Load + apply on mount
  useEffect(() => {
    const s = getA11y()
    setSettings(s)
    applyA11y(s)
    setMounted(true)
  }, [])

  // Re-apply when settings change
  useEffect(() => {
    if (mounted) applyA11y(settings)
  }, [settings, mounted])

  // Focus management: move focus into panel on open, return to trigger on close
  useEffect(() => {
    if (open) {
      // Small rAF so the panel is in the DOM before we focus
      const id = requestAnimationFrame(() => closeBtnRef.current?.focus())
      return () => cancelAnimationFrame(id)
    } else {
      btnRef.current?.focus()
    }
  }, [open])

  // Trap Tab within the panel while open
  useFocusTrap(panelRef, open)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Alt+A toggle, Escape close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const announce = useCallback((msg: string) => {
    setAnnouncement('')
    requestAnimationFrame(() => setAnnouncement(msg))
  }, [])

  const update = useCallback((patch: Partial<A11ySettings>, label?: string) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveA11y(next)
    if (label) announce(label)
  }, [settings, announce])

  const reset = () => {
    setSettings(DEFAULT_A11Y)
    saveA11y(DEFAULT_A11Y)
    announce('All accessibility settings reset to default')
  }

  if (!mounted) return null

  const anyActive = settings.textSize !== 'normal' || settings.highContrast ||
    settings.reduceMotion || settings.dyslexiaFont || settings.wideSpacing

  const activeCount = [
    settings.textSize !== 'normal',
    settings.highContrast,
    settings.reduceMotion,
    settings.dyslexiaFont,
    settings.wideSpacing,
    theme === 'dark',
  ].filter(Boolean).length

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-xl focus:font-semibold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Screen-reader live region — polite so it doesn't interrupt */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Floating trigger button
          bottom-20 on mobile to clear the 64px MobileBottomNav;
          bottom-6 on md+ where the bottom nav is hidden */}
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-label={
          anyActive
            ? `Accessibility options — ${activeCount} setting${activeCount !== 1 ? 's' : ''} active. Press Alt+A`
            : 'Accessibility options — press Alt+A'
        }
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-haspopup="dialog"
        title="Accessibility options (Alt+A)"
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 rounded-full shadow-xl flex items-center justify-center transition-[background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-110 group ${
          open
            ? 'bg-foreground text-background scale-110'
            : 'bg-primary text-primary-foreground hover:shadow-primary/40'
        }`}
        style={{ width: 52, height: 52 }}
      >
        {/* Active indicator dot — sr-only text so screen readers know */}
        {anyActive && !open && (
          <>
            <span
              aria-hidden="true"
              className="absolute top-0.5 right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-background"
            />
            <span className="sr-only">({activeCount} active)</span>
          </>
        )}
        <Accessibility className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Panel */}
      {open && (
        <div
          id="a11y-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Accessibility options"
          aria-describedby="a11y-panel-desc"
          /* Responsive: fills most of the viewport width on mobile, fixed 296px on md+ */
          className="fixed bottom-[136px] right-4 left-4 md:left-auto md:right-6 md:w-[296px] z-50 bg-background border border-border/60 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
          style={{ animation: 'a11yPanelIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4" aria-hidden="true" />
              <span className="font-bold text-sm tracking-tight" id="a11y-panel-desc">
                Accessibility Options
              </span>
            </div>
            <button
              type="button"
              ref={closeBtnRef}
              onClick={() => setOpen(false)}
              className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Close accessibility panel"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">

            {/* ── Text Size ── */}
            <section aria-labelledby="a11y-text-label">
              <p id="a11y-text-label" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" aria-hidden="true" />
                Text Size
              </p>
              <div className="grid grid-cols-4 gap-1.5" role="group" aria-labelledby="a11y-text-label">
                {TEXT_SIZES.map(({ key, px, label }) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => update({ textSize: key }, `Text size set to ${label}`)}
                    aria-pressed={settings.textSize === key}
                    aria-label={`Text size: ${label}${settings.textSize === key ? ' (current)' : ''}`}
                    className={`min-h-11 py-3 rounded-xl font-bold transition-all duration-150 flex items-center justify-center border ${
                      settings.textSize === key
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30'
                        : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/60 hover:text-foreground'
                    }`}
                    style={{ fontSize: px }}
                  >
                    <span aria-hidden="true">A</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5 tracking-wide" aria-hidden="true">
                {['Normal', 'Large', 'X-Large', 'XX-Large'].join('  ·  ')}
              </p>
            </section>

            {/* ── Display Toggles ── */}
            <section aria-labelledby="a11y-display-label">
              <p id="a11y-display-label" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Display Options
              </p>
              <div className="space-y-1.5" role="group" aria-labelledby="a11y-display-label">
                {TOGGLES.map(({ key, icon: Icon, label, desc }) => {
                  const descId = `${uid}-desc-${key}`
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => update(
                        { [key]: !settings[key] },
                        `${label} ${!settings[key] ? 'enabled' : 'disabled'}`,
                      )}
                      aria-pressed={settings[key]}
                      aria-describedby={descId}
                      className={`w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left border ${
                        settings[key]
                          ? 'bg-primary/8 border-primary/30 text-primary'
                          : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-none mb-0.5">{label}</p>
                        <p id={descId} className="text-[11px] text-muted-foreground/80 leading-tight">{desc}</p>
                      </div>
                      <Indicator on={settings[key]} />
                    </button>
                  )
                })}

                {/* Dark Mode */}
                {(() => {
                  const descId = `${uid}-desc-darkmode`
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const next = theme === 'dark' ? 'light' : 'dark'
                        setTheme(next)
                        announce(`Dark mode ${next === 'dark' ? 'enabled' : 'disabled'}`)
                      }}
                      aria-pressed={theme === 'dark'}
                      aria-describedby={descId}
                      className={`w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left border ${
                        theme === 'dark'
                          ? 'bg-primary/8 border-primary/30 text-primary'
                          : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                      }`}
                    >
                      {theme === 'dark'
                        ? <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        : <Sun  className="w-4 h-4 shrink-0" aria-hidden="true" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-none mb-0.5">Dark Mode</p>
                        <p id={descId} className="text-[11px] text-muted-foreground/80 leading-tight">Switch to dark background</p>
                      </div>
                      <Indicator on={theme === 'dark'} />
                    </button>
                  )
                })()}
              </div>
            </section>

            {/* ── Reset ── */}
            <button
              type="button"
              onClick={reset}
              className="w-full min-h-11 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset All to Default
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[10.5px] text-muted-foreground py-2.5 border-t border-border/30 tracking-wide" aria-hidden="true">
            Settings saved automatically &nbsp;·&nbsp; Alt+A to toggle
          </p>
        </div>
      )}
    </>
  )
}
