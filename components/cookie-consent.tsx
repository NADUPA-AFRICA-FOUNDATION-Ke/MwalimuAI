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
      className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t border-border bg-background px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-lg md:inset-x-auto md:bottom-5 md:right-5 md:max-w-md md:rounded-2xl md:border md:pb-4"
    >
      <h2 className="mb-1 text-base font-semibold text-foreground">Privacy choices</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        We store only what the app needs to stay secure and remember your settings. Anonymous analytics are optional.{' '}
        <Link className="font-medium text-primary underline underline-offset-2" href="/privacy">Privacy policy</Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" size="lg" onClick={() => { saveConsent('declined'); setConsent('declined') }}>
          Decline
        </Button>
        <Button type="button" size="lg" onClick={() => { saveConsent('accepted'); setConsent('accepted') }}>
          Accept
        </Button>
      </div>
    </aside>
  )
}
