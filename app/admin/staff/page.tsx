'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Empty,
  Field,
  fmtTime,
  Loading,
  PageHeader,
  Pill,
  ReasonDialog,
  ROLE_LABELS,
  selectClass,
  StatusPill,
  useRun,
  useStaff,
} from '@/components/admin/common'

type Role = 'super_admin' | 'content_manager' | 'support_agent' | 'viewer'
const ROLE_HELP: Record<Role, string> = {
  super_admin: 'Everything, including staff and certificates.',
  content_manager: 'Create, review and publish content.',
  support_agent: 'Restore streaks, edit profiles, suspend accounts.',
  viewer: 'Read-only, including the full audit log.',
}

export default function StaffPage() {
  const { email: me } = useStaff()
  const staff = useQuery(api.admin.staff.list, {})
  const invite = useMutation(api.admin.staff.invite)
  const setRole = useMutation(api.admin.staff.setRole)
  const setStatus = useMutation(api.admin.staff.setStatus)
  const resetMfa = useMutation(api.admin.staff.resetMfa)
  const resendInvite = useMutation(api.admin.staff.resendInvite)
  const { run } = useRun()
  const [now] = useState(() => Date.now())
  const [form, setForm] = useState({ email: '', name: '', role: 'support_agent' as Role })
  const [act, setAct] = useState<
    | null
    | { kind: 'invite' }
    | { kind: 'role'; id: Id<'staff'>; role: Role; email: string }
    | { kind: 'status'; id: Id<'staff'>; status: 'active' | 'disabled'; email: string }
    | { kind: 'mfa'; id: Id<'staff'>; email: string }
    | { kind: 'resend'; id: Id<'staff'>; email: string }
  >(null)

  return (
    <>
      <PageHeader
        title="Staff"
        description="Everyone with access to this console. They sign in with the invited email address and must set up two-factor on first use."
      />
      <section className="mb-8 rounded-lg border bg-background p-4">
        <h2 className="mb-3 font-semibold">Invite someone</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Name (optional)">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Role" hint={ROLE_HELP[form.role]}>
            <select
              className={selectClass}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button className="mt-3" disabled={!form.email.includes('@')} onClick={() => setAct({ kind: 'invite' })}>
          Invite…
        </Button>
      </section>
      {!staff ? (
        <Loading />
      ) : staff.length === 0 ? (
        <Empty>No staff yet.</Empty>
      ) : (
        <ul className="divide-y rounded-lg border bg-background text-sm">
          {staff.map((s) => (
            <li key={s._id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <div className="font-medium">
                  {s.name || s.email} {s.email === me && <Pill tone="blue">you</Pill>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.email} · {s.mfaEnrolledAt ? `2FA since ${fmtTime(s.mfaEnrolledAt)}` : s.inviteExpiresAt && s.inviteExpiresAt < now ? 'Invitation expired: resend it' : s.inviteExpiresAt ? `Invited, not signed in yet. Expires ${fmtTime(s.inviteExpiresAt)}` : '2FA not set up yet'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={s.status} />
                <select
                  aria-label={`Role for ${s.email}`}
                  className={`${selectClass} w-auto`}
                  value={s.role}
                  disabled={s.email === me}
                  onChange={(e) => setAct({ kind: 'role', id: s._id, role: e.target.value as Role, email: s.email })}
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                {s.email !== me && (
                  <>
                    {s.mfaEnrolledAt === undefined && s.invitedAt !== undefined && (
                      <Button size="sm" variant="outline" onClick={() => setAct({ kind: 'resend', id: s._id, email: s.email })}>
                        Resend invite
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAct({ kind: 'mfa', id: s._id, email: s.email })}
                    >
                      Reset 2FA
                    </Button>
                    <Button
                      size="sm"
                      variant={s.status === 'active' ? 'destructive' : 'outline'}
                      onClick={() =>
                        setAct({
                          kind: 'status',
                          id: s._id,
                          status: s.status === 'active' ? 'disabled' : 'active',
                          email: s.email,
                        })
                      }
                    >
                      {s.status === 'active' ? 'Disable' : 'Enable'}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog
        open={act !== null}
        onOpenChange={(o) => !o && setAct(null)}
        destructive={act?.kind === 'status' && act.status === 'disabled'}
        title={
          !act
            ? ''
            : act.kind === 'invite'
              ? `Invite ${form.email}`
              : act.kind === 'role'
                ? `Change ${act.email} to ${ROLE_LABELS[act.role]}`
                : act.kind === 'status'
                  ? `${act.status === 'disabled' ? 'Disable' : 'Enable'} ${act.email}`
                  : act.kind === 'resend'
                    ? `Resend the invitation to ${act.email}`
                    : `Reset two-factor for ${act.email}`
        }
        description={
          act?.kind === 'mfa'
            ? 'They are signed out of the console and must enrol an authenticator again.'
            : act?.kind === 'status' && act.status === 'disabled'
              ? 'They lose access immediately.'
              : undefined
        }
        onConfirm={async (reason) => {
          if (!act) return false
          const fn =
            act.kind === 'invite'
              ? () => invite({ email: form.email, name: form.name || undefined, role: form.role, reason })
              : act.kind === 'role'
                ? () => setRole({ staffId: act.id, role: act.role, reason })
                : act.kind === 'status'
                  ? () => setStatus({ staffId: act.id, status: act.status, reason })
                  : act.kind === 'resend'
                    ? () => resendInvite({ staffId: act.id, reason })
                    : () => resetMfa({ staffId: act.id, reason })
          const r = await run(fn, 'Done')
          if (r !== undefined && act.kind === 'invite') setForm({ email: '', name: '', role: 'support_agent' })
          return r !== undefined
        }}
      />
    </>
  )
}
