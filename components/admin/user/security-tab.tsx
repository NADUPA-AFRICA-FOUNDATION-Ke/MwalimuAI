'use client'

import { useState } from 'react'
import { useAction } from 'convex/react'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { errorMessage, ReasonDialog, useStaff } from '@/components/admin/common'

export function SecurityTab({ profileId }: { profileId: Id<'profiles'>; email?: string }) {
  const { can } = useStaff()
  const issue = useAction(api.admin.users.issueTemporaryPassword)
  const [dialog, setDialog] = useState(false)
  const [issued, setIssued] = useState<{ password: string; email: string } | null>(null)

  return (
    <div className="max-w-xl space-y-4 rounded-lg border bg-background p-4 text-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4" />
        Locked out: temporary password
      </h2>
      <p className="text-muted-foreground">
        No email is sent. This sets a one-time password, ends every session the person has, and shows you the password once. Give it to them through their ticket or conversation, and tell them to change it in Settings after signing in. Accounts that sign in with Google have no password to replace.
      </p>
      {can('auth.send_reset_link') ? (
        <Button onClick={() => setDialog(true)}>Issue a temporary password…</Button>
      ) : (
        <p className="text-muted-foreground">Your role can&apos;t issue temporary passwords.</p>
      )}
      {issued && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium">Temporary password for {issued.email}</p>
          <p className="my-2 select-all font-mono text-lg tracking-wide">{issued.password}</p>
          <p className="text-xs text-muted-foreground">Shown only now. It is not stored anywhere you can look it up again.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(issued.password).then(() => toast.success('Copied'))}>Copy</Button>
            <Button size="sm" variant="ghost" onClick={() => setIssued(null)}>Hide</Button>
          </div>
        </div>
      )}
      <ReasonDialog
        open={dialog}
        onOpenChange={setDialog}
        title="Issue a temporary password"
        confirmLabel="Issue password"
        description="The person's current password stops working immediately and they are signed out everywhere."
        onConfirm={async (reason) => {
          try {
            setIssued(await issue({ profileId, reason }))
            return true
          } catch (e) {
            toast.error(errorMessage(e))
            return false
          }
        }}
      />
    </div>
  )
}
