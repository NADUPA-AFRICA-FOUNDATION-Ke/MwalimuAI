'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    const setOnline  = () => { setOffline(false); setVisible(false) }
    const setOffline_ = () => { setOffline(true);  setVisible(true)  }

    setOffline(!navigator.onLine)
    setVisible(!navigator.onLine)

    window.addEventListener('online',  setOnline)
    window.addEventListener('offline', setOffline_)
    return () => {
      window.removeEventListener('online',  setOnline)
      window.removeEventListener('offline', setOffline_)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="You are offline"
      className="fixed top-[calc(var(--app-header-h)+env(safe-area-inset-top,0px)+0.5rem)] inset-x-0 z-50 flex justify-center pointer-events-none"
    >
      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-auto">
        <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>You&apos;re offline — most features still work from cache</span>
      </div>
    </div>
  )
}
