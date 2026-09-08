'use client'

import { AppErrorState } from '@/components/app-error-state'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorState variant="server" reset={reset} />
}
