'use client'

import { useState } from 'react'
import { useConvex, usePaginatedQuery, useQuery } from 'convex/react'
import { ShieldCheck, Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/admin/csv'
import { Input } from '@/components/ui/input'
import { Empty, Field, fmtTime, JsonDiff, Loading, PageHeader, selectClass, useStaff } from '@/components/admin/common'

const ACTIONS = [
  'streak.restore',
  'streak.revoke_restore',
  'profile.update',
  'account.set_status',
  'auth.send_reset_link',
  'certificate.reissue',
  'certificate.revoke',
  'certificate.reinstate',
  'content.create',
  'content.edit',
  'content.submit_review',
  'content.approve',
  'content.reject',
  'content.publish',
  'content.archive',
  'content.unarchive',
  'content.import_static',
  'incident.create',
  'incident.approve',
  'incident.execute',
  'incident.complete',
  'incident.cancel',
  'staff.invite',
  'staff.set_role',
  'staff.set_status',
  'staff.reset_mfa',
  'staff.login',
  'staff.mfa_enrolled',
]

export default function AuditPage() {
  const { can } = useStaff()
  const convex = useConvex()
  const checkpoint = useQuery(api.admin.audit.lastCheckpoint, can('audit.read_all') ? {} : 'skip')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const args = {
    ...(action ? { action } : {}),
    ...(from ? { from: Date.parse(`${from}T00:00:00+03:00`) } : {}),
    ...(to ? { to: Date.parse(`${to}T00:00:00+03:00`) + 86_400_000 } : {}),
  }
  const { results, status, loadMore } = usePaginatedQuery(api.admin.audit.list, args, { initialNumItems: 25 })

  const verify = async () => {
    let cursor: string | null = null,
      prev: string | undefined,
      checked = 0
    for (;;) {
      const r: Awaited<ReturnType<typeof convex.query<typeof api.admin.audit.verifyChain>>> = await convex.query(
        api.admin.audit.verifyChain,
        { paginationOpts: { numItems: 300, cursor }, expectedPrevHash: prev },
      )
      if (!r.ok) {
        toast.error('The audit log failed verification. A record was altered or removed. Escalate to a Super Admin.')
        return
      }
      checked += r.checked
      prev = r.lastHash
      cursor = r.continueCursor
      if (r.isDone) break
    }
    toast.success(`Audit log verified: ${checked} entries form an unbroken chain.`)
  }

  const exportCsv = async () => {
    const rows: (string | undefined)[][] = [
      ['time (EAT)', 'actor', 'role', 'action', 'target', 'reason', 'before', 'after'],
    ]
    let cursor: string | null = null
    for (let page = 0; page < 40; page++) {
      const r: Awaited<ReturnType<typeof convex.query<typeof api.admin.audit.list>>> = await convex.query(
        api.admin.audit.list,
        { ...args, paginationOpts: { numItems: 200, cursor } },
      )
      for (const e of r.page)
        rows.push([
          fmtTime(e.createdAt),
          e.actorEmail,
          e.actorRole,
          e.action,
          `${e.targetType}:${e.targetLabel ?? e.targetId}`,
          e.reason,
          JSON.stringify(e.before ?? ''),
          JSON.stringify(e.after ?? ''),
        ])
      if (r.isDone) break
      cursor = r.continueCursor
    }
    downloadCsv('audit-log.csv', rows)
  }

  return (
    <>
      <PageHeader
        title="Audit log"
        description={
          can('audit.read_all')
            ? 'Every admin action: who, what, which record, before and after, why and when. Entries are append-only and hash-chained.'
            : 'Your own admin actions. Viewers and Super Admins can see everyone’s.'
        }
        actions={
          <>
            {can('audit.read_all') && (
              <Button variant="outline" size="sm" onClick={verify}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify integrity
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </>
        }
      />
      {checkpoint !== undefined && (
        <p role="status" className={`mb-4 rounded-md border p-3 text-sm ${checkpoint?.status === 'broken' ? 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' : 'bg-muted/40'}`}>
          {checkpoint === null
            ? 'No daily integrity check has run yet. The first one runs overnight.'
            : checkpoint.status === 'ok'
              ? `Integrity check passed ${fmtTime(checkpoint.at)}: ${checkpoint.newRows} new entr${checkpoint.newRows === 1 ? 'y' : 'ies'} verified. Fingerprint ${checkpoint.headHash.slice(0, 12)}…, also emailed to Super Admins.`
              : `Integrity check FAILED ${fmtTime(checkpoint.at)}: ${checkpoint.note ?? 'the chain does not match'} Investigate now.`}
        </p>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Field label="Action">
          <select className={selectClass} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      {status === 'LoadingFirstPage' ? (
        <Loading />
      ) : results.length === 0 ? (
        <Empty>No entries match.</Empty>
      ) : (
        <>
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {results.map((r) => (
              <li key={r._id} className="p-3">
                <button
                  className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
                  aria-expanded={open === r._id}
                  onClick={() => setOpen(open === r._id ? null : r._id)}
                >
                  <span>
                    <span className="font-medium">{r.action}</span>{' '}
                    <span className="text-muted-foreground">
                      · {r.targetType}: {r.targetLabel ?? r.targetId}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fmtTime(r.createdAt)} · {r.actorEmail}
                  </span>
                </button>
                {open === r._id && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {r.reason && (
                      <p>
                        <span className="text-muted-foreground">Reason:</span> {r.reason}
                      </p>
                    )}
                    <JsonDiff before={r.before} after={r.after} />
                    <p className="font-mono text-[10px] text-muted-foreground">
                      hash {r.hash.slice(0, 16)}… ← {r.prevHash.slice(0, 16)}…
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {status === 'CanLoadMore' && (
            <Button variant="outline" className="mt-4" onClick={() => loadMore(25)}>
              Load more
            </Button>
          )}
        </>
      )}
    </>
  )
}
