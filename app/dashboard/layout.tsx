'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { SidebarNav } from '@/components/sidebar-nav'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { OfflineIndicator } from '@/components/offline-indicator'
import { useProfile, ProfileProvider } from '@/context/profile-context'
import { ContentProvider } from '@/context/content-context'
import { useMutation, useQuery } from 'convex/react'
import { useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'

const COLLAPSE_KEY = 'mwalimu_sidebar_collapsed'

// ProfileProvider lives here (not in the root layout) so marketing pages
// don't ship the Supabase client + sync machinery in their JS bundle.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <ContentProvider>
        <DashboardShell>{children}</DashboardShell>
      </ContentProvider>
    </ProfileProvider>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  // Mobile: overlay drawer open/closed
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  // Desktop: icon-only (collapsed) vs expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const router = useRouter()
  const { user, authLoading, profile, mounted, signOut } = useProfile()
  const { isAuthenticated } = useConvexAuth()
  const updatePreferences = useMutation(api.preferences.update)
  const account = useQuery(api.profiles.me, isAuthenticated ? {} : 'skip')

  // Restore desktop collapsed preference from localStorage on mount
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true')
    } catch {}
  }, [])

  // Auth guard
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(isAuthenticated ? '/onboarding' : '/auth/login')
      return
    }
    if (!user.email_confirmed_at) { router.push('/auth/sign-up-success'); return }
    if (mounted && !profile?.completed) router.push('/onboarding')
  }, [authLoading, user, mounted, profile, router, isAuthenticated])

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, String(next)) } catch {}
      if (user) {
        void updatePreferences({ sidebarCollapsed: next })
      }
      return next
    })
  }, [user, updatePreferences])

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div
          role="status"
          aria-label="Loading…"
          className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin motion-reduce:animate-none"
        />
      </div>
    )
  }

  if (!user) return null

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  // Staff can suspend an account; the server already refuses its requests, this explains why.
  if (account && (account.status === 'suspended' || account.status === 'deactivated')) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-xl font-bold">Your account is suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">You can&apos;t use Mwalimu AI right now. Your progress and certificates are safe. Please contact support to find out more.</p>
          <div className="mt-5 flex justify-center gap-3">
            <a href="/support" className="rounded-xl border px-4 py-2 text-sm font-medium">Contact support</a>
            <button type="button" onClick={handleLogout} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign out</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      data-sidebar={sidebarCollapsed ? 'collapsed' : 'expanded'}
    >
      <DashboardHeader
        onLogout={handleLogout}
        onMenuToggle={() => setSidebarOpen(v => !v)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Sidebar: position fixed, width driven by .sidebar-nav in the <style> tag */}
      <SidebarNav
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main: margin-left driven by .layout-main + [data-sidebar] in the <style> tag */}
      <main
        id="dashboard-main"
        tabIndex={-1}
        className="layout-main flex-1 min-w-0 overflow-x-hidden"
      >
        <div className="p-4 md:p-6 pb-safe-nav md:pb-6">
          {children}
        </div>
      </main>

      <MobileBottomNav />
      <OfflineIndicator />
    </div>
  )
}
