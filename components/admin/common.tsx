'use client'

import { cloneElement, createContext, isValidElement, useCallback, useContext, useId, useState, type ReactElement, type ReactNode } from 'react'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type StaffInfo = { email: string; name?: string; role: string; permissions: string[]; backupCodesLeft?: number }
const StaffContext = createContext<StaffInfo>({ email: '', role: '', permissions: [] })
export const StaffProvider = ({ staff, children }: { staff: StaffInfo; children: ReactNode }) => (
  <StaffContext.Provider value={staff}>{children}</StaffContext.Provider>
)
export const useStaff = () => {
  const s = useContext(StaffContext)
  return { ...s, can: (permission: string) => s.permissions.includes(permission) }
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_manager: 'Content Manager',
  support_agent: 'Support Agent',
  viewer: 'Viewer',
}

export function errorMessage(e: unknown): string {
  if (e instanceof ConvexError) {
    const d = e.data as { message?: string } | string
    return typeof d === 'string' ? d : (d?.message ?? 'Something went wrong')
  }
  const msg = e instanceof Error ? e.message : ''
  // Argument validation failures from Convex carry long internal text; keep it readable.
  if (/ArgumentValidationError|Validator error/.test(msg))
    return 'Some fields are not valid. Please check them and try again.'
  if (/FORBIDDEN/.test(msg)) return 'You do not have permission to do that.'
  return 'Something went wrong. Please try again.'
}

/** Runs a mutation, toasting success or a readable error. Returns the result, or undefined on failure. */
export function useRun() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
    setBusy(true)
    try {
      const result = await fn()
      if (success) toast.success(success)
      return result
    } catch (e) {
      toast.error(errorMessage(e))
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])
  /** Same as `run`, but answers "did it work?" — what a ReasonDialog's onConfirm needs. */
  const ok = useCallback(
    async (fn: () => Promise<unknown>, success?: string) => (await run(fn, success)) !== undefined,
    [run],
  )
  return { run, ok, busy }
}

const MIN_REASON = 10

/** Every state-changing admin action asks for a reason, which is stored in the audit log. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: (reason: string) => Promise<boolean | void>
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = reason.trim().length >= MIN_REASON
  const submit = async () => {
    setBusy(true)
    try {
      const done = await onConfirm(reason.trim())
      if (done !== false) {
        setReason('')
        onOpenChange(false)
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (recorded in the audit log)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Verified support ticket SUP-1042: app outage on 12 Sep"
          />
          <p className="text-xs text-muted-foreground">
            {ok ? 'Looks good.' : `At least ${MIN_REASON} characters (${reason.trim().length}/${MIN_REASON}).`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={submit} disabled={!ok || busy}>
            {busy && <Spinner className="mr-2 h-4 w-4" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const TONES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  gray: 'bg-muted text-muted-foreground',
}
export const Pill = ({ tone = 'gray', children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
    {children}
  </span>
)

const STATUS_TONE: Record<string, string> = {
  active: 'green',
  published: 'green',
  completed: 'green',
  approved: 'blue',
  running: 'blue',
  in_review: 'amber',
  pending_approval: 'amber',
  draft: 'gray',
  superseded: 'gray',
  cancelled: 'gray',
  suspended: 'amber',
  deactivated: 'red',
  rejected: 'red',
  disabled: 'red',
}
export const StatusPill = ({ status }: { status: string }) => (
  <Pill tone={STATUS_TONE[status] ?? 'gray'}>{status.replace(/_/g, ' ')}</Pill>
)

export const fmtTime = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
    : '—'

/**
 * A labelled form control. The label is tied to the control (so screen readers announce it and clicking the label
 * focuses the field), and the hint is read out with it. A control wrapped in other markup gets a labelled group.
 */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const uid = useId()
  const labelId = `${uid}-label`
  const hintId = `${uid}-hint`
  const direct = isValidElement(children) && (typeof children.type !== 'string' || ['input', 'select', 'textarea'].includes(children.type))
  const control = direct
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children as ReactElement<{ id?: string }>).props.id ?? uid,
        ...(hint ? { 'aria-describedby': hintId } : {}),
      })
    : null
  return (
    <div className="space-y-1.5">
      <Label id={labelId} htmlFor={control ? ((children as ReactElement<{ id?: string }>).props.id ?? uid) : undefined}>{label}</Label>
      {control ?? (
        <div role="group" aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined}>
          {children}
        </div>
      )}
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
      <Spinner className="h-4 w-4" /> Loading…
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>
}

export function JsonDiff({ before, after }: { before?: unknown; after?: unknown }) {
  const b = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>
  const a = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])]
  if (keys.length === 0) return <span className="text-muted-foreground">—</span>
  const show = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v))
  return (
    <dl className="space-y-1 text-xs">
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[7rem_1fr] gap-2">
          <dt className="truncate font-medium text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">
            {k in b && (
              <span className="mr-2 rounded bg-red-50 px-1 text-red-800 line-through dark:bg-red-950 dark:text-red-200">
                {show(b[k]).slice(0, 300)}
              </span>
            )}
            {k in a && (
              <span className="rounded bg-emerald-50 px-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {show(a[k]).slice(0, 300)}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
