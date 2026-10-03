'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Icon-only Back for header bars and page corners. 44px target; goes to the previous screen, or to
 * `fallbackHref` when there is no history (deep link, refresh, freshly installed app).
 */
export function HeaderBack({ fallbackHref = '/', onClick, className }: { fallbackHref?: string; onClick?: () => void; className?: string }) {
  const router = useRouter()
  const goBack = () => {
    if (onClick) return onClick()
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(fallbackHref)
  }
  return (
    <button type="button" onClick={goBack} aria-label="Back"
      className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-secondary', className)}>
      <ArrowLeft className="h-6 w-6" aria-hidden="true" />
    </button>
  )
}
