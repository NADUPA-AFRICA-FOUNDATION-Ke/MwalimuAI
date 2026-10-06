/**
 * The paid plans: one definition for what the pricing page shows and what Stripe charges, so they cannot disagree.
 * Prices are whole Kenya shillings; Stripe takes the smallest unit (senti), see `amountInSenti`.
 */
export const PAID_PLANS = {
  professional: { checkoutName: 'Mwalimu AI Professional', name: 'Professional', kes: 500, interval: 'month' as const },
  school: { checkoutName: 'Mwalimu AI School', name: 'School', kes: 3000, interval: 'month' as const },
}
export type PaidPlanId = keyof typeof PAID_PLANS

export const amountInSenti = (id: PaidPlanId) => PAID_PLANS[id].kes * 100
export const formatKes = (kes: number) => `KES ${kes.toLocaleString('en-KE')}`
