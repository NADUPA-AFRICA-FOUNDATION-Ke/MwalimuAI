'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, Trash2, RotateCcw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useProfile } from '@/context/profile-context'
import { loadToolHistory, deleteToolOutput, type ToolOutput } from '@/lib/tool-history'

interface Props {
  toolId:    string
  /** Bumped by the parent after a new save so the panel re-fetches. */
  refreshKey?: number
  /** Restore a past entry into the parent's form + output state. */
  onRestore: (entry: ToolOutput) => void
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000)         return 'just now'
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)    return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString()
}

export function ToolHistoryPanel({ toolId, refreshKey = 0, onRestore }: Props) {
  const { user, syncReady } = useProfile()
  const [items, setItems]     = useState<ToolOutput[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setItems(await loadToolHistory(user.id, toolId))
    setLoading(false)
  }, [user, toolId])

  useEffect(() => {
    if (!user || !syncReady) return
    load()
  }, [user, syncReady, refreshKey, load])

  const handleDelete = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteToolOutput(id)
  }

  if (!user) return null
  if (items.length === 0 && !loading) return null

  return (
    <div className="glass rounded-2xl p-5 mt-6">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <History className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Your History</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && items.map(entry => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.title || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatTime(entry.createdAt)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onRestore(entry)}
                  className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
