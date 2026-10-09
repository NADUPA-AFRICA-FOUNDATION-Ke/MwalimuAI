import { isNetworkFailure } from './network-error'
/** Browser-side: send an error to the server for grouping. Fire and forget; never throws. */
let sent = 0
export function reportClientError(error: unknown, extra?: { route?: string }) {
  try {
    if (typeof window === 'undefined' || sent >= 10) return // a broken page can fire in a loop
    sent++
    const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error')
    // Lost connections are the network, not a bug: label them (and whether the device knew it was offline) so they group apart.
    const message = isNetworkFailure(err) ? `Network failure (${navigator.onLine === false ? 'device offline' : 'device online'}): ${err.message}` : err.message || err.name
    const body = JSON.stringify({ message, stack: err.stack, route: extra?.route ?? window.location.pathname })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/log-error', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/log-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {
    /* ignore */
  }
}
