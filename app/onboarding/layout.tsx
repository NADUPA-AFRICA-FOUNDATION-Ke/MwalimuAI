'use client'

import { ProfileProvider } from '@/context/profile-context'

// Onboarding consumes useProfile; the provider is scoped per-route (see
// components/providers.tsx) so marketing pages don't carry the Supabase bundle.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>
}
