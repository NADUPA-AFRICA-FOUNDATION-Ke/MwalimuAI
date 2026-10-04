export const TICKET_CATEGORIES = [
  { value: 'streak', label: 'My streak is wrong' },
  { value: 'account', label: 'Account or sign-in' },
  { value: 'content', label: 'A lesson or content problem' },
  { value: 'payment', label: 'Payment or plan' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'other', label: 'Something else' },
] as const

export type TicketStatus = 'open' | 'pending_user' | 'resolved'

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Waiting for support',
  pending_user: 'Support replied',
  resolved: 'Resolved',
}

/** Plain-language message from a Convex error, never a stack trace or raw server text. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as { data?: unknown })?.data
  if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
    return (data as { message: string }).message
  }
  return fallback
}
