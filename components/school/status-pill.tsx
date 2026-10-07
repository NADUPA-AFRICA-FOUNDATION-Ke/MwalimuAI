import { STATUS_LABEL, STATUS_TONE } from '@/lib/school'

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? 'bg-muted'}`}>{STATUS_LABEL[status] ?? status}</span>
}
