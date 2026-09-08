'use client'

import { AppErrorState } from '@/components/app-error-state'

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorState variant="dashboard" reset={reset} />
}
