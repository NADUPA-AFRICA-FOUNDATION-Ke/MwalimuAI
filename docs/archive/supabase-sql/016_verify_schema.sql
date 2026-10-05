-- =============================================================
-- Mwalimu AI — Schema drift safety net (run in the Supabase SQL editor)
-- Purely additive and idempotent: re-asserts every column and UPDATE
-- policy the app code depends on for progress tracking, journaling,
-- and profile/onboarding sync, regardless of which of 001-015 were
-- actually run against this database. Safe to run any number of times.
-- =============================================================

-- ── profiles ──────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS a11y_settings       JSONB   DEFAULT '{"textSize":"normal","highContrast":false,"reduceMotion":false,"dyslexiaFont":false,"wideSpacing":false}',
  ADD COLUMN IF NOT EXISTS low_bandwidth       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notifications_state JSONB   DEFAULT '{"read":[],"dismissed":[]}',
  ADD COLUMN IF NOT EXISTS sidebar_collapsed   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS active_session_id   TEXT;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- ── learning_progress ─────────────────────────────────────────
ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS certificate_serial TEXT;

DROP POLICY IF EXISTS "progress_select_own" ON public.learning_progress;
DROP POLICY IF EXISTS "progress_insert_own" ON public.learning_progress;
DROP POLICY IF EXISTS "progress_update_own" ON public.learning_progress;

CREATE POLICY "progress_select_own" ON public.learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert_own" ON public.learning_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
-- ON CONFLICT DO UPDATE (the upsert cloudSync() in lib/learning-progress.ts
-- relies on) silently no-ops without this policy.
CREATE POLICY "progress_update_own" ON public.learning_progress FOR UPDATE USING (auth.uid() = user_id);

-- ── activity_log ──────────────────────────────────────────────
DROP POLICY IF EXISTS "activity_select_own" ON public.activity_log;
DROP POLICY IF EXISTS "activity_insert_own" ON public.activity_log;
DROP POLICY IF EXISTS "activity_update_own" ON public.activity_log;

CREATE POLICY "activity_select_own" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_insert_own" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_update_own" ON public.activity_log FOR UPDATE USING (auth.uid() = user_id);

-- ── tools_used ────────────────────────────────────────────────
DROP POLICY IF EXISTS "tools_select_own" ON public.tools_used;
DROP POLICY IF EXISTS "tools_insert_own" ON public.tools_used;
DROP POLICY IF EXISTS "tools_update_own" ON public.tools_used;

CREATE POLICY "tools_select_own" ON public.tools_used FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tools_insert_own" ON public.tools_used FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tools_update_own" ON public.tools_used FOR UPDATE USING (auth.uid() = user_id);

-- ── journal_entries ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id         TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT '',
  content    TEXT        NOT NULL DEFAULT '',
  mood       INTEGER     NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_select_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_insert_own" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_delete_own" ON public.journal_entries;

CREATE POLICY "journal_select_own" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_insert_own" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_delete_own" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id    ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at DESC);

-- ── Verify ────────────────────────────────────────────────────
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'learning_progress', 'journal_entries', 'activity_log', 'tools_used')
ORDER BY table_name, column_name;
