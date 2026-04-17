-- ============================================================
-- Safety & Trust Features Migration
-- Deepfake detection, sexual-content auto-removal, blocked users,
-- user feedback, admin AI bot support, enhanced reports schema.
-- Self-contained: creates all dependencies if they don't exist.
-- ============================================================

-- ── 0. Admin prerequisites (idempotent) ───────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view their own admin record" ON public.admin_users;
CREATE POLICY "Admins can view their own admin record"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- ── 0b. Core tables (idempotent) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  city TEXT,
  bio TEXT,
  profile_complete BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  trust_score INT DEFAULT 50,
  trust_level TEXT DEFAULT 'unverified',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
CREATE POLICY "Users can view profiles"
  ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own row" ON public.users;
CREATE POLICY "Users can insert own row"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Admins can manage users"
  ON public.users FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls TEXT[] DEFAULT '{}',
  tribe_tags TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','tribes','private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own posts" ON public.posts;
CREATE POLICY "Users manage own posts"
  ON public.posts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 1. Enhanced reports table ──────────────────────────────
-- Create reports if it doesn't exist yet (idempotent – safe to run after 20260415 too)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;
CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add new columns (idempotent)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
    CHECK (category IN ('spam','sexual_content','harassment','deepfake','scam','violence','hate_speech','general')),
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
  ADD COLUMN IF NOT EXISTS auto_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- ── 2. user_blocks table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own blocks" ON public.user_blocks;
CREATE POLICY "Users manage own blocks"
  ON public.user_blocks FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Admins view all blocks" ON public.user_blocks;
CREATE POLICY "Admins view all blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── 3. user_feedback table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'general'
    CHECK (category IN ('bug','feature_request','general','safety_concern','appreciation')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','reviewed','closed')),
  admin_reply TEXT,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.user_feedback(status);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users submit feedback" ON public.user_feedback;
CREATE POLICY "Users submit feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own feedback" ON public.user_feedback;
CREATE POLICY "Users view own feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage feedback" ON public.user_feedback;
CREATE POLICY "Admins manage feedback"
  ON public.user_feedback FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 4. deepfake_scans table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deepfake_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  scan_type TEXT DEFAULT 'profile_photo'
    CHECK (scan_type IN ('profile_photo','post_image','verification_photo')),
  result TEXT DEFAULT 'pending'
    CHECK (result IN ('pending','clean','suspicious','deepfake','nsfw','error')),
  confidence_score FLOAT,
  ai_reasoning TEXT,
  action_taken TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deepfake_user ON public.deepfake_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_deepfake_result ON public.deepfake_scans(result);
CREATE INDEX IF NOT EXISTS idx_deepfake_scanned_at ON public.deepfake_scans(scanned_at DESC);

ALTER TABLE public.deepfake_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view deepfake scans" ON public.deepfake_scans;
CREATE POLICY "Admins view deepfake scans"
  ON public.deepfake_scans FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "System insert scans" ON public.deepfake_scans;
CREATE POLICY "System insert scans"
  ON public.deepfake_scans FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 5. content_auto_removals ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_auto_removals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post','message','comment','profile_photo')),
  content_id UUID,
  content_preview TEXT,
  removal_reason TEXT NOT NULL,
  category TEXT NOT NULL,
  ai_confidence FLOAT,
  removed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reinstated_at TIMESTAMP WITH TIME ZONE,
  reinstated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_removals_user ON public.content_auto_removals(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_removals_removed ON public.content_auto_removals(removed_at DESC);

ALTER TABLE public.content_auto_removals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage auto removals" ON public.content_auto_removals;
CREATE POLICY "Admins manage auto removals"
  ON public.content_auto_removals FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "System insert auto removals" ON public.content_auto_removals;
CREATE POLICY "System insert auto removals"
  ON public.content_auto_removals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 6. Posts: add auto-removal columns ─────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS removal_reason TEXT,
  ADD COLUMN IF NOT EXISTS removal_category TEXT;

-- Posts query should filter is_removed = false for normal users
DROP POLICY IF EXISTS "Anyone can view public posts" ON public.posts;
CREATE POLICY "Anyone can view public posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (
    (visibility = 'public' AND is_removed = FALSE)
    OR auth.uid() = user_id
    OR public.is_admin()
  );

-- ── 7. admin_activity_log ──────────────────────────────────
-- Audit log for admin actions (ban, verify, remove content, etc.)
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON public.admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON public.admin_activity_log(created_at DESC);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view activity log" ON public.admin_activity_log;
CREATE POLICY "Admins view activity log"
  ON public.admin_activity_log FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "System insert activity log" ON public.admin_activity_log;
CREATE POLICY "System insert activity log"
  ON public.admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 8. Helper: is user blocked by target? ──────────────────
CREATE OR REPLACE FUNCTION public.is_blocked_by(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = target_user_id
      AND blocked_id = auth.uid()
  );
$$;
