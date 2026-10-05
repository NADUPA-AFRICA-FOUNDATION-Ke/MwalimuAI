# Admin console

Internal staff console for support (streaks, profiles), content, bulk incident tools and the
audit log. Lives in `app/admin`, backed by Convex functions in `convex/admin/*`.

## Where things live

```
convex/
  schema.ts                 staff, auditLog, streakAdjustments, incidents*, cms* tables (+ profile fields)
  content.ts                learner-facing catalogue query (published CMS content)
  admin/                    one file per console area; every export is a staffQuery/staffMutation
    me.ts mfa.ts            who am I / TOTP enrolment + challenge
    users.ts                search, view, edit profile, suspend, password-reset link
    streaks.ts              streak view, preview, restore, undo
    incidents.ts            bulk restore: create → preview → approve → run (scheduler batches)
    certificates.ts         revoke, reinstate, reissue
    content.ts              create/edit/submit/review/publish/archive + static import
    audit.ts staff.ts       audit list + integrity check; staff management + bootstrap
    migrations.ts           one-off profile backfill
  lib/
    permissions.ts          THE role matrix and policy constants (look-back, bulk threshold)
    staff.ts                staffQuery / staffMutation: permission, MFA, reason, audit-or-rollback
    audit.ts                the only writer of auditLog (hash chain)
    errors.ts               fail(code, message), notFound(), forbidden()
    streakMath.ts           Kenya-time dates and streak maths (mirrors lib/streak.ts)
    streakRestore.ts        restore rules shared by single and bulk restore
    contentValidation.ts    what each content kind must look like (drafts lenient, publish strict)
    contentRead.ts          assemble the learner's Program; program definition for eligibility
    eligibility.ts          server-side certificate eligibility
    totp.ts taxonomy.ts profileSearch.ts
app/admin/                  one route per screen (pages stay thin: data + layout)
components/admin/           auth-gate (sign-in/MFA), shell (nav), common (hooks + dialogs),
                            user/* (the user-detail tabs), content/* (editor forms, tag picker)
proxy.ts                    admin host separation   ·   context/content-context.tsx  learner side
tests/convex/               permission, audit, streak, incident, content, certificate tests
```

To add an admin action: write a `staffMutation` in the matching `convex/admin/*.ts` with the
permission it needs and a `log(...)` call, add a test beside the others, then a button in the page.

## Roles

| Permission | Super Admin | Content Manager | Support Agent | Viewer |
|---|---|---|---|---|
| Search/view users, streaks | ✓ | – | ✓ | ✓ |
| Restore streak (single), undo | ✓ | – | ✓ | – |
| Bulk incidents: create/run | ✓ | – | ✓ (≤ 50 users) | – |
| Bulk incidents: approve, run > 50 | ✓ | – | – | – |
| Edit profile, suspend/reactivate, send reset link | ✓ | – | ✓ | – |
| Certificates: reissue/revoke/reinstate | ✓ | – | – | – |
| Content: view/preview | ✓ | ✓ | – | ✓ |
| Content: edit, submit, review, publish, archive | ✓ | ✓ | – | – |
| Audit log | all | own | own | all |
| Staff management | ✓ | – | – | – |

The matrix lives in `convex/lib/permissions.ts` and is enforced server-side by `staffQuery` /
`staffMutation` (`convex/lib/staff.ts`). The UI only mirrors it.

Rules enforced on the server:
- Every state-changing action needs a reason (10+ characters) and writes an audit row in the
  same transaction. A mutation that logs nothing is rolled back.
- Streak restore: past days only, at most 30 days back (Super Admin can extend to 365), only fills
  days with no activity, reversible. Learners can no longer backfill their own activity.
- Content: a version must be reviewed by a *different* person than the submitter, then published.
  A child can only go live once its parent is live. Nothing is ever deleted, only archived.
- Locked profile fields: email/sign-in identity, passwords and certificates cannot be edited
  (they are not in the argument schema at all). Passwords go through the reset-link flow.
