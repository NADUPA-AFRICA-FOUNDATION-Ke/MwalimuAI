import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The Mwalimu AI logo mark as a vector. Keeping the mark in SVG means it stays
 * crisp in the header, on certificates, and on high-density phone screens.
 */
export function BrandMark({
  className,
  alt = '',
}: {
  className?: string
  alt?: string
}) {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      viewBox="0 0 512 512"
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn('block select-none', className)}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-mark`} x1="86" y1="406" x2="430" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F5A623" />
          <stop offset="0.22" stopColor="#16C79A" />
          <stop offset="0.58" stopColor="#36E0B4" />
          <stop offset="0.82" stopColor="#0B9B72" />
          <stop offset="1" stopColor="#F5A623" />
        </linearGradient>
        <linearGradient id={`${id}-book`} x1="218" y1="360" x2="300" y2="450" gradientUnits="userSpaceOnUse">
          <stop stopColor="#48E0B5" />
          <stop offset="1" stopColor="#07946C" />
        </linearGradient>
      </defs>

      {/* A soft outline preserves the mark on both white and dark surfaces. */}
      <path
        d="M70 377 129 146c11-43 58-61 94-30l186 264"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".55"
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M101 384c35 21 72 5 82-31l54-202c11-42 58-59 93-29l126 259"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity=".55"
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M70 377 129 146c11-43 58-61 94-30l186 264"
        fill="none"
        stroke={`url(#${id}-mark)`}
        strokeWidth="43"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M101 384c35 21 72 5 82-31l54-202c11-42 58-59 93-29l126 259"
        fill="none"
        stroke={`url(#${id}-mark)`}
        strokeWidth="43"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="256" cy="284" r="32" fill={`url(#${id}-book)`} />
      <path d="M174 352c32-4 61 2 82 22 21-20 50-26 82-22v55c-32-3-60 5-82 26-22-21-50-29-82-26v-55Z" fill={`url(#${id}-book)`} />
      <path d="M256 374v59" stroke="#0A8F6A" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
