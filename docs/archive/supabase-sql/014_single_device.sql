-- =============================================================
-- Mwalimu AI — Single active device per account
-- Run in the Supabase SQL editor. Safe to run multiple times.
--
-- Each sign-in claims the account for that device by writing its
-- device id here. Other devices detect the change (poll + focus
-- check in profile-context) and sign themselves out; their refresh
-- tokens are also revoked server-side via signOut({scope:'others'}),
-- so even without JavaScript the old session dies when its access
-- token expires.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_session_id TEXT;

-- Existing own-row SELECT/UPDATE/INSERT policies on profiles already
-- cover reading and writing this column.

-- ── Verify ──────────────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active_session_id';
