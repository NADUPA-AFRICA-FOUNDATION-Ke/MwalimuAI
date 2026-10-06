-- =============================================================
-- Mwalimu AI — Tool History
-- Run in the Supabase SQL editor.
-- Safe to run multiple times (idempotent).
-- =============================================================

-- Persist the AI-generated output of each teacher tool so teachers
-- can access their past lesson plans, report cards, etc. on any device.
CREATE TABLE IF NOT EXISTS public.tool_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id       TEXT        NOT NULL,
  prompt_preview TEXT       NOT NULL DEFAULT '',
  output        TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tool_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_history_select_own" ON public.tool_history;
DROP POLICY IF EXISTS "tool_history_insert_own" ON public.tool_history;
DROP POLICY IF EXISTS "tool_history_delete_own" ON public.tool_history;

CREATE POLICY "tool_history_select_own" ON public.tool_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tool_history_insert_own" ON public.tool_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tool_history_delete_own" ON public.tool_history
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tool_history_user_tool
  ON public.tool_history(user_id, tool_id, created_at DESC);

-- ── Also ensure all previously-needed UPDATE policies exist ──────
-- (idempotent re-apply in case earlier migrations were not run)

DROP POLICY IF EXISTS "activity_update_own" ON public.activity_log;
CREATE POLICY "activity_update_own" ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tools_update_own" ON public.tools_used;
CREATE POLICY "tools_update_own" ON public.tools_used
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_update_own" ON public.learning_progress;
CREATE POLICY "progress_update_own" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);
