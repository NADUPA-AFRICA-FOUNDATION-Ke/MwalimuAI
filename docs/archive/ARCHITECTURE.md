# Mwalimu AI — Architecture & Operations

AI-powered professional development platform for Kenyan CBC (Competency-Based Curriculum) teachers.

## Stack

- **Framework:** Next.js 16 (App Router), React, TypeScript
- **UI:** shadcn/ui, Tailwind CSS v4, Geist Sans/Mono
- **Backend/DB:** Supabase (Postgres + Auth + Row Level Security), accessed via `@supabase/ssr`
- **AI:** Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) — Groq (primary) with local Ollama fallback
- **Payments:** Stripe (`stripe`, `@stripe/stripe-js`)
- **Deployment:** Vercel

## AI backend

Two providers, both accessed through the OpenAI-compatible SDK shim (`createOpenAI`):

- **Groq** (`https://api.groq.com/openai/v1`, model `GROQ_MODEL` — default `llama-3.1-8b-instant`) — primary, free-tier. On a rate-limit error, the route enters a **60-second cooldown** and falls through to Ollama for the duration.
- **Ollama** (`http://localhost:11434/v1`, model `OLLAMA_MODEL` — default `gemma2:2b`) — local-only fallback; unavailable on Vercel (`process.env.VERCEL` guards this in `app/api/detect-ai/route.ts`), used for offline/dev use.

System prompts live per-route (see below) and both `chat` and `tools` routes prepend a **Kiswahili language instruction block** when `lang === 'sw'`, and append an **accuracy directive** telling the model to admit uncertainty rather than invent specifics (policy numbers, statistics) — added because the underlying model is small/fast and prone to filling in plausible-sounding but fabricated detail.

## API routes

All routes except `stripe/webhook` require an authenticated Supabase session, checked via `lib/require-auth.ts` (`requireAuth` / `requireAuthUser`, which read the session from cookies or an `Authorization: Bearer` header). All AI routes are rate-limited per user via `lib/rate-limit.ts` (in-memory fixed window, best-effort — resets on serverless cold start; swap the internal `Map` for Upstash Redis if a durable cross-instance limit is ever needed).

| Route | Purpose |
|---|---|
| `POST /api/chat` | AI Coach chat. `UIMessageStream` via `useChat`. Body: `{ messages, lang, profile, currentLesson }`. `currentLesson` (from `mwalimu_current_lesson` localStorage) adds lesson context to the system prompt. |
| `POST /api/tools` | All 7 Teacher Tools (lesson-plan, report-card, differentiation, parent-comms, assignment-feedback, policy-explainer, action-research). Raw text stream (`ReadableStream`, not `useChat`). Body: `{ tool, prompt, lang }`. |
| `POST /api/rehearsal` | AI Lesson Rehearsal — AI plays a simulated class. Body: `{ messages, lessonPlan, grade, lang }`. |
| `POST /api/assignment-review` | LMS assignment AI feedback. |
| `POST /api/detect-ai` | AI-generated-text detector (used in assignment review flows). |
| `POST /api/auth/delete-account` | Deletes the authenticated user via `lib/supabase/admin.ts` (service-role client). |
| `POST /api/stripe/checkout` | `{ plan, email }` → `{ url }` for Stripe hosted checkout. Plans: professional (KES 500/mo), school (KES 3,000/mo, contact-only). |
| `POST /api/stripe/webhook` | Stripe webhook → `subscriptions` table. |

**SDK note:** `ai` v6 only exposes `toTextStreamResponse`, `toUIMessageStreamResponse`, `toJsonResponse` — not `toDataStreamResponse` (removed since v5→v6).

## Database

Source of truth is Supabase; `localStorage` is a read-through cache only (see Auth flow below for why order-of-operations here matters). Migrations are plain `.sql` files under `scripts/`, meant to be pasted into the Supabase SQL editor **in numeric order** — there is no migration runner. This has caused schema drift in the past (a migration written but never actually run against the live DB), which is why `scripts/016_verify_schema.sql` exists: it's a purely additive, idempotent script that re-asserts every column and UPDATE policy the app depends on, safe to re-run at any time as a drift-repair safety net.

Core tables: `profiles`, `activity_log`, `tools_used`, `learning_progress`, `journal_entries`, `ai_conversations` + `ai_messages`, `community_posts` + `community_comments`, `goals`, `assessment_results`, `lesson_discussions`, `tool_history`, `certificates`, `subscriptions`.

