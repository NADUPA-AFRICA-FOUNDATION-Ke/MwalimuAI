-- =============================================================
-- Mwalimu AI — Fix learning_progress duplicate rows
-- Run in the Supabase SQL editor.
--
-- The app was calling upsert() without onConflict:'user_id,program_id',
-- so each lesson completion / assessment save INSERTED a new row instead
-- of updating the existing one.  This migration:
--   1. Keeps the most-recently-updated row per (user_id, program_id)
--   2. Deletes all older duplicates
-- =============================================================

-- ── 1. Deduplicate: keep the newest row per user+program ──────
-- Uses ctid (PostgreSQL's physical row identifier) so we don't need to
-- know the actual primary key column name of this table.
DELETE FROM public.learning_progress
WHERE ctid NOT IN (
  SELECT DISTINCT ON (user_id, program_id) ctid
  FROM public.learning_progress
  ORDER BY user_id, program_id, updated_at DESC NULLS LAST
);

-- ── 2. Confirm the UNIQUE constraint exists ───────────────────
-- (Already defined in 002_app_schema.sql; this is a safety net.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'learning_progress_user_id_program_id_key'
  ) THEN
    ALTER TABLE public.learning_progress
      ADD CONSTRAINT learning_progress_user_id_program_id_key
      UNIQUE (user_id, program_id);
  END IF;
END $$;
