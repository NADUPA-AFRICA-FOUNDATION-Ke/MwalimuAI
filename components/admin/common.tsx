'use client'

import { cloneElement, createContext, isValidElement, useCallback, useContext, useId, useState, type ReactElement, type ReactNode } from 'react'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { isNetworkFailure, NETWORK_MESSAGE } from '@/lib/network-error'
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
  if (isNetworkFailure(e)) return NETWORK_MESSAGE
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

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background/60 px-6 py-10 text-center text-sm text-muted-foreground">
      {icon && <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-5 [&_svg]:w-5" aria-hidden="true">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

// ── Layout kit shared by every console page, so they read as one product ──

/** selectClass is full width; keep that on phones but size to content from sm up. */
export const compactSelect = selectClass.replace('w-full', 'w-full sm:w-auto')

const STAT_TONE = {
  default: { box: 'bg-background', icon: 'bg-primary/10 text-primary', value: '' },
  alert: { box: 'border-destructive/40 bg-destructive/5', icon: 'bg-destructive/10 text-destructive', value: 'text-destructive' },
  warn: { box: 'border-amber-300/70 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', value: 'text-amber-700 dark:text-amber-300' },
} as const

/** A headline number with an icon and one line of context. Links when given an href. */
export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'default',
  href,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: keyof typeof STAT_TONE
  href?: string
}) {
  const t = STAT_TONE[tone]
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4 ${t.icon}`} aria-hidden="true">{icon}</span>
        <span className="line-clamp-2 min-w-0 leading-tight sm:line-clamp-1">{label}</span>
      </div>
      <div className={`mt-3 text-2xl font-bold tabular-nums ${t.value}`}>{value}</div>
      {sub && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1">{sub}</div>}
    </>
  )
  const cls = `block rounded-xl border p-4 ${t.box}`
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-primary/50 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return <div className={`mb-6 grid grid-cols-2 gap-3 ${cols === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>{children}</div>
}

/** A card section with an optional header row. Lists and tables sit flush inside it. */
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  const headingId = useId()
  return (
    <section className={`overflow-hidden rounded-xl border bg-background ${className}`} aria-labelledby={title ? headingId : undefined} id={id}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            {title && <h2 id={headingId} className="font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** Search and filter row at the top of a Panel. */
export function Toolbar({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2.5">
      {children}
      {end && <div className="ml-auto text-xs text-muted-foreground" aria-live="polite">{end}</div>}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative min-w-[12rem] flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className="bg-background pl-8" />
    </div>
  )
}

/** One-of-several switch (views or filters), styled as a segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string; count?: number; alert?: boolean }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${value === o.value ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${o.alert && o.count > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-muted-foreground/15'}`}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Simple daily bar chart with guide lines and peak/average labels. */
export function BarChart({ data, label, height = 'h-36' }: { data: { key: string; value: number; title: string }[]; label: string; height?: string }) {
  const peak = Math.max(1, ...data.map((d) => d.value))
  const avg = data.length ? Math.round(data.reduce((n, d) => n + d.value, 0) / data.length) : 0
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>Peak {peak.toLocaleString()} · avg {avg.toLocaleString()}</span>
      </div>
      <div className={`relative border-b border-l ${height}`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed" aria-hidden="true" />
        <div className="flex h-full items-end gap-[2px] px-1" role="img" aria-label={`${label}. Peak ${peak}, average ${avg}.`}>
          {data.map((d) => (
            <div key={d.key} title={d.title} className="flex-1 rounded-t-sm bg-primary/80 transition-colors hover:bg-primary" style={{ height: `${Math.max(1.5, (d.value / peak) * 100)}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.key}</span>
        <span>{data[data.length - 1]?.key}</span>
      </div>
    </div>
  )
}

/** Initials in a circle, for people lists. */
export function Avatar({ name }: { name: string }) {
  // For an email, only the part before @ is a name (grace.wambui@… → GW, not the domain).
  const base = name.includes('@') ? name.split('@')[0] : name
  const initials = base.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
      {initials}
    </span>
  )
}

/** "Load more" footer for paginated lists. */
export function LoadMore({ onClick }: { onClick: () => void }) {
  return (
    <div className="border-t p-3 text-center">
      <Button variant="ghost" size="sm" onClick={onClick}>Load more</Button>
    </div>
  )
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
