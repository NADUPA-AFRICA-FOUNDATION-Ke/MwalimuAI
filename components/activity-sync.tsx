'use client'

import { Component, useEffect, type ReactNode } from 'react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { applyServerActivity, flushPendingActivity } from '@/lib/streak'
import { flushPendingProgress } from '@/lib/learning-progress'

/**
 * Keeps this device's streak in step with the server. The query is live, so a streak restored by support
 * shows up within seconds without a reload or a new sign-in.
 */
function Inner() {
  const { isAuthenticated } = useConvexAuth()
  const state = useQuery(api.activity.syncState, isAuthenticated ? {} : 'skip')
  useEffect(() => {
    if (state) applyServerActivity(state)
  }, [state])
  // Work done offline is sent as soon as the connection is back (and on the next visit if the tab was closed).
  useEffect(() => {
    const flush = () => { flushPendingActivity(); flushPendingProgress() }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])
  return null
}

// A failed sync must never take the dashboard down; the device cache keeps working on its own.
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

export function ActivitySync() {
  return <Quiet><Inner /></Quiet>
}
