import { cn } from '@/lib/utils'
import Image from 'next/image'

/**
 * The Mwalimu AI logo mark (the gradient "M" + reader). Transparent PNG, so it
 * sits cleanly on light or dark surfaces — no coloured badge box needed.
 * Use in place of the old `bg-primary` + GraduationCap lockups.
 */
export function BrandMark({
  className,
  alt = 'Mwalimu AI',
}: {
  className?: string
  alt?: string
}) {
  return (
    <Image
      src="/mwalimu-mark.png"
      alt={alt}
      width={512}
      height={512}
      className={cn('object-contain select-none', className)}
      draggable={false}
    />
  )
}
