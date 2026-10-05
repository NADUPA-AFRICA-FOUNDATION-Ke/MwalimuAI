-- =============================================================
-- Mwalimu AI — Missing Tables Migration
-- Run in the Supabase SQL editor AFTER 002_app_schema.sql.
-- Adds journal_entries, goals, assessment_results, lesson_discussions.
-- =============================================================

-- ── 1. journal_entries ────────────────────────────────────────
-- Written by app/dashboard/journal/page.tsx
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id         TEXT        PRIMARY KEY,           -- client-generated  (j-<timestamp>)
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT '',   -- the daily prompt shown
  content    TEXT        NOT NULL DEFAULT '',
  mood       INTEGER     NOT NULL DEFAULT 3,    -- 1–5
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_select_own"  ON public.journal_entries;
DROP POLICY IF EXISTS "journal_insert_own"  ON public.journal_entries;
DROP POLICY IF EXISTS "journal_delete_own"  ON public.journal_entries;

CREATE POLICY "journal_select_own" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "journal_insert_own" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_delete_own" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure column exists if table was created before this migration
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id    ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at DESC);


-- ── 2. goals ──────────────────────────────────────────────────
-- Written by app/dashboard/progress/page.tsx
CREATE TABLE IF NOT EXISTS public.goals (
  id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT   NOT NULL DEFAULT '',
  category   TEXT   NOT NULL DEFAULT 'other',
  milestones JSONB  NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;

CREATE POLICY "goals_select_own" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_goals_user_id    ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON public.goals(created_at ASC);


-- ── 3. assessment_results ─────────────────────────────────────
-- Written by app/dashboard/assessment/page.tsx
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses    JSONB  NOT NULL DEFAULT '{}',   -- full question→answer map
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                              -- one result per user (upsert)
);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_select_own" ON public.assessment_results;
DROP POLICY IF EXISTS "assessment_insert_own" ON public.assessment_results;
DROP POLICY IF EXISTS "assessment_update_own" ON public.assessment_results;

CREATE POLICY "assessment_select_own" ON public.assessment_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "assessment_insert_own" ON public.assessment_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assessment_update_own" ON public.assessment_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);


-- ── 4. lesson_discussions ─────────────────────────────────────
-- Written by the lesson player; stores teacher discussion posts per lesson.
CREATE TABLE IF NOT EXISTS public.lesson_discussions (
  id         TEXT        PRIMARY KEY,           -- client-generated random slug
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  program_id TEXT        NOT NULL,
  module_id  TEXT        NOT NULL,
  lesson_id  TEXT        NOT NULL,
  author     TEXT        NOT NULL DEFAULT '',
  content    TEXT        NOT NULL DEFAULT '',
  is_seed    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lesson_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disc_select_auth"  ON public.lesson_discussions;
DROP POLICY IF EXISTS "disc_insert_own"   ON public.lesson_discussions;
DROP POLICY IF EXISTS "disc_delete_own"   ON public.lesson_discussions;

-- Any authenticated user can read discussions for any lesson
CREATE POLICY "disc_select_auth" ON public.lesson_discussions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "disc_insert_own" ON public.lesson_discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "disc_delete_own" ON public.lesson_discussions
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.lesson_discussions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_lesson_disc_lesson  ON public.lesson_discussions(program_id, module_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_disc_user_id ON public.lesson_discussions(user_id);
