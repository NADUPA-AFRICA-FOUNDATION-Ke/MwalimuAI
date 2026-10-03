'use client'

import { useState } from 'react'
import { useAction } from 'convex/react'
import { KeyRound } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ReasonDialog, useRun, useStaff } from '@/components/admin/common'

export function SecurityTab({ profileId, email }: { profileId: Id<'profiles'>; email?: string }) {
  const { can } = useStaff()
  const send = useAction(api.admin.users.sendResetLink)
  const { ok } = useRun()
  const [dialog, setDialog] = useState(false)
  return (
    <div className="max-w-xl space-y-4 rounded-lg border bg-background p-4 text-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4" />
        Password reset
      </h2>
      <p className="text-muted-foreground">
        Staff never see or set passwords. This emails {email ?? 'the user'} a single-use link that expires in 30
        minutes.
      </p>
      {can('auth.send_reset_link') ? (
        <Button disabled={!email} onClick={() => setDialog(true)}>
          Send password reset link…
        </Button>
      ) : (
        <p className="text-muted-foreground">Your role can&apos;t send reset links.</p>
      )}
      <ReasonDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Send password reset link"
        confirmLabel="Send link"
        onConfirm={async (reason) => ok(() => send({ profileId, reason }), 'Reset link sent')}
      />
    </div>
  )
}
