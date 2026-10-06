-- =============================================================
-- Mwalimu AI — Complete Sync Setup (run this in Supabase SQL editor)
-- Safe to run multiple times (fully idempotent).
-- This script supersedes 005, 007, 008_tool_history, and 008_tool_outputs.
-- =============================================================

-- ── 1. tool_outputs — stores AI-generated content per teacher ─
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


-- ── 2. learning_progress UPDATE policy ───────────────────────
-- cloudSync() uses upsert(onConflict:'user_id,program_id').
-- ON CONFLICT DO UPDATE requires an UPDATE policy; missing it
-- causes silent save failures and breaks cross-device sync.
DROP POLICY IF EXISTS "progress_update_own" ON public.learning_progress;
CREATE POLICY "progress_update_own" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- ── 3. activity_log UPDATE policy ────────────────────────────
DROP POLICY IF EXISTS "activity_update_own" ON public.activity_log;
CREATE POLICY "activity_update_own" ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id);


-- ── 4. tools_used UPDATE policy ──────────────────────────────
DROP POLICY IF EXISTS "tools_update_own" ON public.tools_used;
CREATE POLICY "tools_update_own" ON public.tools_used
  FOR UPDATE USING (auth.uid() = user_id);


-- ── Verify ────────────────────────────────────────────────────
-- After running, check these return rows:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('tool_outputs','learning_progress','activity_log','tools_used')
-- ORDER BY tablename, cmd;