- Learners cannot award, replace or delete their own certificates: eligibility and assessment
  scores are recomputed on the server.

## Authentication and MFA

Staff sign in with the normal Convex Auth methods, using the invited email address. That email must
be verified (Google, or after a password reset). Every staff session must then pass a TOTP check
(authenticator app). Verified sessions last 12 hours; 5 wrong codes lock the account for 15 minutes;
codes cannot be replayed. Authenticator secrets are AES-GCM encrypted with `ADMIN_MFA_ENC_KEY`.

## Setup

1. `npx convex env set ADMIN_MFA_ENC_KEY "<32+ random chars>"` and, for a separate admin host,
   `npx convex env set ADMIN_ORIGINS https://admin.example.com`.
2. Choose how the console is reached:
   - **Separate hostname:** set `ADMIN_HOSTS=admin.example.com` on the web host and point that subdomain at the
     same deployment. `/admin` is then a 404 on the main site.
   - **No extra domain** (e.g. the host plan limits custom domains): set `ADMIN_PATH_ENABLED=true` on the web host.
     The console is then at `https://<your-site>/admin`, unlinked and `noindex`. Access is still enforced by the
     Convex staff role and MFA, not by the hostname, so this is safe, just less hidden.
3. Deploy the Convex schema/functions (`npx convex deploy`).
4. Create the first Super Admin (refuses to run once any staff exist):
   `npx convex run admin/staff:bootstrapSuperAdmin '{"email":"you@example.com"}'`
5. Backfill search fields on existing profiles (safe to re-run):
   `npx convex run admin/migrations:backfillProfiles`
6. Sign in at the admin host, set up two-factor, invite the rest of the team from **Staff**.
7. Content: a Super Admin clicks **Import the built-in curriculum** once. Until then the learner app
   keeps using the bundled curriculum; after, CMS content overrides it program by program.

## Audit log

`auditLog` is append-only: only `convex/lib/audit.ts` inserts, and no function updates or deletes.
Each row stores the hash of the previous row; **Audit log → Verify integrity** re-derives the chain.
Convex cannot make a table immutable against someone with deploy-key or dashboard access, so also
stream logs to an external write-once store if you need stronger guarantees.

## Tests

`npm run test:convex` runs the role/permission, audit, streak, incident, content and certificate
tests against an in-memory Convex. After adding Convex modules without `npx convex dev`, run
`npm run convex:sync-api` to refresh `convex/_generated/api.d.ts`.

## Content studio, AI assistant and insights

- **Content** (`/admin/content`) is one studio with tabs: Learning paths, Needs assessment, Resource library, FAQ, Blog.
  Anything the learner app or public site shows from the built-in copy can be brought under management with one
  click ("Bring the built-in … here to edit"); the live content is unchanged until staff publish an edit.
- **Learning path builder**: outline on the left, editor on the right, release the whole path at once
  (submit all, approve all, publish all). The review rule is unchanged: nobody approves their own submission.
- **AI assistant** (`/api/admin/ai`): drafts a whole path from a brief, writes lessons, quizzes and blog posts,
  improves or translates text, and reviews content. Output is always a draft. Needs `GROQ_API_KEY` on the web host;
  optional `ADMIN_AI_MODEL` (default `openai/gpt-oss-120b`) and `ADMIN_AI_PROVIDER=google` to use Gemini instead
  (then `GOOGLE_GENERATIVE_AI_API_KEY`). Only MFA-verified staff with the right permission can call it, it is rate
  limited per person, and each use is written to the audit log.
- **Insights** (Content > Content insights, and "Learner insights" on each path): lesson drop-off, quiz question
  difficulty and distractor analysis, and what teachers asked for in the needs assessment. Backed by the same
  counters as Analytics (`Recalculate from source` rebuilds them). Nothing is flagged below 20 learners.
- **Announcements** (`/admin/announcements`): one row per message, shown in matching learners' notification bell
  (everyone, a county, or a level). Withdrawable.
