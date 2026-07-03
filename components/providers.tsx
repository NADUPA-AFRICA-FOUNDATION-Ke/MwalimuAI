'use client'

import dynamic from 'next/dynamic'
import { ThemeProvider } from '@/components/theme-provider'
import { ProfileProvider } from '@/context/profile-context'
import { Toaster } from '@/components/ui/sonner'

// Accessibility widget is a non-critical floating panel — defer it so it
// doesn't block the initial JS parse / hydration of the main UI.
const AccessibilityWidget = dynamic(
  () => import('@/components/accessibility-widget').then(m => ({ default: m.AccessibilityWidget })),
  { ssr: false }
)

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      nonce={nonce}
    >
      <ProfileProvider>
        {children}
        <AccessibilityWidget />
        <Toaster />
      </ProfileProvider>
    </ThemeProvider>
  )
}
