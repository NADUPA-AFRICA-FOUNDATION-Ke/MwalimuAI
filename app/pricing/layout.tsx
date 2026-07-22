'use client'

import { ProfileProvider } from '@/context/profile-context'

// The pricing page reads useProfile (signed-in state for CTAs); the provider
// is scoped per-route (see components/providers.tsx) so the other marketing
// pages don't carry the Supabase bundle.
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>
}
