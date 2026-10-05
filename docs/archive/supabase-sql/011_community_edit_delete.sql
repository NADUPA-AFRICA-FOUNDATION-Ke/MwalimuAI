-- =============================================================
-- Mwalimu AI — Community edit & delete (run in Supabase SQL editor)
-- Safe to run multiple times (idempotent).
--
-- Adds:
--  1. edited_at columns so posts/comments can show an "Edited" tag
--  2. UPDATE policy for comments: author-only, within 3 hours
--  3. Trigger guarding post content edits: author-only, within 3 hours
--     (the posts UPDATE policy must stay open to all signed-in users
--      because likes are stored on the post row; the trigger protects
--      title/content/category specifically)
-- =============================================================

-- ── 1. edited_at columns ───────────────────────────────────────
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;


-- ── 2. Comments: author can edit within 3 hours ────────────────
DROP POLICY IF EXISTS "comments_update_own" ON public.community_comments;
CREATE POLICY "comments_update_own" ON public.community_comments
  FOR UPDATE
  USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '3 hours')
  WITH CHECK (auth.uid() = user_id);


-- ── 3. Posts: guard content edits via trigger ──────────────────
CREATE OR REPLACE FUNCTION public.community_posts_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title    IS DISTINCT FROM OLD.title
     OR NEW.content  IS DISTINCT FROM OLD.content
     OR NEW.category IS DISTINCT FROM OLD.category THEN
    IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Only the author can edit this post';
    END IF;
    IF OLD.created_at < NOW() - INTERVAL '3 hours' THEN
      RAISE EXCEPTION 'Posts can only be edited within 3 hours of posting';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_guard ON public.community_posts;
CREATE TRIGGER community_posts_guard
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.community_posts_guard();


-- ── Verify ──────────────────────────────────────────────────────
-- Both should return a row:
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'edited_at';
SELECT policyname FROM pg_policies
WHERE tablename = 'community_comments' AND policyname = 'comments_update_own';
