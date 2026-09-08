import { cn } from '@/lib/utils'
import Image from 'next/image'

/**
 * The original Mwalimu AI logo mark. It is a supplied brand asset, so keep its
 * established artwork and sizing rather than recreating the logo in code.
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
