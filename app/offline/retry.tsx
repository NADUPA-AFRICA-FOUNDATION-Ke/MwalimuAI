'use client'

import { Button } from '@/components/ui/button'

export function OfflineRetry() {
  return <Button size="lg" className="rounded-xl" onClick={() => window.location.reload()}>Try again</Button>
}
