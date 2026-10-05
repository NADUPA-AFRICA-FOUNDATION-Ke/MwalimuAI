'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePrograms } from '@/context/content-context'

/**
 * Once staff bring the older Learning Modules library into the learning paths, its old addresses forward to the
 * new ones, so bookmarks and shared links keep working. Until then the old pages are shown as they were.
 */
export function LegacyRedirect({ programId, to }: { programId: string; to: string }) {
  const router = useRouter()
  const { getProgramById } = usePrograms()
  const managed = Boolean(getProgramById(programId))
  useEffect(() => {
    if (managed) router.replace(to)
  }, [managed, router, to])
  return null
}