Every table has Row Level Security enabled with `auth.uid() = user_id`-style owner policies. **Upserts require an explicit `UPDATE` policy** in addition to `INSERT` — Postgres' `ON CONFLICT DO UPDATE` silently fails RLS without one, which is why several migrations (`007`, `009`, `010`, `016`) specifically re-add UPDATE policies for `activity_log`, `tools_used`, `learning_progress`.

Writes to Supabase from the client are fire-and-forget via `lib/write-queue.ts`'s `trackWrite()`: it registers the promise so `signOut()` can drain in-flight writes (`flushWrites()`) before invalidating the session, and — as of this pass — shows a toast (via `sonner`, mounted in `components/providers.tsx`) if the write's result contains an `error`, instead of only logging to the console. Previously, failed cloud writes were invisible to the user; the local optimistic update looked identical whether the cloud write succeeded or not.

## Auth flow

Supabase Auth via `@supabase/ssr`, cookie-based (not localStorage) so the browser client (`lib/supabase/client.ts`), server client (`lib/supabase/server.ts`), and middleware (`proxy.ts`) all read/write the same session.

- **`proxy.ts`** runs on every request: refreshes the session cookie, redirects unauthenticated users away from `/dashboard`, and redirects already-authenticated+verified users away from `/auth/*` pages to `/dashboard` — **except `/auth/reset-password`**, which must stay reachable even when a (recovery) session is active. This exception exists because a password-reset link creates a recovery session before the user has actually set a new password; without it, the middleware would bounce the user straight to the dashboard before they could complete the reset, and they'd have no idea their password never actually changed.
- **`context/profile-context.tsx`** (`ProfileProvider`, wraps the whole app) owns `onAuthStateChange`. The callback must stay synchronous — Supabase-js holds its internal auth lock while dispatching the event, so awaiting other Supabase calls inside it deadlocks token refresh. All real work is deferred via `setTimeout(0)` into `handleSession()`.
- **Single-device login:** one active session per account. `claimDevice()` writes `profiles.active_session_id` and calls `signOut({ scope: 'others' })` on `SIGNED_IN`/`INITIAL_SESSION`, deduped per login via a ref so tab-focus/token-refresh re-fires don't re-trigger it. A watchdog (60s poll + focus) compares this browser's device id against `active_session_id` and signs out locally if superseded.
- **Profile load order on sign-in:** cloud `profiles` row is authoritative when `row.completed` is true; otherwise the code falls back to the cached `TeacherProfile` in `localStorage` (and re-syncs it to the cloud) so a transient fetch failure or unrun migration doesn't force a completed user back through onboarding. `setProfile()` (onboarding completion, settings edits) now retries the cloud upsert once on failure and surfaces a toast if it still fails, rather than silently leaving the account's cloud row out of sync with what the user just saved.

## AI module implementation

- `lib/render-md.tsx` — custom reading renderer (`renderReading()`) for lesson content: parses `##`/`###` headings, lists, `|` tables, and `>> KEY:/THINK:/CASE:/TRY:` callout cards; `stripMd()` strips markdown for TTS/share.
- `components/quiz.tsx` — quiz component with configurable `passingScore` (default **85%**, previously 70%); also contains a parser that turns AI-generated quiz text into a `Quiz` object (same 85% default there).
- Kiswahili toggle (`lang: 'en' | 'sw'`) lives in `ProfileContext`, persisted to `localStorage.mwalimu_lang` and `profiles.lang`. **Every caller of `/api/tools` and `/api/chat` must pass `lang` in the request body** — the backend only applies the Kiswahili system-prompt instruction when it's present; a page that forgets to pass it will silently always respond in English regardless of the user's toggle.

## Deployment / configuration

Deployed on Vercel. Required env vars (see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # used by lib/supabase/admin.ts (account deletion)
GROQ_API_KEY
GROQ_MODEL                       # optional, defaults to llama-3.1-8b-instant
OLLAMA_MODEL                     # optional, local dev only
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL               # used for Stripe redirects + auth callback URLs
```

To apply a new migration: paste the relevant `scripts/NNN_*.sql` file into the Supabase SQL editor (project → SQL Editor) in numeric order. After any schema change or if progress/journal data looks like it isn't syncing, re-run `scripts/016_verify_schema.sql` — it's safe to run repeatedly and will close any drift between the live DB and what the app code expects.

`npm test` runs the plain `node:test`-based suite (`scripts/run-tests.mjs`, no external test framework dependency).
