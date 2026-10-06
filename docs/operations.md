# Operations

## Environments

- **Production**: Vercel project `mwalimu-ai` + Convex deployment `savory-mallard-562`.
- **Local**: `npx convex dev` creates a private development deployment; nothing there touches production.
- **Staging** (recommended, not yet set up): a second Convex deployment and a Vercel preview that points to it.
  To set one up: create a new Convex project ("Mwalimu AI staging"), `npx convex env set` the same variables
  as production (with test keys: Stripe test mode, a separate Resend sender), add `NEXT_PUBLIC_CONVEX_URL` and
  `CONVEX_URL` for the **Preview** environment in Vercel pointing at it, and deploy a branch with
  `npx convex deploy` using that project's deploy key. Never copy production learner data into staging.

## Backups and restore

Convex keeps the database; turn on its scheduled backups so there is a copy to restore from.

1. Convex dashboard > the production deployment > **Settings > Backups**: enable a daily backup and note the retention.
2. Before a risky release, press **Backup now** (or `npx convex export --path backup.zip` with the deploy key).
3. **Restore**: dashboard > Backups > pick the backup > **Restore**. Restoring replaces current data, so announce a
   short maintenance window and check the audit log checkpoint emails afterwards.
4. Test a restore into a staging deployment once a quarter so you know it works before you need it.

Code is in Git; every deployment on Vercel is kept, so rolling the website back is "Promote to Production" on the
previous one. Backend changes in this project are additive (new tables, new optional fields), so older code keeps
working against newer data.

## What is kept, and for how long

| Data | Kept | Why |
|---|---|---|
| Learner profile, progress, journal, AI conversations, activity | While the account exists; erased when the learner deletes it | Needed to teach; erased on request |
| Certificates | Indefinitely (name removed if the learner deletes their account) | Others verify them |
| Staff audit log | Indefinitely, append-only | Accountability. Entries about an erased learner keep only an anonymised label |
| Privacy request records | Indefinitely, no personal data | Shows requests were honoured |
| Support tickets | 2 years after resolved, then deleted automatically | Handling disputes |
| Email log | 30 days | Troubleshooting |
| Application errors | 90 days | Debugging |
| AI usage rows | 60 days | Usage charts |
| Read or dismissed in-app notifications | 6 months | Housekeeping |

Automatic cleanup runs daily (`convex/retention.ts`). The data protection notice on the site should match this table.

## Privacy requests

- **Download my data / Delete my account**: learners do these themselves in Settings. Deletion locks the account at
  once and removes data in the background; a learner with a paid plan must cancel it first.
- Staff accounts cannot be self-deleted; remove staff access first.
- Raw import rows from the Supabase move (`migrationRecords`) are no longer read by the app. Once you are sure the move
  is complete, remove them: `npx convex run retention:purgeMigrationRecords '{"confirm":"DELETE-MIGRATION-RECORDS"}'`.

## Runbook: when something goes wrong

**The site is down or erroring.** The uptime check (GitHub Actions, every 10 minutes) emails repository watchers.
Check `/api/health`, Vercel deployments and the Errors page in the console. Roll back on Vercel if the last release
caused it.

**Someone lost their authenticator.** They use a backup code. If they have none, a Super Admin resets their
two-factor (Staff page). If the only Super Admin is locked out, from a trusted shell with the deploy key:
`npx convex run admin/staff:emergencyResetMfa '{"email":"them@example.com"}'` then they enrol again.

**An "audit log may have been tampered with" email.** Treat as a security incident: rotate the Convex deploy key and
any Vercel tokens, review who has dashboard access, compare with earlier checkpoint emails, and restore from a backup
taken before the first failed check if needed.

**A secret was leaked.** Rotate it where it lives (see `environment.md`), redeploy, then check the audit log and the
Errors page. Rotating `JWT_PRIVATE_KEY`/`JWKS` signs everyone out. Rotating `ADMIN_MFA_ENC_KEY` forces staff to enrol again.

**Emails are not arriving.** Confirm `AUTH_EMAIL_FROM` uses a domain verified in Resend (the default sandbox sender
only delivers to the Resend account owner) and look at `emailLog` for failed rows with their error.

**AI bill is climbing.** Use AI usage in the console: lower the daily limits, or press the emergency stop.
