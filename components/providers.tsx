'use client'

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ConvexAuthBridge } from '@/components/convex-provider'

// Accessibility widget is a non-critical floating panel — defer it so it
// doesn't block the initial JS parse / hydration of the main UI.
const AccessibilityWidget = dynamic(
  () => import('@/components/accessibility-widget').then(m => ({ default: m.AccessibilityWidget })),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {/* ProfileProvider (Supabase auth + cloud sync, ~350 KB of JS) is NOT
          mounted here — marketing pages must not pay for it. It wraps only
          the routes that consume it: /dashboard (its layout), /onboarding,
          and /pricing (their layouts). */}
      <ConvexAuthBridge>{children}</ConvexAuthBridge>
      <AccessibilityWidget />
      <Toaster />
    </ThemeProvider>
  )
}
