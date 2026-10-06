'use client'

import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BACKUP_CODES_KEY } from './auth-gate'
import { errorMessage, useStaff } from './common'

function CodesDialog({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false)
  const text = `Mwalimu AI staff console backup codes\nEach works once, if you lose your authenticator.\n\n${codes.join('\n')}\n`
  return (
    <Dialog open onOpenChange={() => { /* must be acknowledged */ }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Save your backup codes</DialogTitle>
          <DialogDescription>If you lose your phone, each of these signs you in once. We show them only now. Keep them somewhere safe, away from your password.</DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted p-3 font-mono text-sm" aria-label="Backup codes">
          {codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(text).then(() => toast.success('Copied'))}><Copy className="mr-2 h-4 w-4" />Copy</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = 'mwalimu-backup-codes.txt'; a.click(); URL.revokeObjectURL(a.href) }}><Download className="mr-2 h-4 w-4" />Download</Button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I have saved these codes</label>
        <DialogFooter><Button disabled={!saved} onClick={onDone}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Shows the codes created at enrolment once, and lets staff make a new set from the sidebar. */
export function BackupCodes() {
  const { backupCodesLeft } = useStaff()
  const regenerate = useMutation(api.admin.mfa.regenerateBackupCodes)
  const [codes, setCodes] = useState<string[] | null>(null)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BACKUP_CODES_KEY)
      if (raw) setCodes(JSON.parse(raw) as string[])
    } catch { /* ignore */ }
  }, [])
  const done = () => { try { sessionStorage.removeItem(BACKUP_CODES_KEY) } catch { /* ignore */ } setCodes(null) }
  return (
    <>
      <Button variant="ghost" size="sm" className="w-full justify-start px-1 text-xs" onClick={async () => {
        if (!window.confirm('Make new backup codes? The old ones stop working.')) return
        try { setCodes((await regenerate({})).backupCodes) } catch (e) { toast.error(errorMessage(e)) }
      }}>
        Backup codes{typeof backupCodesLeft === 'number' ? `: ${backupCodesLeft} left` : ''} · get new
      </Button>
      {codes && <CodesDialog codes={codes} onDone={done} />}
    </>
  )
}
