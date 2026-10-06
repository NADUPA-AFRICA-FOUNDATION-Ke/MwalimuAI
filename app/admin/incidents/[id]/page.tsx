'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { ChevronLeft, Download } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/admin/csv'
import { Empty, Loading, PageHeader, Pill, ReasonDialog, StatusPill, useRun, useStaff } from '@/components/admin/common'

export default function IncidentPage() {
  const { id } = useParams<{ id: string }>()
  const incidentId = id as Id<'incidents'>
  const { can, role } = useStaff()
  const inc = useQuery(api.admin.incidents.get, { incidentId })
  const targets = usePaginatedQuery(api.admin.incidents.targets, { incidentId }, { initialNumItems: 25 })
  const approve = useMutation(api.admin.incidents.approve)
  const execute = useMutation(api.admin.incidents.execute)
  const cancel = useMutation(api.admin.incidents.cancel)
  const { ok } = useRun()
  const [dialog, setDialog] = useState<null | 'approve' | 'execute' | 'cancel'>(null)

  if (!inc) return <Loading />
  const live = inc.status === 'draft' || inc.status === 'approved'
  const canRun =
    can('streaks.restore_bulk') &&
    live &&
    inc.candidatesReady &&
    (inc.candidateCount ?? 0) > 0 &&
    (!inc.needsApproval || role === 'super_admin')
  const pct = inc.candidateCount ? Math.round((inc.processedCount / inc.candidateCount) * 100) : 0

  const exportCsv = () =>
    downloadCsv(`incident-${incidentId}.csv`, [
      ['name', 'email', 'outcome', 'dates restored', 'note'],
      ...targets.results.map((t) => [
        t.name,
        t.email,
        t.outcome ?? 'pending',
        (t.datesRestored ?? []).join(' '),
        t.note,
      ]),
    ])

  return (
    <>
      <Link
        href="/admin/incidents"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All incidents
      </Link>
      <PageHeader
        title={inc.title}
        description={`${inc.windowStart} → ${inc.windowEnd} (Kenya time)${inc.description ? ` · ${inc.description}` : ''}`}
        actions={<StatusPill status={inc.status} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Box label="Affected users" value={inc.candidatesReady ? String(inc.candidateCount ?? 0) : 'Calculating…'} />
        <Box label="Restored" value={String(inc.restoredCount)} />
        <Box label="Skipped" value={String(inc.skippedCount)} />
        <Box label="Progress" value={inc.status === 'completed' ? '100%' : `${pct}%`} />
      </div>

      {live && (
        <section className="mb-6 space-y-3 rounded-lg border bg-background p-4 text-sm">
          {!inc.candidatesReady && <p role="status">Working out who was affected. This page updates by itself.</p>}
          {inc.candidatesReady && (inc.candidateCount ?? 0) === 0 && (
            <p>Nobody was affected in this window. Nothing to restore.</p>
          )}
          {inc.needsApproval && (
            <p className="rounded-md bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              More than {inc.approvalThreshold} users.{' '}
              {role === 'super_admin'
                ? 'As a Super Admin you can run this directly, or approve it for the creator to run.'
                : 'A Super Admin must approve this before it can run.'}
            </p>
          )}
          {inc.approvedBy && (
            <p>
              Approved by a Super Admin. <Pill tone="green">approved</Pill>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {can('streaks.approve_bulk') && inc.candidatesReady && inc.status === 'draft' && (
              <Button variant="outline" onClick={() => setDialog('approve')}>
                Approve…
              </Button>
            )}
            {canRun && <Button onClick={() => setDialog('execute')}>Restore {inc.candidateCount} users…</Button>}
            {can('streaks.restore_bulk') && (
              <Button variant="ghost" onClick={() => setDialog('cancel')}>
                Cancel incident…
              </Button>
            )}
          </div>
        </section>
      )}
      {inc.status === 'running' && (
        <p role="status" className="mb-4 text-sm">
          Restoring… {inc.processedCount} of {inc.candidateCount} processed. You can leave this page; it keeps running.
        </p>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Affected users</h2>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={targets.results.length === 0}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Export loaded rows
        </Button>
      </div>
      {targets.status === 'LoadingFirstPage' ? (
        <Loading />
      ) : targets.results.length === 0 ? (
        <Empty>{inc.candidatesReady ? 'No affected users.' : 'Collecting…'}</Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3">User</th>
                  <th scope="col" className="p-3">Outcome</th>
                  <th scope="col" className="hidden p-3 sm:table-cell">Dates restored</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {targets.results.map((t) => (
                  <tr key={t._id}>
                    <td className="p-3">
                      <Link className="text-primary hover:underline" href={`/admin/users/${t.profileId}`}>
                        {t.name || t.email || t.profileId}
                      </Link>
                    </td>
                    <td className="p-3">
                      {t.outcome ? (
                        <StatusPill status={t.outcome === 'restored' ? 'completed' : 'draft'} />
                      ) : (
                        <Pill>pending</Pill>
                      )}{' '}
                      <span className="text-xs text-muted-foreground">
                        {t.outcome}
                        {t.note ? ` · ${t.note}` : ''}
                      </span>
                    </td>
                    <td className="hidden p-3 text-xs sm:table-cell">{(t.datesRestored ?? []).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {targets.status === 'CanLoadMore' && (
            <Button variant="outline" className="mt-4" onClick={() => targets.loadMore(25)}>
              Load more
            </Button>
          )}
        </>
      )}

      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        destructive={dialog === 'cancel'}
        title={
          dialog === 'execute'
            ? `Restore ${inc.candidateCount} users`
            : dialog === 'approve'
              ? 'Approve this incident'
              : 'Cancel this incident'
        }
        description={
          dialog === 'execute'
            ? 'Missing days in the window are added to every affected user, each with its own audit entry. This runs in the background.'
            : undefined
        }
        confirmLabel={dialog === 'execute' ? 'Restore now' : dialog === 'approve' ? 'Approve' : 'Cancel incident'}
        onConfirm={async (reason) => {
          const fn =
            dialog === 'execute'
              ? () => execute({ incidentId, reason })
              : dialog === 'approve'
                ? () => approve({ incidentId, reason })
                : () => cancel({ incidentId, reason })
          return ok(fn, 'Done')
        }}
      />
    </>
  )
}

const Box = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-background p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
)
