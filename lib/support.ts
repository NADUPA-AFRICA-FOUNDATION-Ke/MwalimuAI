export const TICKET_CATEGORIES = [
  { value: 'streak', label: 'My streak is wrong' },
  { value: 'account', label: 'Account or sign-in' },
  { value: 'content', label: 'A lesson or content problem' },
  { value: 'payment', label: 'Payment or plan' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'technical', label: 'Something is not working' },
  { value: 'feedback', label: 'Feedback or a suggestion' },
  { value: 'other', label: 'Something else' },
] as const

export type TicketStatus = 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'

/** What each status means to the person who raised the ticket. */
export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open: waiting for support',
  in_progress: 'In progress',
  pending_user: 'Waiting on you',
  resolved: 'Resolved',
  closed: 'Closed',
}
export const STATUS_TONE: Record<TicketStatus, 'amber' | 'blue' | 'green' | 'gray'> = {
  open: 'amber', in_progress: 'blue', pending_user: 'blue', resolved: 'green', closed: 'gray',
}
export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' }

export const MAX_ATTACHMENTS = 3
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

/** Plain-language message from a Convex error, never a stack trace or raw server text. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (error as { data?: unknown })?.data
  if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
    return (data as { message: string }).message
  }
  return fallback
}
