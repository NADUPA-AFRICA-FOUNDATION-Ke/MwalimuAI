'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/report-client-error'

/** Catches errors that escape React (async code, event handlers) and reports them. Renders nothing. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Script errors from other origins carry no information; browser extensions are noise.
      if (!e.error || /extension:\/\//.test(e.filename ?? '')) return
      reportClientError(e.error)
    }
    const onRejection = (e: PromiseRejectionEvent) => reportClientError(e.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
