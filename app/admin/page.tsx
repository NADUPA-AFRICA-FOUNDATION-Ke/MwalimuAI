'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { AlertTriangle, ArrowRight, BookMarked, LifeBuoy, Search, ShieldAlert, Siren } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Avatar, Empty, fmtTime, PageHeader, Panel, ROLE_LABELS, StatCard, useStaff } from '@/components/admin/common'

export default function AdminDashboard() {
  const { can, role, name, email } = useStaff()
  const reviews = useQuery(api.admin.content.pendingReviews, can('content.read') ? {} : 'skip')
  const errs = useQuery(api.admin.errors.summary, can('audit.read_all') ? {} : 'skip')
  const tickets = useQuery(api.admin.tickets.counts, can('tickets.read') ? {} : 'skip')
  const flagged = useQuery(api.admin.assessmentIntegrity.flaggedCount, can('users.read') ? {} : 'skip')
  const incidents = useQuery(api.admin.incidents.list, can('streaks.read') ? {} : 'skip')
  const recent = useQuery(api.admin.audit.list, can('audit.read') ? { paginationOpts: { numItems: 8, cursor: null } } : 'skip')
  const open = incidents?.filter((i) => ['draft', 'approved', 'running'].includes(i.status)) ?? []
  const n = (v: number | undefined) => (v === undefined ? '…' : v.toLocaleString())

  return (
    <>
      <PageHeader title={`Welcome${name ? `, ${name.split(' ')[0]}` : ''}`} description={`Signed in as ${email} · ${ROLE_LABELS[role] ?? role}`} />

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Needs attention</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {can('tickets.read') && (
          <StatCard
            href="/admin/tickets"
            icon={<LifeBuoy />}
            label="Tickets needing a reply"
            value={n(tickets?.open)}
            sub={tickets?.overdue ? `${tickets.overdue} overdue first reply` : 'none overdue'}
            tone={tickets?.overdue ? 'alert' : tickets?.open ? 'warn' : 'default'}
          />
        )}
        {can('audit.read_all') && (
          <StatCard
            href="/admin/errors"
            icon={<AlertTriangle />}
            label="Errors, last 24 hours"
            value={n(errs?.openLast24h)}
            sub="check after each release"
            tone={errs?.openLast24h ? 'warn' : 'default'}
          />
        )}
        {can('users.read') && (
          <StatCard
            href="/admin/integrity"
            icon={<ShieldAlert />}
            label="Assessment flags, 7 days"
            value={n(flagged)}
            sub="copy, paste, screenshots, dev tools"
            tone={flagged ? 'warn' : 'default'}
          />
        )}
        {can('content.read') && (
          <StatCard href="/admin/content" icon={<BookMarked />} label="Content awaiting review" value={n(reviews?.length)} sub="drafts waiting for approval" />
        )}
        {can('streaks.read') && (
          <StatCard
            href="/admin/incidents"
            icon={<Siren />}
            label="Open incidents"
            value={incidents ? open.length : '…'}
            sub="bulk streak restorations"
            tone={open.length ? 'warn' : 'default'}
          />
        )}
        {can('users.read') && (
          <Link
            href="/admin/users"
            className="group flex flex-col justify-between rounded-xl border border-dashed bg-background p-4 transition hover:border-primary/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true"><Search className="h-4 w-4" /></span>
              Quick action
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 font-semibold">
              Find a user <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">by email, phone or name</div>
          </Link>
        )}
      </div>

      {can('audit.read') && (
        <Panel
          title="Recent activity"
          description="The latest actions taken in this console."
          actions={<Link href="/admin/audit" className="text-sm font-medium text-primary hover:underline">Open the audit log →</Link>}
        >
          {!recent ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : recent.page.length === 0 ? (
            <div className="p-4"><Empty>No admin actions yet.</Empty></div>
          ) : (
            <ul className="divide-y text-sm">
              {recent.page.map((r) => (
                <li key={r._id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={r.actorEmail} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <span className="font-medium">{r.action}</span>
                      <span className="text-muted-foreground"> · {r.targetLabel ?? r.targetId}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{r.actorEmail}<span className="sm:hidden"> · {fmtTime(r.createdAt)}</span></div>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{fmtTime(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  )
}
