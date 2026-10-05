-- =============================================================
-- Mwalimu AI — RLS + Profile Backfill Fixes
-- Run in the Supabase SQL editor AFTER 004_user_preferences.sql.
-- =============================================================

-- ── 1. activity_log — add missing UPDATE policy ───────────────
-- lib/streak.ts calls .upsert() with onConflict:'user_id,date,type'.
-- Without an UPDATE policy, the ON CONFLICT DO UPDATE branch silently
-- fails → streak data is not saved on any revisit.
DROP POLICY IF EXISTS "activity_update_own" ON public.activity_log;

CREATE POLICY "activity_update_own" ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id);


-- ── 2. tools_used — add missing UPDATE policy ─────────────────
-- lib/streak.ts calls .upsert() with onConflict:'user_id,tool_id'.
-- Same issue: upsert silently fails when the row already exists.
DROP POLICY IF EXISTS "tools_update_own" ON public.tools_used;

CREATE POLICY "tools_update_own" ON public.tools_used
  FOR UPDATE USING (auth.uid() = user_id);


-- ── 3. Backfill missing profile rows ──────────────────────────
-- If 002_app_schema.sql was run with DROP TABLE CASCADE, all existing
-- profile rows were deleted.  The on_auth_user_created trigger only
-- fires for NEW signups, so existing users end up without a row.
-- This INSERT fills in the gap so those users aren't sent back to
-- onboarding on their next login.
INSERT INTO public.profiles (id, name, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', u.email, ''),
  NOW()
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
