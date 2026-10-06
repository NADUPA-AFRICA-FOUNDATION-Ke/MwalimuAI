# Architecture

## The pieces

- **Website** (Next.js on Vercel): public pages (landing, blog, FAQ, pricing, certificate verification), the learner
  app under `/dashboard`, and the staff console under `/admin`.
- **Backend** (Convex): the database, sign-in (email and password, Google), every query and mutation, scheduled jobs,
  and file storage. Learners and staff call it directly from the browser with their own sign-in.
- **API routes** (`app/api`): only for things that need server secrets: the AI tools, Stripe, the admin AI assistant,
  unsubscribe links, error reports, health checks.

## How access is enforced

Rules live in the backend, never only in the interface.

- **Learners** reach only their own data (`convex/lib/auth.ts`). Suspended accounts are refused everywhere.
- **Staff** functions go through `staffQuery` / `staffMutation` (`convex/lib/staff.ts`): signed in, staff row active,
  two-factor verified this session, role allowed, a reason given for changes, and an audit entry written in the same
  transaction (a change with no audit entry is rolled back).
- **Audit log** (`convex/lib/audit.ts`): append-only and hash-chained. A daily job re-checks it and emails the latest
  fingerprint to Super Admins, so editing history is detectable (`convex/auditWitness.ts`).

## Content

Learning paths, the needs assessment, resources, FAQ and blog posts are content items with versions
(`draft → in review → approved → published`, never deleted, a second person must approve). The learner app and public
pages read the published copy and fall back to the built-in copy in `lib/` if nothing is published.

## Scale

No page or admin screen scans a user-sized table. Dashboards read small sharded counters (`convex/lib/analytics.ts`),
lists are paginated by index, and bulk work (email campaigns, erasure, recalculation) runs in small batches through
the scheduler.

## Background jobs (`convex/crons.ts`)

Daily streak reminders and weekly summaries (off until `EMAIL_NUDGES_ENABLED=true`), email log cleanup, retention
sweep, audit checkpoint (daily) and full re-check (weekly).

## Data model

See `convex/schema.ts`; each table has a comment on what it is for.
