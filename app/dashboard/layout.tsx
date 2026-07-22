'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard-header'
import { SidebarNav } from '@/components/sidebar-nav'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { OfflineIndicator } from '@/components/offline-indicator'
import { useProfile, ProfileProvider } from '@/context/profile-context'
import { createClient } from '@/lib/supabase/client'
import { trackWrite } from '@/lib/write-queue'

const COLLAPSE_KEY = 'mwalimu_sidebar_collapsed'

// ProfileProvider lives here (not in the root layout) so marketing pages
// don't ship the Supabase client + sync machinery in their JS bundle.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <DashboardShell>{children}</DashboardShell>
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

  // Restore desktop collapsed preference from localStorage on mount
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true')
    } catch {}
  }, [])

  // Auth guard
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/auth/login'); return }
    if (!user.email_confirmed_at) { router.push('/auth/sign-up-success'); return }
    if (mounted && !profile?.completed) router.push('/onboarding')
  }, [authLoading, user, mounted, profile, router])

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, String(next)) } catch {}
      if (user) {
        const supabase = createClient()
        trackWrite(supabase
          .from('profiles')
          .upsert({ id: user.id, sidebar_collapsed: next, updated_at: new Date().toISOString() }))
      }
      return next
    })
  }, [user])

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
        id="main-content"
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
