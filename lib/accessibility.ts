// Low-bandwidth mode + audio lesson helpers

import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex/client'

const LBW_KEY = 'mwalimu_low_bandwidth'

let _userId: string | null = null

export function setAccessibilityUser(userId: string | null) {
  _userId = userId
  if (!userId) return
  const client = getConvexClient()
  void client?.query(api.profiles.me, {}).then(profile => {
    if (_userId !== userId || typeof profile?.lowBandwidth !== 'boolean') return
    localStorage.setItem(LBW_KEY, profile.lowBandwidth ? 'true' : 'false')
    window.dispatchEvent(new Event('mwalimu-lbw-change'))
  }).catch(() => {})
}

export function getLowBandwidth(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(LBW_KEY) === 'true'
}

export function setLowBandwidth(on: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LBW_KEY, on ? 'true' : 'false')
  // Dispatch a storage event so other tabs can react
  window.dispatchEvent(new Event('mwalimu-lbw-change'))
  if (_userId) {
    const client = getConvexClient()
    void client?.mutation(api.profiles.upsert, { lowBandwidth: on })
      .catch(err => console.error('[mwalimu] low-bandwidth preference sync failed:', err))
  }
}

// ── Speech synthesis ──────────────────────────────────────────

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const isSwahili = lang === 'sw'
  const langPrefix = isSwahili ? 'sw' : 'en'

  // Preferred voice name fragments, in order of quality
  const preferred = isSwahili
    ? ['Google', 'Swahili', 'sw']
    : ['Google UK English Female', 'Google UK English Male', 'Google US English',
       'Samantha', 'Karen', 'Daniel', 'Google', 'Microsoft Zira', 'Microsoft David']

  const candidates = voices.filter(v =>
    v.lang.toLowerCase().startsWith(langPrefix)
  )

  for (const pref of preferred) {
    const match = candidates.find(v => v.name.includes(pref))
    if (match) return match
  }

  // Fall back to any English voice
  return candidates[0] ?? voices.find(v => v.lang.startsWith('en')) ?? null
}

export function speak(text: string, lang: string, onEnd?: () => void): void {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()

  const utt  = new SpeechSynthesisUtterance(text)
  utt.lang   = lang === 'sw' ? 'sw-KE' : 'en-GB'
  utt.rate   = 0.88
  utt.pitch  = 1.0
  utt.volume = 1.0
  if (onEnd) utt.onend = onEnd

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    const best = pickVoice(lang)
    if (best) utt.voice = best
    window.speechSynthesis.speak(utt)
  } else {
    // Voices load asynchronously on first call in some browsers
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      const best = pickVoice(lang)
      if (best) utt.voice = best
      window.speechSynthesis.speak(utt)
    }
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return false
  return window.speechSynthesis?.speaking ?? false
}
