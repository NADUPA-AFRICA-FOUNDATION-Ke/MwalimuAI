'use client'

import { useEffect, useState } from 'react'
import { CloudOff, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Program } from '@/lib/learning-paths-data'
import { getOffline, removeOffline, saveOffline, warmOfflineReader, type OfflineProgram } from '@/lib/offline-lessons'

const size = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`)

/** Saves a program's lessons on the phone so they can be read with no connection. */
export function OfflineDownload({ program }: { program: Program }) {
  const [saved, setSaved] = useState<OfflineProgram | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => { getOffline(program.id).then((p) => setSaved(p ?? null)).catch(() => setSaved(null)) }, [program.id])
  if (saved === undefined) return null
  const toggle = async () => {
    setBusy(true)
    try {
      if (saved) { await removeOffline(program.id); setSaved(null); toast.success('Removed from this device') }
      else {
        await saveOffline(program)
        setSaved((await getOffline(program.id)) ?? null)
        warmOfflineReader()
        toast.success('Saved. You can read these lessons without a connection.')
      }
    } catch {
      toast.error('Could not save on this device. Free up some space and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="min-h-11 rounded-xl gap-2" onClick={toggle} disabled={busy} aria-pressed={Boolean(saved)}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="w-4 h-4" aria-hidden="true" /> : <CloudOff className="w-4 h-4" aria-hidden="true" />}
        {saved ? 'Saved for offline' : 'Save for offline'}
      </Button>
      {saved && <span className="text-xs text-muted-foreground">{size(saved.bytes)} · tap again to remove</span>}
    </div>
  )
}
