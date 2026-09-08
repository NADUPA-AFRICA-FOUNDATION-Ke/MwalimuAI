'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'

const CONSENT_COOKIE = 'mwalimu_cookie_consent'

function hasAnalyticsConsent() {
  const cookieAccepted = document.cookie.split('; ').some((cookie) => cookie === `${CONSENT_COOKIE}=accepted`)
  if (cookieAccepted) return true
  try { return localStorage.getItem(CONSENT_COOKIE) === 'accepted' } catch { return false }
}

export function AnalyticsConsent() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const update = () => setAllowed(hasAnalyticsConsent())
    update()
    window.addEventListener('mwalimu-cookie-consent', update)
    return () => window.removeEventListener('mwalimu-cookie-consent', update)
  }, [])

  return allowed ? <Analytics /> : null
}
