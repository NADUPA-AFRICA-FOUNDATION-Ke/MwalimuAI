# Public pages: where each fact comes from

The public pages must only say what the product does. Each fact has one source so it cannot drift:

| Page | Fact | Source |
|---|---|---|
| Pricing | Prices | `lib/plans.ts`, the same definition the Stripe checkout charges from |
| Pricing, FAQ, Docs | AI allowance per day (free / paid) | Live: `convex/siteFacts.ts` reads the admin-adjustable settings |
| Pricing | School size limit | `MAX_MEMBERS` in `convex/schools.ts` |
| About, Features | Counts of paths, modules, lessons | Live: published content, via `convex/siteFacts.ts` |
| FAQ, Docs, Terms | Certificate rules (lessons, reflections, pass mark) | `convex/lib/certificateRules.ts`, the same constants the server enforces |
| Blog | Post date | The day the post was published (publish record), not typed by hand |
| Resources | Built-in links | `lib/resources-data.ts`: official sources, addresses checked live; no invented sizes or titles |
| Privacy | Retention periods | `convex/retention.ts` |
| Contact, Support, Privacy, Terms | Email address, operator, registration number | Only shown when configured (`lib/site.ts`, see `environment.md`) |

Hand-written copy: `lib/docs-data.ts` (Documentation), `lib/faq-data.ts` (FAQ, until staff publish their own in the console), `app/privacy/page.tsx`, `app/terms/page.tsx`. When the product changes, change these with it and update `LEGAL_UPDATED` in `lib/site.ts` if the privacy policy or terms change.

Contact and Support forms start a support conversation (`convex/tickets.ts: createPublic`). Nothing is emailed: the visitor gets a private link to a conversation page where staff replies appear, and staff answer from Admin → Tickets (marked "visitor"). The form checks that the email's domain can receive mail (`app/api/contact/route.ts`), which catches typos but does not prove the mailbox is theirs. A visitor can add the conversation to their account inbox (button on the conversation page; automatic for sign-ins that proved the address, such as Google).

Locked-out accounts: staff issue a one-time temporary password (Admin → user → Security, `admin/users.ts: issueTemporaryPassword`), which ends all sessions, and the person changes it in Settings (`convex/passwords.ts`).
