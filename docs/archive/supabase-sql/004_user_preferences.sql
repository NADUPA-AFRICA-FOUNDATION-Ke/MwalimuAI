-- =============================================================
-- Mwalimu AI — User Preferences Migration
-- Run in the Supabase SQL editor AFTER 003_missing_tables.sql.
-- Adds per-user preference columns to the profiles table so that
-- accessibility settings, bandwidth mode, notification state, and
-- sidebar layout sync across all devices.
-- =============================================================

-- ── Add preference columns to profiles ────────────────────────
-- All use safe ALTER TABLE … ADD COLUMN IF NOT EXISTS so the
-- migration is idempotent (safe to re-run).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS a11y_settings    JSONB    DEFAULT '{"textSize":"normal","highContrast":false,"reduceMotion":false,"dyslexiaFont":false,"wideSpacing":false}',
  ADD COLUMN IF NOT EXISTS low_bandwidth    BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notifications_state JSONB DEFAULT '{"read":[],"dismissed":[]}',
  ADD COLUMN IF NOT EXISTS sidebar_collapsed   BOOLEAN DEFAULT FALSE;

-- ── Ensure the upsert policy covers the new columns ───────────
-- profiles_update_own already exists (created in 002_app_schema.sql)
-- and applies to all columns on the row, so no new policy is needed.

-- ── Back-fill defaults for existing rows ──────────────────────
-- Rows created before this migration will have NULL for the new
-- columns.  Set them to the default values so reads are safe.
UPDATE public.profiles
SET
  a11y_settings     = COALESCE(a11y_settings,     '{"textSize":"normal","highContrast":false,"reduceMotion":false,"dyslexiaFont":false,"wideSpacing":false}'),
  low_bandwidth     = COALESCE(low_bandwidth,     FALSE),
  notifications_state = COALESCE(notifications_state, '{"read":[],"dismissed":[]}'),
  sidebar_collapsed   = COALESCE(sidebar_collapsed,   FALSE)
WHERE
  a11y_settings IS NULL
  OR low_bandwidth IS NULL
  OR notifications_state IS NULL
  OR sidebar_collapsed IS NULL;
