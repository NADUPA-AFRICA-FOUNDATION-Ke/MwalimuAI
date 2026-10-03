/**
 * Turns a failed checkout into something a teacher can act on: what happened, whether money moved,
 * and the one thing to do next. Server detail stays in the server log.
 */
export type PaymentFailureAction = 'signin' | 'retry' | 'support'

export interface PaymentFailure {
  tone: 'error' | 'info'
  title: string
  message: string
  action: PaymentFailureAction
}

export function describePaymentFailure(input: { status?: number; code?: string; offline?: boolean; canceled?: boolean }): PaymentFailure {
  const { status, code, offline, canceled } = input
  if (canceled) {
    return { tone: 'info', title: 'Checkout was cancelled', message: 'You were not charged. Pick a plan again whenever you are ready.', action: 'retry' }
  }
  if (offline) {
    return { tone: 'error', title: 'You are offline', message: 'We could not reach the payment page. Check your connection and try again. You have not been charged.', action: 'retry' }
  }
  if (code === 'unauthenticated' || status === 401) {
    return { tone: 'error', title: 'Please sign in first', message: 'Your plan is attached to your account, so you need to be signed in to pay. Sign in, then choose your plan again.', action: 'signin' }
  }
  if (code === 'rate_limited' || status === 429) {
    return { tone: 'error', title: 'Too many attempts', message: 'Please wait a few minutes before trying again. You have not been charged.', action: 'retry' }
  }
  if (code === 'payments_unavailable' || status === 503) {
    return { tone: 'error', title: 'Online payment is unavailable right now', message: 'This is on our side, not yours. You have not been charged. Try again later, or contact support and we will help you upgrade.', action: 'support' }
  }
  return { tone: 'error', title: 'We could not start checkout', message: 'Something went wrong before the payment page opened. You have not been charged. Try again, and contact support if it keeps happening.', action: 'retry' }
}
