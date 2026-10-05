-- =============================================================
-- Mwalimu AI — Verifiable certificates (run in Supabase SQL editor)
-- Safe to run multiple times (idempotent).
--
-- Adds a public certificate registry so any certificate can be
-- verified by its serial number at /verify, plus a serial column
-- on learning_progress for the owner's own cached copy.
-- =============================================================

ALTER TABLE public.learning_progress
  ADD COLUMN IF NOT EXISTS certificate_serial TEXT;

CREATE TABLE IF NOT EXISTS public.certificates (
  serial        TEXT        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id    TEXT        NOT NULL,
  program_title TEXT        NOT NULL DEFAULT '',
  teacher_name  TEXT        NOT NULL DEFAULT '',
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificates_select_public" ON public.certificates;
DROP POLICY IF EXISTS "certificates_insert_own"    ON public.certificates;

-- Certificates are public documents: anyone with a serial may verify it
-- (including anonymous visitors on the /verify page).
CREATE POLICY "certificates_select_public" ON public.certificates
  FOR SELECT USING (true);

CREATE POLICY "certificates_insert_own" ON public.certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);

-- ── Verify ──────────────────────────────────────────────────────
SELECT policyname FROM pg_policies WHERE tablename = 'certificates';
