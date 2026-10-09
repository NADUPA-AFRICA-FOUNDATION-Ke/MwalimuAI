'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { NoticeBell } from '@/components/admin/notice-bell'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import {
  BarChart3,
  Bot,
  Megaphone,
  BookMarked,
  ClipboardList,
  AlertTriangle,
  LayoutDashboard,
  MessagesSquare,
  School,
  LogOut,
  Menu,
  ScrollText,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, useStaff } from './common'
import { BackupCodes } from './backup-codes'

/** The signed-in layout: sidebar (drawer on phones) filtered by what the role may open. */
const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: null, group: 'Overview' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, perm: 'analytics.read', group: 'Overview' },
  { href: '/admin/ai-usage', label: 'AI usage', icon: Bot, perm: 'analytics.read', group: 'Overview' },
  { href: '/admin/users', label: 'Users', icon: Users, perm: 'users.read', group: 'People' },
  { href: '/admin/schools', label: 'Schools', icon: School, perm: 'schools.manage', group: 'People' },
  { href: '/admin/community', label: 'Community', icon: MessagesSquare, perm: 'community.moderate', group: 'People' },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, perm: 'announcements.send', group: 'People' },
  { href: '/admin/tickets', label: 'Tickets', icon: LifeBuoy, perm: 'tickets.read', group: 'Support' },
  { href: '/admin/integrity', label: 'Assessment security', icon: ShieldAlert, perm: 'users.read', group: 'Support' },
  { href: '/admin/incidents', label: 'Incidents', icon: Siren, perm: 'streaks.read', group: 'Support' },
  { href: '/admin/content', label: 'Content', icon: BookMarked, perm: 'content.read', group: 'Content' },
  { href: '/admin/errors', label: 'Errors', icon: AlertTriangle, perm: 'audit.read_all', group: 'System' },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText, perm: 'audit.read', group: 'System' },
  { href: '/admin/staff', label: 'Staff', icon: ClipboardList, perm: 'staff.manage', group: 'System' },
] as const
const GROUPS = ['Overview', 'People', 'Support', 'Content', 'System'] as const

export function Shell({ children }: { children: ReactNode }) {
  const { email, role, can } = useStaff()
  const { signOut } = useAuthActions()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  const counts = useQuery(api.admin.tickets.counts, can('tickets.read') ? {} : 'skip')
  const waiting = (counts?.open ?? 0) + (counts?.inProgress ?? 0)
  const overdue = counts?.overdue ?? 0
  const visible = NAV.filter((n) => !n.perm || can(n.perm))
  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-4">
      {GROUPS.map((g) => {
        const items = visible.filter((n) => n.group === g)
        if (items.length === 0) return null
        return (
          <div key={g}>
            <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{g}</div>
            <div className="flex flex-col gap-0.5">
              {items.map((n) => {
                const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                    {n.href === '/admin/tickets' && waiting > 0 && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${overdue ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-white'}`}>
                        {waiting}<span className="sr-only"> needing a reply{overdue ? `, ${overdue} overdue` : ''}</span>
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
  const current = visible.find((n) => (n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)))
  return (
    <div className="min-h-svh bg-muted/20 md:grid md:grid-cols-[14rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow">Skip to main content</a>
      <aside className="sticky top-0 hidden h-svh overflow-y-auto border-r bg-background p-4 md:flex md:flex-col md:justify-between md:gap-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Staff console</span>
          </div>
          {nav}
        </div>
        <Account email={email} role={role} onSignOut={() => void signOut()} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <span className="text-sm font-semibold"><span className="md:hidden">Staff console</span>{current && <span className="hidden text-muted-foreground md:inline">{current.label}</span>}</span>
          <div className="flex items-center gap-2">
          <NoticeBell />
          <Button
            className="md:hidden"
            variant="ghost"
            size="icon"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          </div>
        </header>
        {open && (
          <div className="space-y-4 border-b bg-background p-4 md:hidden">
            {nav}
            <Account email={email} role={role} onSignOut={() => void signOut()} />
          </div>
        )}
        <main id="admin-main" tabIndex={-1} className="mx-auto max-w-6xl p-4 outline-none md:p-8">{children}</main>
      </div>
    </div>
  )
}

function Account({ email, role, onSignOut }: { email: string; role: string; onSignOut: () => void }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="truncate">
        <div className="truncate font-medium">{email}</div>
        <div className="text-muted-foreground">{ROLE_LABELS[role] ?? role}</div>
      </div>
      <BackupCodes />
      <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
        <LogOut className="mr-2 h-3.5 w-3.5" />
        Sign out
      </Button>
    </div>
  )
}
