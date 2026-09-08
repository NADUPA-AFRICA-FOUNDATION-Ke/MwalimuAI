'use client'

import { useState, type ReactNode } from 'react'
import { ConvexProvider } from 'convex/react'
import { getConvexClient } from '@/lib/convex/client'

export function ConvexAuthBridge({ children }: { children: ReactNode }) {
  const [client] = useState(() => getConvexClient())

  if (!client) return <>{children}</>
  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
