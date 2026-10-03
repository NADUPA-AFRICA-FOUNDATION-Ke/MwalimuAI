'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  fallbackHref?: string
  label?: string
  className?: string
  variant?: 'default' | 'floating' | 'minimal'
}

export function BackButton({
  fallbackHref = '/',
  label = 'Back',
  className = '',
  variant = 'default',
}: BackButtonProps) {
  const router = useRouter()
  // Inside the signed-in app the app bar already provides Back on phones; don't show a second one.
  const hideOnPhone = usePathname().startsWith('/dashboard')

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  const baseStyles =
    'group inline-flex items-center gap-2 font-medium text-sm rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  const variantStyles = {
    default:
      'px-4 py-2 bg-background border border-border text-foreground shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.98]',
    floating:
      'px-4 py-2 bg-secondary text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-md hover:shadow-lg active:scale-[0.98]',
    minimal:
      'px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.98]',
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={`Go back to previous page${label !== 'Back' ? `: ${label}` : ''}`}
      className={cn(baseStyles, 'min-h-11', variantStyles[variant], hideOnPhone && 'max-md:hidden', className)}
    >
      <ArrowLeft
        className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
        aria-hidden="true"
      />
      <span>{label}</span>
    </button>
  )
}
