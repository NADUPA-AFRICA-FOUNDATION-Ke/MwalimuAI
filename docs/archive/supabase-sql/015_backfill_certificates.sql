-- =============================================================
-- Mwalimu AI — Backfill the certificate verification registry
-- Run in the Supabase SQL editor. Safe to run multiple times.
--
-- Some certificates were issued (a serial is printed on them and stored
-- in learning_progress.certificate_serial) before the public `certificates`
-- registry existed, or their registration write was lost, or the registry
-- holds a STALE serial that diverged from the one on the certificate (the
-- serial can differ if a second device generated one before syncing).
-- Any of these make /verify return "not found" for the printed serial.
--
-- The certificate the teacher holds always shows learning_progress
-- .certificate_serial, so that is the source of truth. We upsert on
-- (user_id, program_id) and set the registry serial to match it, also
-- filling any blank title/name. The app re-registers on login to stay
-- current going forward.
-- =============================================================

INSERT INTO public.certificates (serial, user_id, program_id, program_title, teacher_name, earned_at)
SELECT
  lp.certificate_serial,
  lp.user_id,
  lp.program_id,
  CASE lp.program_id
    WHEN 'cbc-foundations'        THEN 'CBC Foundations'
    WHEN 'assessment-for-learning' THEN 'Assessment for Learning'
    WHEN 'inclusive-education'    THEN 'Inclusive Education'
    WHEN 'stem-integration'       THEN 'STEM Integration'
    WHEN 'teacher-wellbeing'      THEN 'Teacher Wellbeing & Resilience'
    WHEN 'ai-empowered-educator'  THEN 'The AI-Empowered Educator'
    WHEN 'language-teaching'      THEN 'Language Teaching in CBC'
    WHEN 'school-leadership'      THEN 'School Leadership & Management'
    WHEN 'humanities-integration' THEN 'Humanities & Social Studies'
    ELSE ''
  END AS program_title,
  COALESCE(NULLIF(p.name, ''), 'Teacher') AS teacher_name,
  COALESCE(lp.updated_at, NOW())          AS earned_at
FROM public.learning_progress lp
LEFT JOIN public.profiles p ON p.id = lp.user_id
WHERE lp.certificate_serial IS NOT NULL
  AND lp.certificate_serial <> ''
ON CONFLICT (user_id, program_id) DO UPDATE SET
  -- Point the registry at the serial actually printed on the certificate
  serial        = EXCLUDED.serial,
  -- Fill blanks without clobbering good existing data
  program_title = COALESCE(NULLIF(public.certificates.program_title, ''), EXCLUDED.program_title),
  teacher_name  = COALESCE(NULLIF(public.certificates.teacher_name, ''),  EXCLUDED.teacher_name);

-- ── Verify ──────────────────────────────────────────────────────
-- Should return 0: every printed serial now has a matching registry row.
SELECT COUNT(*) AS unverifiable_serials
FROM public.learning_progress lp
WHERE lp.certificate_serial IS NOT NULL
  AND lp.certificate_serial <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.certificates c WHERE c.serial = lp.certificate_serial
  );
