'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import type { UserData } from './types'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Empty, Field, fmtTime, Pill, ReasonDialog, useRun, useStaff } from '@/components/admin/common'

export function LearningTab({ data }: { data: UserData }) {
  const { can } = useStaff()
  const revoke = useMutation(api.admin.certificates.revoke)
  const reinstate = useMutation(api.admin.certificates.reinstate)
  const reissue = useMutation(api.admin.certificates.reissue)
  const { ok } = useRun()
  const [act, setAct] = useState<null | {
    kind: 'revoke' | 'reinstate' | 'reissue'
    id: Id<'certificates'>
    name: string
  }>(null)
  const [newName, setNewName] = useState('')
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Programs</h2>
        {data.progress.length === 0 ? (
          <Empty>No program progress yet.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {data.progress.map((p) => (
              <li key={p.programId} className="flex flex-wrap justify-between gap-2 p-3">
                <span className="font-medium">{p.programId}</span>
                <span className="text-muted-foreground">
                  {p.lessonsCompleted} lessons · post-test {p.postScore ?? '—'}{' '}
                  {p.certificateSerial && <Pill tone="green">{p.certificateSerial}</Pill>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Certificates</h2>
        {data.certificates.length === 0 ? (
          <Empty>No certificates issued.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border bg-background text-sm">
            {data.certificates.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-medium">
                    {c.programTitle} {c.revokedAt ? <Pill tone="red">revoked</Pill> : <Pill tone="green">valid</Pill>}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {c.serial} · {fmtTime(c.earnedAt)}
                    {c.revocationReason ? ` · ${c.revocationReason}` : ''}
                  </div>
                </div>
                {can('certificates.manage') && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewName('')
                        setAct({ kind: 'reissue', id: c._id, name: c.serial })
                      }}
                    >
                      Reissue
                    </Button>
                    {c.revokedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAct({ kind: 'reinstate', id: c._id, name: c.serial })}
                      >
                        Reinstate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setAct({ kind: 'revoke', id: c._id, name: c.serial })}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReasonDialog
        open={act !== null}
        onOpenChange={(o) => !o && setAct(null)}
        destructive={act?.kind === 'revoke'}
        title={act ? `${act.kind[0].toUpperCase()}${act.kind.slice(1)} certificate ${act.name}` : ''}
        confirmLabel="Confirm"
        description={
          act?.kind === 'reissue' ? (
            <div className="space-y-2">
              <p>Issues a replacement with a new serial and revokes the old one. Use this to fix a misspelt name.</p>
              <Field label="Corrected name (optional)">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </Field>
            </div>
          ) : undefined
        }
        onConfirm={async (reason) => {
          if (!act) return false
          const fn =
            act.kind === 'revoke'
              ? () => revoke({ certificateId: act.id, reason })
              : act.kind === 'reinstate'
                ? () => reinstate({ certificateId: act.id, reason })
                : () => reissue({ certificateId: act.id, reason, teacherName: newName.trim() || undefined })
          return ok(fn, 'Done')
        }}
      />
    </div>
  )
}
