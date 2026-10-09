'use client'

import { useState } from 'react'
import { useConvex, usePaginatedQuery, useQuery } from 'convex/react'
import { ChevronRight, Download, ScrollText, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/admin/csv'
import { Input } from '@/components/ui/input'
import { Avatar, compactSelect, Empty, fmtTime, JsonDiff, LoadMore, Loading, PageHeader, Panel, Toolbar, useStaff } from '@/components/admin/common'

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
        <div
          role="status"
          className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${checkpoint?.status === 'broken' ? 'border-destructive/50 bg-destructive/5' : 'bg-background'}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${checkpoint?.status === 'broken' ? 'bg-destructive/10 text-destructive' : checkpoint ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
            aria-hidden="true"
          >
            {checkpoint?.status === 'broken' ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className={`font-semibold ${checkpoint?.status === 'broken' ? 'text-destructive' : ''}`}>
              {checkpoint === null ? 'Daily integrity check not run yet' : checkpoint.status === 'ok' ? 'Integrity check passed' : 'Integrity check FAILED'}
            </div>
            <p className="text-muted-foreground">
              {checkpoint === null
                ? 'The first one runs overnight.'
                : checkpoint.status === 'ok'
                  ? `${fmtTime(checkpoint.at)}: ${checkpoint.newRows} new entr${checkpoint.newRows === 1 ? 'y' : 'ies'} verified. Fingerprint ${checkpoint.headHash.slice(0, 12)}…, also emailed to Super Admins.`
                  : `${fmtTime(checkpoint.at)}: ${checkpoint.note ?? 'the chain does not match'} Investigate now.`}
            </p>
          </div>
        </div>
      )}
      <Panel>
        <Toolbar end={status === 'LoadingFirstPage' ? undefined : `${results.length}${status === 'CanLoadMore' ? '+' : ''} entries`}>
          <select aria-label="Action" className={compactSelect} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            From
            <Input type="date" aria-label="From date" className="h-9 w-auto bg-background" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            To
            <Input type="date" aria-label="To date" className="h-9 w-auto bg-background" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          {(action || from || to) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAction('')
                setFrom('')
                setTo('')
              }}
            >
              Clear
            </Button>
          )}
        </Toolbar>
        {status === 'LoadingFirstPage' ? (
          <div className="px-4"><Loading /></div>
        ) : results.length === 0 ? (
          <div className="p-4"><Empty icon={<ScrollText />}>No entries match.</Empty></div>
        ) : (
          <>
            <ul className="divide-y text-sm">
              {results.map((r) => (
                <li key={r._id}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                    aria-expanded={open === r._id}
                    onClick={() => setOpen(open === r._id ? null : r._id)}
                  >
                    <Avatar name={r.actorEmail} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        <span className="font-medium">{r.action}</span>
                        <span className="text-muted-foreground"> · {r.targetType}: {r.targetLabel ?? r.targetId}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{r.actorEmail}</span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{fmtTime(r.createdAt)}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === r._id ? 'rotate-90' : ''}`} aria-hidden="true" />
                  </button>
                  {open === r._id && (
                    <div className="space-y-2 bg-muted/20 px-4 py-3 sm:pl-15">
                      <p className="text-xs text-muted-foreground sm:hidden">{fmtTime(r.createdAt)}</p>
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
            {status === 'CanLoadMore' && <LoadMore onClick={() => loadMore(25)} />}
          </>
        )}
      </Panel>
    </>
  )
}
