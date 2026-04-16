-- ============================================================
-- Safety & Trust Features Migration
-- Deepfake detection, sexual-content auto-removal, blocked users,
-- user feedback, admin AI bot support, enhanced reports schema.
-- Run after 20260416_core_tables.sql
-- ============================================================

-- ── 1. Enhanced reports table ──────────────────────────────
-- Add category, severity, ai_analysis, auto_flagged to reports
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
