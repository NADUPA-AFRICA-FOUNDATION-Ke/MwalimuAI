-- =============================================================
-- Mwalimu AI — Tool Output History
-- Run in the Supabase SQL editor AFTER 007_fix_upsert_rls.sql.
-- Stores every successful AI tool generation so teachers can
-- review and restore past lesson plans, comments, letters, etc.
-- across devices.
-- =============================================================

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
