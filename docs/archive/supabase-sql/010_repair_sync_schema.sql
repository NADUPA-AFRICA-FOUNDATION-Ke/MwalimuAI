-- =============================================================
-- Mwalimu AI — Repair live schema for cross-device sync
-- Run this in the Supabase SQL editor. Fully idempotent.
--
-- Diagnosis (2026-06-11): the live learning_progress and tools_used
-- tables were created from an older schema and do not match what the
-- app writes. Upserts using onConflict need the UNIQUE constraints
-- and UPDATE policies below; when missing, every save fails silently
-- (writes are fire-and-forget) so progress never reaches the cloud
-- and other devices/browsers see nothing.
--
-- This script supersedes 003, 005, 006, 007, 008_*, and 009. It makes
-- no assumptions about which of those were run.
-- =============================================================

-- ── 1. learning_progress — ensure every column the app writes ──
CREATE TABLE IF NOT EXISTS public.learning_progress (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL
);

ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS completed_lessons     TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reflections           JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pre_assessment        JSONB,
  ADD COLUMN IF NOT EXISTS post_assessment       JSONB,
  ADD COLUMN IF NOT EXISTS assignment            JSONB,
  ADD COLUMN IF NOT EXISTS certificate_earned_at TEXT,
  ADD COLUMN IF NOT EXISTS cohort_joined         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- Deduplicate before adding the unique constraint (keep newest row)
DELETE FROM public.learning_progress
WHERE ctid NOT IN (
  SELECT DISTINCT ON (user_id, program_id) ctid
  FROM public.learning_progress
  ORDER BY user_id, program_id, updated_at DESC NULLS LAST
);

-- UNIQUE(user_id, program_id) — required by upsert(onConflict:'user_id,program_id')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'learning_progress'
      AND c.contype IN ('u', 'p')
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k
      ) = ARRAY['program_id', 'user_id']
  ) THEN
    ALTER TABLE public.learning_progress
      ADD CONSTRAINT learning_progress_user_id_program_id_key
      UNIQUE (user_id, program_id);
  END IF;
END $$;

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_own" ON public.learning_progress;
DROP POLICY IF EXISTS "progress_insert_own" ON public.learning_progress;
DROP POLICY IF EXISTS "progress_update_own" ON public.learning_progress;

CREATE POLICY "progress_select_own" ON public.learning_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert_own" ON public.learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update_own" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── 2. tools_used — ensure shape, constraint, and policies ─────
CREATE TABLE IF NOT EXISTS public.tools_used (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL
);

ALTER TABLE public.tools_used
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DELETE FROM public.tools_used
WHERE ctid NOT IN (
  SELECT DISTINCT ON (user_id, tool_id) ctid
  FROM public.tools_used
  ORDER BY user_id, tool_id
);

-- UNIQUE(user_id, tool_id) — required by upsert(onConflict:'user_id,tool_id')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'tools_used'
      AND c.contype IN ('u', 'p')
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname)
        FROM unnest(c.conkey) k
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k
      ) = ARRAY['tool_id', 'user_id']
  ) THEN
    ALTER TABLE public.tools_used
      ADD CONSTRAINT tools_used_user_id_tool_id_key
      UNIQUE (user_id, tool_id);
  END IF;
END $$;

ALTER TABLE public.tools_used ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tools_select_own" ON public.tools_used;
DROP POLICY IF EXISTS "tools_insert_own" ON public.tools_used;
DROP POLICY IF EXISTS "tools_update_own" ON public.tools_used;

CREATE POLICY "tools_select_own" ON public.tools_used
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tools_insert_own" ON public.tools_used
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tools_update_own" ON public.tools_used
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── 3. activity_log — UPDATE policy for upsert(onConflict) ─────
DROP POLICY IF EXISTS "activity_update_own" ON public.activity_log;
CREATE POLICY "activity_update_own" ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── 4. tool_outputs — table + policies (as in 009) ─────────────
CREATE TABLE IF NOT EXISTS public.tool_outputs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL DEFAULT '',
  input      JSONB       NOT NULL DEFAULT '{}',
  output     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tool_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_outputs_select_own" ON public.tool_outputs;
DROP POLICY IF EXISTS "tool_outputs_insert_own" ON public.tool_outputs;
DROP POLICY IF EXISTS "tool_outputs_delete_own" ON public.tool_outputs;

CREATE POLICY "tool_outputs_select_own" ON public.tool_outputs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tool_outputs_insert_own" ON public.tool_outputs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tool_outputs_delete_own" ON public.tool_outputs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tool_outputs_user_tool
  ON public.tool_outputs(user_id, tool_id, created_at DESC);


-- ── 5. journal_entries — table + policies (as in 003) ──────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id         TEXT        PRIMARY KEY,           -- client-generated (j-<timestamp>)
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

CREATE POLICY "journal_select_own" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_insert_own" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_delete_own" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id    ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at DESC);


-- ── 6. goals — table + policies (as in 003) ────────────────────
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
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete_own" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);


-- ── 7. assessment_results — table + policies (as in 003) ───────
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responses    JSONB  NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
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
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);


-- ── 8. lesson_discussions — table + policies (as in 003) ───────
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

DROP POLICY IF EXISTS "disc_select_auth" ON public.lesson_discussions;
DROP POLICY IF EXISTS "disc_insert_own"  ON public.lesson_discussions;
DROP POLICY IF EXISTS "disc_delete_own"  ON public.lesson_discussions;

-- Any authenticated user can read discussions for any lesson
CREATE POLICY "disc_select_auth" ON public.lesson_discussions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "disc_insert_own" ON public.lesson_discussions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "disc_delete_own" ON public.lesson_discussions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lesson_disc_lesson  ON public.lesson_discussions(program_id, module_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_disc_user_id ON public.lesson_discussions(user_id);


-- ── 9. Verify — all of these should return rows ────────────────
-- a) Columns the app writes must all exist:
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('learning_progress', 'tools_used', 'tool_outputs', 'activity_log',
                     'journal_entries', 'goals', 'assessment_results', 'lesson_discussions')
ORDER BY table_name, ordinal_position;

-- b) Unique constraints needed by the upserts:
SELECT conname FROM pg_constraint
WHERE conname IN ('learning_progress_user_id_program_id_key', 'tools_used_user_id_tool_id_key');

-- c) RLS policies (expect select/insert/update per table, +delete where applicable):
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('learning_progress', 'tools_used', 'activity_log', 'tool_outputs',
                    'journal_entries', 'goals', 'assessment_results', 'lesson_discussions')
ORDER BY tablename, cmd;
