/**
 * Contact details the public pages may show. Nothing is invented here: an address only appears when it has been
 * configured (NEXT_PUBLIC_SUPPORT_EMAIL at build time), otherwise visitors are pointed to the contact form, which
 * always works because messages are stored in the platform and read by staff.
 */
export const SUPPORT_EMAIL: string | null = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null

/** The date the privacy policy and terms were last changed in substance. Update it whenever their wording changes. */
export const LEGAL_UPDATED = 'October 6, 2026'

/**
 * Who runs the service, shown on the legal pages only when configured (set at build time):
 *   NEXT_PUBLIC_OPERATOR_NAME, NEXT_PUBLIC_OPERATOR_ADDRESS, NEXT_PUBLIC_ODPC_REGISTRATION
 */
export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || null,
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS?.trim() || null,
  odpcRegistration: process.env.NEXT_PUBLIC_ODPC_REGISTRATION?.trim() || null,
}
