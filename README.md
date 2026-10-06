# Mwalimu AI

Professional learning for Kenyan CBC teachers: guided learning paths, an AI coach and teaching tools, a teacher
community, certificates anyone can verify, and a staff console for running it all.

Built with Next.js (App Router), React, Tailwind, and Convex (database, auth, scheduled jobs). Deployed on Vercel.

## Run it locally

```bash
pnpm install
cp .env.local.example .env.local      # fill in what you need; see docs/environment.md
npx convex dev                        # in one terminal: backend + generated types
pnpm dev                              # in another: the website at http://localhost:3000
```

Checks (the same ones CI runs before every deploy):

```bash
npx tsc --noEmit && npx tsc --noEmit -p convex   # types
pnpm lint
pnpm test && npx vitest run                      # unit and backend tests
```

## Where things are

| Path | What |
|---|---|
| `app/` | Pages and API routes. `app/dashboard` is the learner app, `app/admin` the staff console |
| `convex/` | Backend: data model (`schema.ts`), learner functions, `admin/` staff functions, scheduled jobs (`crons.ts`) |
| `components/`, `lib/`, `context/` | UI, helpers, app-wide state |
| `tests/` | Backend tests (`tests/convex`) and helper tests (`tests/app`) |
| `docs/` | How it is built, run and deployed |

## Documentation

- [Architecture](docs/architecture.md): how the pieces fit together
- [Admin console](docs/admin-console.md): roles, content studio, analytics, AI assistant
- [Operations](docs/operations.md): backups, retention, incidents, staging
- [Deploying](docs/deploying.md): the automatic pipeline
- [Environment variables](docs/environment.md): what each one does
