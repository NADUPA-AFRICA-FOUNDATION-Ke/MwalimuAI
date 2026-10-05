-- =============================================================
-- Mwalimu AI — Security hardening (run in Supabase SQL editor)
-- Safe to run multiple times (idempotent).
--
--  1. certificates: stop full-table enumeration; verification goes
--     through an exact-match RPC instead of open SELECT
--  2. community_posts: likes can only be toggled for yourself via
--     RPC; the open UPDATE policy is tightened to owner-only
--  3. subscriptions: fulfillment table written by the Stripe
--     webhook (service role), readable only by the owner
-- =============================================================

-- ── 1. Certificates: exact-match verification only ─────────────
DROP POLICY IF EXISTS "certificates_select_public" ON public.certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(p_serial TEXT)
RETURNS TABLE (serial TEXT, program_title TEXT, teacher_name TEXT, earned_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.serial, c.program_title, c.teacher_name, c.earned_at
  FROM public.certificates c
  WHERE c.serial = UPPER(TRIM(p_serial))
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

-- Owners may still see their own certificate rows directly
DROP POLICY IF EXISTS "certificates_select_own" ON public.certificates;
CREATE POLICY "certificates_select_own" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);


-- ── 2. Post likes: toggle-your-own-like RPC ─────────────────────
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid TEXT;
  new_likes TEXT[];
BEGIN
  uid := auth.uid()::TEXT;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.community_posts
  SET likes = CASE
    WHEN likes @> ARRAY[uid] THEN array_remove(likes, uid)
    ELSE array_append(COALESCE(likes, '{}'), uid)
  END
  WHERE id = p_post_id
  RETURNING likes INTO new_likes;

  IF new_likes IS NULL AND NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  RETURN COALESCE(new_likes, '{}');
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated;

-- Tighten the previously-open UPDATE policy: likes now go through the RPC,
-- so direct UPDATE is owner-only (the edit-guard trigger still applies).
DROP POLICY IF EXISTS "posts_update_own" ON public.community_posts;
CREATE POLICY "posts_update_own" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── 3. Subscriptions: Stripe fulfillment records ────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'professional',
  status                 TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- No INSERT/UPDATE policies: only the service-role webhook writes here.

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions(stripe_subscription_id);

-- ── Verify ──────────────────────────────────────────────────────
SELECT proname FROM pg_proc WHERE proname IN ('verify_certificate', 'toggle_post_like');
SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('certificates', 'community_posts', 'subscriptions') ORDER BY tablename, cmd;
