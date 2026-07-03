// The canonical public app URL — prefer this over window.location.origin for
// any link meant to be opened outside the current browser session (emails,
// QR codes, printed PDFs). window.location.origin can be a Vercel preview or
// git-branch deployment URL, which is gated behind Vercel's SSO wall and
// breaks for anyone who opens the link without a Vercel login.
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')
}
