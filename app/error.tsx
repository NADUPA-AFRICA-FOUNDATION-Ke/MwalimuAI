'use client'

import { useEffect } from 'react'
import { AppErrorState } from '@/components/app-error-state'
import { reportClientError } from '@/lib/report-client-error'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError(error) }, [error])
  return <AppErrorState variant="server" reset={reset} />
}
