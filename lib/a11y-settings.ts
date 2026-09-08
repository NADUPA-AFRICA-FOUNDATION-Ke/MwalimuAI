import { makeFunctionReference } from 'convex/server'
import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex/client'

const KEY = 'mwalimu_a11y'

let _userId: string | null = null
const updatePreferences = makeFunctionReference<'mutation', { a11ySettings: A11ySettings }, unknown>('profiles:updatePreferences')

export function setA11yUser(userId: string | null) {
  _userId = userId
  if (!userId) return
  const client = getConvexClient()
  void client?.query(api.profiles.me, {}).then(profile => {
    if (_userId !== userId || !profile?.a11ySettings) return
    const settings = { ...DEFAULT_A11Y, ...profile.a11ySettings }
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch {}
    applyA11y(settings)
  }).catch(() => {})
}

export interface A11ySettings {
  textSize:     'normal' | 'large' | 'xlarge' | 'xxlarge'
  highContrast: boolean
  reduceMotion: boolean
  dyslexiaFont: boolean
  wideSpacing:  boolean
}

export const DEFAULT_A11Y: A11ySettings = {
  textSize:     'normal',
  highContrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
  wideSpacing:  false,
}

export function getA11y(): A11ySettings {
  if (typeof window === 'undefined') return DEFAULT_A11Y
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_A11Y, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_A11Y
}

export function saveA11y(settings: A11ySettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(settings))
  applyA11y(settings)
  if (_userId) {
    const client = getConvexClient()
    void client?.mutation(updatePreferences, { a11ySettings: settings })
      .catch(err => console.error('[mwalimu] accessibility settings sync failed:', err))
  }
}

/**
 * Apply accessibility settings directly to the DOM.
 * Uses injected <style> elements + inline styles to guarantee they override
 * Tailwind v4's compiled (inline) utility values — CSS variable tricks don't
 * work when @theme inline is used.
 */
export function applyA11y(s: A11ySettings): void {
  if (typeof window === 'undefined') return
  const html = document.documentElement

  // ── 1. Text Size — set html font-size directly (rem-based utilities scale with this) ──
  const sizeMap: Record<A11ySettings['textSize'], string> = {
    normal:  '',
    large:   '112%',
    xlarge:  '124%',
    xxlarge: '140%',
  }
  html.style.fontSize = sizeMap[s.textSize]

  // ── 2. High Contrast — CSS filter applied to the root (works on every pixel) ──
  html.style.filter = s.highContrast ? 'contrast(1.45) saturate(0.85)' : ''

  // ── 3. Reduce Motion — injected <style> so animations are disabled everywhere ──
  injectStyle('mwalimu-a11y-motion', s.reduceMotion, `
    *, *::before, *::after {
      animation-duration:        0.001ms !important;
      animation-iteration-count: 1       !important;
      transition-duration:       0.001ms !important;
      transition-delay:          0ms     !important;
      scroll-behavior:           auto    !important;
    }
  `)

  // ── 4. Dyslexia-Friendly Font — injected <style> with maximum specificity ──
  injectStyle('mwalimu-a11y-dyslexia', s.dyslexiaFont, `
    body, body * {
      font-family: 'Verdana', 'Trebuchet MS', 'Arial', sans-serif !important;
    }
    body p, body li, body td, body label, body span, body div, body button {
      letter-spacing: 0.07em  !important;
      word-spacing:   0.14em  !important;
    }
  `)

  // ── 5. Wide Line Spacing — injected <style> targeting text-bearing elements ──
  injectStyle('mwalimu-a11y-spacing', s.wideSpacing, `
    body p, body li, body td, body label,
    body .text-xs, body .text-sm, body .text-base,
    body .leading-relaxed, body .leading-snug {
      line-height: 2.15 !important;
    }
  `)

  // ── Data attributes (for any non-Tailwind CSS that needs them) ──
  html.setAttribute('data-a11y-text', s.textSize)
  attr(html, 'data-a11y-contrast', s.highContrast)
  attr(html, 'data-a11y-motion',   s.reduceMotion)
  attr(html, 'data-a11y-dyslexia', s.dyslexiaFont)
  attr(html, 'data-a11y-spacing',  s.wideSpacing)
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function injectStyle(id: string, active: boolean, css: string): void {
  const existing = document.getElementById(id)
  if (active) {
    if (existing) return                           // already injected
    const el = document.createElement('style')
    el.id          = id
    el.textContent = css
    document.head.appendChild(el)
  } else {
    existing?.remove()
  }
}

function attr(el: HTMLElement, name: string, on: boolean): void {
  if (on) el.setAttribute(name, '')
  else    el.removeAttribute(name)
}
