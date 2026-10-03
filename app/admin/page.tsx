'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, fmtTime, PageHeader, ROLE_LABELS, useStaff } from '@/components/admin/common'

export default function AdminDashboard() {
  const { can, role, name, email } = useStaff()
  const reviews = useQuery(api.admin.content.pendingReviews, can('content.read') ? {} : 'skip')
  const incidents = useQuery(api.admin.incidents.list, can('streaks.read') ? {} : 'skip')
  const recent = useQuery(
    api.admin.audit.list,
    can('audit.read') ? { paginationOpts: { numItems: 8, cursor: null } } : 'skip',
  )
  const open = incidents?.filter((i) => ['draft', 'approved', 'running'].includes(i.status)) ?? []

  return (
    <>
      <PageHeader
        title={`Welcome${name ? `, ${name.split(' ')[0]}` : ''}`}
        description={`Signed in as ${email} · ${ROLE_LABELS[role] ?? role}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {can('users.read') && (
          <Tile
            href="/admin/users"
            title="Find a user"
            body="Search by email, phone or name to restore a streak, edit a profile or suspend an account."
          />
        )}
        {can('content.read') && (
          <Tile
            href="/admin/content"
            title="Content awaiting review"
            count={reviews?.length}
            body="Drafts submitted for a second pair of eyes before they go live."
          />
        )}
        {can('streaks.read') && (
          <Tile
            href="/admin/incidents"
            title="Open incidents"
            count={incidents ? open.length : undefined}
            body="Bulk streak restorations for outages that affected many learners."
          />
        )}
      </div>
      {can('audit.read') && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!recent ? null : recent.page.length === 0 ? (
              <Empty>No admin actions yet.</Empty>
            ) : (
              <ul className="divide-y text-sm">
                {recent.page.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{r.action}</span>{' '}
                      <span className="text-muted-foreground">
                        on {r.targetLabel ?? r.targetId} by {r.actorEmail}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtTime(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/audit" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Open the audit log
            </Link>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function Tile({ href, title, body, count }: { href: string; title: string; body: string; count?: number }) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-background p-5 transition hover:border-primary/50 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">{count}</span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </Link>
  )
}
