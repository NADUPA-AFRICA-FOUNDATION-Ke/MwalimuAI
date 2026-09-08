'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const CONSENT_COOKIE = 'mwalimu_cookie_consent'
const MAX_AGE = 60 * 60 * 24 * 180

type Consent = 'accepted' | 'declined'

function readConsent(): Consent | null {
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${CONSENT_COOKIE}=`))
  const value = cookie?.split('=')[1]
  return value === 'accepted' || value === 'declined' ? value : null
}

function saveConsent(value: Consent) {
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`
  try { localStorage.setItem(CONSENT_COOKIE, value) } catch {}
  window.dispatchEvent(new Event('mwalimu-cookie-consent'))
}

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null)

  useEffect(() => {
    const saved = readConsent()
    if (saved) {
      setConsent(saved)
      return
    }
    try {
      const local = localStorage.getItem(CONSENT_COOKIE)
      if (local === 'accepted' || local === 'declined') setConsent(local)
    } catch {}
  }, [])

  if (consent) return null

  return (
    <aside
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[100] rounded-2xl border border-border bg-background p-4 shadow-2xl md:inset-x-auto md:right-5 md:max-w-md"
    >
      <h2 className="mb-1 text-sm font-semibold text-foreground">Privacy choices</h2>
      <p className="text-xs leading-relaxed text-muted-foreground">
        We use essential storage to keep the app secure and remember settings. With your permission, anonymous analytics help us improve Mwalimu AI. Read our <Link className="font-medium text-primary underline underline-offset-2" href="/privacy">Privacy Policy</Link>.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => { saveConsent('declined'); setConsent('declined') }}>
          Decline analytics
        </Button>
        <Button type="button" size="sm" onClick={() => { saveConsent('accepted'); setConsent('accepted') }}>
          Accept analytics
        </Button>
      </div>
    </aside>
  )
}
