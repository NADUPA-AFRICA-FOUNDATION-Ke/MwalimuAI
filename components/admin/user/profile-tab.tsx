'use client'

import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import type { UserData } from './types'
import { Lock } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, JsonDiff, ReasonDialog, selectClass, useRun, useStaff } from '@/components/admin/common'
import { COUNTIES } from '@/convex/lib/taxonomy'

export function ProfileTab({ profileId, profile }: { profileId: Id<'profiles'>; profile: UserData['profile'] }) {
  const { can } = useStaff()
  const update = useMutation(api.admin.users.updateProfile)
  const { ok } = useRun()
  const initial = useMemo(
    () => ({
      name: profile.name ?? '',
      school: profile.school ?? '',
      county: profile.county ?? '',
      phone: profile.phone ?? '',
      lang: profile.lang,
      cbcLevel: profile.cbcLevel,
      subjects: profile.subjects.join(', '),
      grades: profile.grades.join(', '),
    }),
    [profile],
  )
  const [f, setF] = useState(initial)
  const [dialog, setDialog] = useState(false)
  const editable = can('profiles.edit')
  const list = (x: string) =>
    x
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  const changes = {
    ...(f.name !== initial.name ? { name: f.name } : {}),
    ...(f.school !== initial.school ? { school: f.school } : {}),
    ...(f.county !== initial.county ? { county: f.county } : {}),
    ...(f.phone !== initial.phone ? { phone: f.phone } : {}),
    ...(f.lang !== initial.lang ? { lang: f.lang } : {}),
    ...(f.cbcLevel !== initial.cbcLevel ? { cbcLevel: f.cbcLevel } : {}),
    ...(f.subjects !== initial.subjects ? { subjects: list(f.subjects) } : {}),
    ...(f.grades !== initial.grades ? { grades: list(f.grades) } : {}),
  }
  const dirty = Object.keys(changes).length > 0
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <form
        className="space-y-4 rounded-lg border bg-background p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty) setDialog(true)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={f.name} onChange={set('name')} disabled={!editable} />
          </Field>
          <Field label="Phone" hint="Kenyan numbers like 0712 345 678 are stored as +254712345678.">
            <Input value={f.phone} onChange={set('phone')} disabled={!editable} inputMode="tel" />
          </Field>
          <Field label="School">
            <Input value={f.school} onChange={set('school')} disabled={!editable} />
          </Field>
          <Field label="County">
            <Input list="counties" value={f.county} onChange={set('county')} disabled={!editable} />
            <datalist id="counties">
              {COUNTIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Language">
            <select className={selectClass} value={f.lang} onChange={set('lang')} disabled={!editable}>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </Field>
          <Field label="Teaching experience">
            <select className={selectClass} value={f.cbcLevel} onChange={set('cbcLevel')} disabled={!editable}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Subjects" hint="Comma separated">
            <Input value={f.subjects} onChange={set('subjects')} disabled={!editable} />
          </Field>
          <Field label="Grades" hint="Comma separated">
            <Input value={f.grades} onChange={set('grades')} disabled={!editable} />
          </Field>
        </div>
        {editable ? (
          <Button type="submit" disabled={!dirty}>
            Save changes…
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Your role can view profiles but not edit them.</p>
        )}
      </form>
      <aside className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Lock className="h-4 w-4" />
          Locked fields
        </h2>
        <p className="text-muted-foreground">These can&apos;t be edited here, by design.</p>
        <dl className="space-y-2">
          <div>
            <dt className="text-xs text-muted-foreground">Email / sign-in identity</dt>
            <dd className="break-all">{profile.email ?? '—'}</dd>
            <dd className="text-xs text-muted-foreground">Changing it would hand the account to someone else.</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Password</dt>
            <dd className="text-xs text-muted-foreground">Use “Send password reset link” on the Security tab.</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Certificates</dt>
            <dd className="text-xs text-muted-foreground">Use reissue or revoke on the Learning tab.</dd>
          </div>
        </dl>
      </aside>
      <ReasonDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Save profile changes"
        confirmLabel="Save"
        description={
          <JsonDiff
            before={Object.fromEntries(Object.keys(changes).map((k) => [k, (initial as Record<string, unknown>)[k]]))}
            after={changes}
          />
        }
        onConfirm={async (reason) => ok(() => update({ profileId, ...changes, reason }), 'Profile updated')}
      />
    </div>
  )
}
