-- =============================================================
-- Mwalimu AI — Fix upsert RLS policies
-- Run in the Supabase SQL editor.
-- Safe to run multiple times (idempotent).
-- =============================================================

-- ── activity_log — ensure UPDATE policy exists ────────────────
-- recordActivity() calls .upsert(onConflict:'user_id,date,type').
-- ON CONFLICT DO UPDATE requires an UPDATE policy; without it the
-- upsert silently fails on any revisit, losing streak data.
DROP POLICY IF EXISTS "activity_update_own" ON public.activity_log;

CREATE POLICY "activity_update_own" ON public.activity_log
  FOR UPDATE USING (auth.uid() = user_id);


-- ── tools_used — ensure UPDATE policy exists ──────────────────
-- recordToolUsed() calls .upsert(onConflict:'user_id,tool_id').
-- Same issue: upsert silently fails when the row already exists
-- because there is no UPDATE policy to satisfy.
DROP POLICY IF EXISTS "tools_update_own" ON public.tools_used;

CREATE POLICY "tools_update_own" ON public.tools_used
  FOR UPDATE USING (auth.uid() = user_id);


-- ── learning_progress — ensure UPDATE policy exists ───────────
-- cloudSync() calls .upsert(onConflict:'user_id,program_id').
-- 002_app_schema.sql already adds this policy but if the table
-- was re-created without running that migration it may be missing.
DROP POLICY IF EXISTS "progress_update_own" ON public.learning_progress;

CREATE POLICY "progress_update_own" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);
