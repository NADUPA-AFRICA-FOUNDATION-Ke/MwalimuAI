'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Empty, Field, fmtTime, Loading, Pill, ReasonDialog, useRun, useStaff } from '@/components/admin/common'

export function StreakTab({ profileId }: { profileId: Id<'profiles'> }) {
  const { can, role } = useStaff()
  const s = useQuery(api.admin.streaks.get, { profileId })
  const learnerTickets = useQuery(api.admin.tickets.forUser, can('tickets.read') ? { profileId } : 'skip')
  const restore = useMutation(api.admin.streaks.restore)
  const revoke = useMutation(api.admin.streaks.revoke)
  const { run, ok } = useRun()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [ticket, setTicket] = useState('')
  const [override, setOverride] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [revokeId, setRevokeId] = useState<Id<'streakAdjustments'> | null>(null)

  const ready = Boolean(from && to && from <= to)
  const preview = useQuery(
    api.admin.streaks.preview,
    ready ? { profileId, fromDate: from, toDate: to, overrideLookback: override } : 'skip',
  )
  const grid = useMemo(() => {
    if (!s) return []
    const active = new Map(s.days.map((d) => [d.date, d.restored]))
    const out: { date: string; state: 'active' | 'restored' | 'missing' }[] = []
    for (let i = 59; i >= 0; i--) {
      const date = new Date(Date.parse(`${s.today}T00:00:00Z`) - i * 86_400_000).toISOString().slice(0, 10)
      out.push({ date, state: active.has(date) ? (active.get(date) ? 'restored' : 'active') : 'missing' })
    }
    return out
  }, [s])

  if (!s) return <Loading />
  const yesterday = new Date(Date.parse(`${s.today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
  const earliest = new Date(Date.parse(`${s.today}T00:00:00Z`) - (override ? 365 : s.maxLookbackDays) * 86_400_000)
    .toISOString()
    .slice(0, 10)
  const plan = preview?.ok ? preview : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Current streak"
          value={s.streak.current}
          sub={
            s.streakWithoutRestored.current !== s.streak.current
              ? `${s.streakWithoutRestored.current} without restorations`
              : undefined
          }
        />
        <Stat label="Longest" value={s.streak.longest} />
        <Stat label="Active days" value={s.streak.totalDays} />
      </div>

      <section aria-label="Last 60 days">
        <h2 className="mb-2 text-sm font-semibold">Last 60 days (Kenya time)</h2>
        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(30,minmax(0,1fr))]">
          {grid.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.state}`}
              aria-label={`${d.date}: ${d.state}`}
              className={`aspect-square rounded-sm ${d.state === 'active' ? 'bg-emerald-500' : d.state === 'restored' ? 'bg-sky-500' : 'bg-muted'}`}
            />
          ))}
        </div>
        <p className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Active
          </span>
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" />
            Restored by staff
          </span>
          <span>
            <i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-muted" />
            No activity
          </span>
        </p>
      </section>

      {can('streaks.restore') && (
        <section className="rounded-lg border bg-background p-4">
          <h2 className="font-semibold">Restore a broken streak</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Fills days with no activity inside the range. Only past days within {s.maxLookbackDays} days can be
            restored.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="From">
              <Input
                type="date"
                min={earliest}
                max={yesterday}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="To">
              <Input type="date" min={earliest} max={yesterday} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Ticket / reference (optional)">
              <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="MW-4F7K2Q" list="learner-tickets" />
              <datalist id="learner-tickets">
                {learnerTickets?.filter((t) => t.status !== 'resolved').map((t) => (
                  <option key={t._id} value={t.number}>{t.subject}</option>
                ))}
              </datalist>
            </Field>
          </div>
          {role === 'super_admin' && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
              Extend the look-back limit to 365 days (Super Admin)
            </label>
          )}
          {ready && preview && (
            <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm" aria-live="polite">
              {!preview.ok ? (
                preview.error
              ) : preview.datesToRestore.length === 0 ? (
                'Every day in this range already has activity. Nothing to restore.'
              ) : (
                <>
                  Will add <b>{preview.datesToRestore.length}</b> day{preview.datesToRestore.length === 1 ? '' : 's'}.
                  Current streak <b>{preview.before.current}</b> → <b>{preview.after.current}</b> days.
                </>
              )}
            </p>
          )}
          <Button className="mt-4" disabled={!plan || plan.datesToRestore.length === 0} onClick={() => setDialog(true)}>
            Restore streak…
          </Button>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Restoration history</h2>
        {s.adjustments.length === 0 ? (
          <Empty>No restorations for this user.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {s.adjustments.map((a) => (
              <li key={a._id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                <div>
                  <div className="font-medium">
                    {a.dates.length} day{a.dates.length === 1 ? '' : 's'}: {a.dates[0]}
                    {a.dates.length > 1 ? ` … ${a.dates[a.dates.length - 1]}` : ''}{' '}
                    {a.revokedAt && <Pill tone="gray">revoked</Pill>}{' '}
                    {a.incidentId && <Pill tone="blue">incident</Pill>}
                  </div>
                  <div className="text-muted-foreground">
                    {a.reason}
                    {a.ticketRef ? ` · ${a.ticketRef}` : ''} · {fmtTime(a.createdAt)}
                  </div>
                </div>
                {can('streaks.restore') && !a.revokedAt && (
                  <Button size="sm" variant="ghost" onClick={() => setRevokeId(a._id)}>
                    Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReasonDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Restore streak"
        confirmLabel="Restore"
        description={
          plan
            ? `${plan.datesToRestore.length} day(s) from ${from} to ${to} will be added to this user's activity.`
            : undefined
        }
        onConfirm={async (reason) => {
          const r = await run(
            () =>
              restore({
                profileId,
                fromDate: from,
                toDate: to,
                reason,
                ticketRef: ticket || undefined,
                overrideLookback: override || undefined,
              }),
            'Streak restored',
          )
          if (r) {
            setFrom('')
            setTo('')
            setTicket('')
          }
          return r !== undefined
        }}
      />
      <ReasonDialog
        open={revokeId !== null}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title="Undo this restoration?"
        confirmLabel="Undo restoration"
        destructive
        description="Only the days staff added are removed. Real activity is untouched."
        onConfirm={async (reason) => ok(() => revoke({ adjustmentId: revokeId!, reason }), 'Restoration undone')}
      />
    </div>
  )
}

const Stat = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
  <div className="rounded-lg border bg-background p-3 sm:p-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
  </div>
)
