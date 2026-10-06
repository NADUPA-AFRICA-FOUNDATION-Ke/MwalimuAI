-- =============================================================
-- Mwalimu AI — App Schema (run this in the Supabase SQL editor)
-- This is the authoritative schema that matches what the app code
-- actually reads and writes. Run AFTER (or instead of) 001_create_tables.sql.
-- =============================================================

-- ── 1. profiles ───────────────────────────────────────────────
-- Drop old table if it exists with the wrong column names,
-- then create it fresh with the columns the app uses.
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id         UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  school     TEXT,
  county     TEXT,
  subjects   TEXT[]  DEFAULT '{}',
  grades     TEXT[]  DEFAULT '{}',
  cbc_level  TEXT    DEFAULT 'beginner',
  lang       TEXT    DEFAULT 'en',
  completed  BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);


-- ── 2. activity_log ───────────────────────────────────────────
-- Streak / badge tracking. Upserted from lib/streak.ts.
CREATE TABLE IF NOT EXISTS public.activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  type       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, type)
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select_own"  ON public.activity_log;
DROP POLICY IF EXISTS "activity_insert_own"  ON public.activity_log;

CREATE POLICY "activity_select_own" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "activity_insert_own" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ── 3. tools_used ─────────────────────────────────────────────
-- Which Teacher Tools each user has used (badge tracking).
CREATE TABLE IF NOT EXISTS public.tools_used (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tool_id)
);

ALTER TABLE public.tools_used ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tools_select_own" ON public.tools_used;
DROP POLICY IF EXISTS "tools_insert_own" ON public.tools_used;

CREATE POLICY "tools_select_own" ON public.tools_used
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tools_insert_own" ON public.tools_used
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ── 4. learning_progress ──────────────────────────────────────
-- Per-user, per-program progress. Upserted from lib/learning-progress.ts.
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id            TEXT    NOT NULL,
  completed_lessons     TEXT[]  DEFAULT '{}',
  reflections           JSONB   DEFAULT '{}',
  pre_assessment        JSONB,
  post_assessment       JSONB,
  assignment            JSONB,
  certificate_earned_at TEXT,
  cohort_joined         BOOLEAN DEFAULT FALSE,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_own" ON public.learning_progress;
DROP POLICY IF EXISTS "progress_insert_own" ON public.learning_progress;
DROP POLICY IF EXISTS "progress_update_own" ON public.learning_progress;

CREATE POLICY "progress_select_own" ON public.learning_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "progress_insert_own" ON public.learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_update_own" ON public.learning_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- ── 5. Indexes for common queries ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id    ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_used_user_id      ON public.tools_used(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user  ON public.learning_progress(user_id);


-- ── 6. Auto-create profile row on signup ──────────────────────
-- Inserts a minimal profile row so the app can upsert to it immediately
-- after onboarding without a foreign-key violation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 7. ai_conversations ───────────────────────────────────────
-- AI Coach conversation threads. Managed by /dashboard/ai-coach.
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conv_select_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conv_insert_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conv_update_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conv_delete_own" ON public.ai_conversations;

CREATE POLICY "ai_conv_select_own" ON public.ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_conv_insert_own" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_conv_update_own" ON public.ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_conv_delete_own" ON public.ai_conversations
  FOR DELETE USING (auth.uid() = user_id);


-- ── 8. ai_messages ────────────────────────────────────────────
-- Individual messages within each AI Coach conversation.
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID  NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            TEXT  NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT  NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_msg_select_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_msg_insert_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_msg_delete_own" ON public.ai_messages;

CREATE POLICY "ai_msg_select_own" ON public.ai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "ai_msg_insert_own" ON public.ai_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "ai_msg_delete_own" ON public.ai_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );


-- ── 9. Indexes for AI chat ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_conv_user_id    ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_updated_at ON public.ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv_id     ON public.ai_messages(conversation_id);


-- ── 10. community_posts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_posts (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT    NOT NULL DEFAULT '',
  county      TEXT    NOT NULL DEFAULT '',
  category    TEXT    NOT NULL DEFAULT '',
  title       TEXT    NOT NULL DEFAULT '',
  content     TEXT    NOT NULL DEFAULT '',
  likes       TEXT[]  DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_all"    ON public.community_posts;
DROP POLICY IF EXISTS "posts_insert_own"    ON public.community_posts;
DROP POLICY IF EXISTS "posts_update_own"    ON public.community_posts;
DROP POLICY IF EXISTS "posts_delete_own"    ON public.community_posts;

-- Anyone logged in can read all posts
CREATE POLICY "posts_select_all" ON public.community_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "posts_insert_own" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow updating likes (any authenticated user) and full update by owner
CREATE POLICY "posts_update_own" ON public.community_posts
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "posts_delete_own" ON public.community_posts
  FOR DELETE USING (auth.uid() = user_id);


-- ── 11. community_comments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_comments (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID    NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all"  ON public.community_comments;
DROP POLICY IF EXISTS "comments_insert_own"  ON public.community_comments;
DROP POLICY IF EXISTS "comments_delete_own"  ON public.community_comments;

CREATE POLICY "comments_select_all" ON public.community_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "comments_insert_own" ON public.community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own" ON public.community_comments
  FOR DELETE USING (auth.uid() = user_id);


-- ── 12. Indexes for community ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id    ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments(post_id);
