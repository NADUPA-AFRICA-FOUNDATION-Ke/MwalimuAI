# Environment variables

Where each one lives: **Vercel** (the website and API routes), **Convex** (`npx convex env set NAME value`), or **GitHub**
(deploy pipeline only). Secrets are never committed.

## Convex (backend)

| Name | Purpose |
|---|---|
| `JWT_PRIVATE_KEY`, `JWKS` | Signs learner and staff sessions |
| `SITE_URL` | The public site address (links in emails, sign-in redirects) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google sign-in |
| `RESEND_API_KEY` | Sends email (password resets, ticket replies, certificates, nudges, staff invites) |
| `AUTH_EMAIL_FROM` | Sender, e.g. `Mwalimu AI <hello@yourdomain>`. **Must be on a domain verified in Resend**, otherwise mail only reaches the Resend account owner |
| `ADMIN_MFA_ENC_KEY` | Encrypts staff authenticator secrets. Changing it forces everyone to re-enrol |
| `ADMIN_ORIGINS` | Optional extra hostnames for the console |
| `EMAIL_NUDGES_ENABLED` | `true` turns on streak reminders and weekly summaries. Off by default |
| `EMAIL_UNSUB_SECRET` | Optional; signs unsubscribe links (falls back to `ADMIN_MFA_ENC_KEY`) |
| `STRIPE_WEBHOOK_SECRET` | Lets the payment webhook update plans |
| `MIGRATION_SECRET`, `SUPABASE_JWT_ISSUER` | Left over from the Supabase move; remove when no longer needed |

## Vercel (website)

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` | Where the backend is |
| `ADMIN_PATH_ENABLED` | `true` serves the console at `/admin` on the main address |
| `ADMIN_HOSTS` | Optional dedicated hostnames for the console |
| `GROQ_API_KEY`, `GROQ_MODEL` | Learner AI tools |
| `ADMIN_AI_MODEL`, `ADMIN_AI_PROVIDER`, `GOOGLE_GENERATIVE_AI_API_KEY` | Admin AI assistant (default Groq `openai/gpt-oss-120b`; `ADMIN_AI_PROVIDER=google` for Gemini) |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments |
| `NEXT_PUBLIC_APP_URL` | Public site address for Stripe return links |

Old `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` values are no longer used by the code and can be deleted.

## GitHub (Actions)

`CONVEX_DEPLOY_KEY`, `VERCEL_TOKEN` (secrets); `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (variables). See `deploying.md`.
