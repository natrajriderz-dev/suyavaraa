-- ============================================
-- Workflow + Admin Backend Alignment
-- ============================================

-- Admin lookup table used by browser-safe admin RLS checks.
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

-- Shared helper for admin-only policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Reports table is referenced by moderationService but was missing.
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
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Bring contact_info_logs schema in line with the service code.
ALTER TABLE public.contact_info_logs
  ADD COLUMN IF NOT EXISTS contact_type TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS action_taken TEXT DEFAULT 'monitor',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Admins can view all logs" ON public.contact_info_logs;
CREATE POLICY "Admins can view all logs"
  ON public.contact_info_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own contact logs" ON public.contact_info_logs;
CREATE POLICY "Users can insert their own contact logs"
  ON public.contact_info_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own contact logs" ON public.contact_info_logs;
CREATE POLICY "Users can view their own contact logs"
  ON public.contact_info_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update contact logs" ON public.contact_info_logs;
CREATE POLICY "Admins can update contact logs"
  ON public.contact_info_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins need access to the verification queue from the browser dashboard.
DROP POLICY IF EXISTS "Admins can view verification requests" ON public.verification_requests;
CREATE POLICY "Admins can view verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests"
  ON public.verification_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Make tribes usable across onboarding + discovery flows.
CREATE TABLE IF NOT EXISTS public.tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.tribes
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS member_count INT DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS tribes_slug_key ON public.tribes(slug);

INSERT INTO public.tribes (slug, name, description, icon, category, member_count)
VALUES
  ('adventure-seekers', 'Adventure Seekers', 'Love hiking, travel, and outdoor activities', '🏔️', 'dating', 0),
  ('foodies', 'Foodies', 'Passionate about cooking, dining, and cuisine', '🍜', 'dating', 0),
  ('fitness-freaks', 'Fitness Freaks', 'Gym, yoga, sports, and healthy living', '💪', 'dating', 0),
  ('book-worms', 'Book Worms', 'Avid readers and literature enthusiasts', '📚', 'dating', 0),
  ('art-culture', 'Art & Culture', 'Museums, galleries, and creative expression', '🎨', 'dating', 0),
  ('tech-geeks', 'Tech Geeks', 'Coding, gadgets, and digital innovation', '💻', 'dating', 0),
  ('music-lovers', 'Music Lovers', 'Concerts, festivals, and all genres', '🎵', 'dating', 0),
  ('spiritual-dating', 'Spiritual', 'Meditation, mindfulness, and inner peace', '🧘', 'dating', 0),
  ('traditional', 'Traditional', 'Value customs, family traditions, and cultural practices', '🏛️', 'matrimony', 0),
  ('modern', 'Modern', 'Progressive outlook, career-focused, urban lifestyle', '🌟', 'matrimony', 0),
  ('spiritual-matrimony', 'Spiritual (Matrimony)', 'Religious, meditative, and community-oriented', '🕉️', 'matrimony', 0),
  ('academic', 'Academic', 'Education-focused, intellectual, research-minded', '🎓', 'matrimony', 0),
  ('creative', 'Creative', 'Artistic, innovative, and expressive', '🎭', 'matrimony', 0),
  ('adventurous', 'Adventurous', 'Risk-takers, explorers, and thrill-seekers', '🧗', 'matrimony', 0),
  ('homely', 'Homely', 'Family-oriented, nurturing, and domestic', '🏠', 'matrimony', 0),
  ('cosmopolitan', 'Cosmopolitan', 'Global citizens, multilingual, well-traveled', '🌆', 'matrimony', 0)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category;

-- Persist user's chosen tribes/zones.
CREATE TABLE IF NOT EXISTS public.user_tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tribe_id UUID NOT NULL REFERENCES public.tribes(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tribe_id)
);

ALTER TABLE public.user_tribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tribes" ON public.user_tribes;
CREATE POLICY "Users can view their own tribes"
  ON public.user_tribes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tribes" ON public.user_tribes;
CREATE POLICY "Users can insert their own tribes"
  ON public.user_tribes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tribes" ON public.user_tribes;
CREATE POLICY "Users can delete their own tribes"
  ON public.user_tribes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all user tribes" ON public.user_tribes;
CREATE POLICY "Admins can view all user tribes"
  ON public.user_tribes FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Align Fish Trap message schema with the service implementation.
ALTER TABLE public.fish_trap_messages
  ADD COLUMN IF NOT EXISTS interaction_id UUID REFERENCES public.fish_trap_interactions(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fish_trap_messages'
      AND column_name = 'conversation_id'
  ) THEN
    EXECUTE '
      UPDATE public.fish_trap_messages
      SET interaction_id = conversation_id
      WHERE interaction_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.fish_trap_interactions i
          WHERE i.id = public.fish_trap_messages.conversation_id
        )
    ';
  END IF;
END $$;

-- Replace overly restrictive admin-only fish trap policies with user/admin-safe ones.
DROP POLICY IF EXISTS "Admin only access to decoy profiles" ON public.decoy_profiles;
DROP POLICY IF EXISTS "Admin only access to fish trap interactions" ON public.fish_trap_interactions;
DROP POLICY IF EXISTS "Admin only access to fish trap messages" ON public.fish_trap_messages;
DROP POLICY IF EXISTS "Users can view active decoy profiles" ON public.decoy_profiles;
DROP POLICY IF EXISTS "Admins can manage decoy profiles" ON public.decoy_profiles;
DROP POLICY IF EXISTS "Users can manage their fish trap interactions" ON public.fish_trap_interactions;
DROP POLICY IF EXISTS "Admins can view fish trap interactions" ON public.fish_trap_interactions;
DROP POLICY IF EXISTS "Users can view their fish trap messages" ON public.fish_trap_messages;
DROP POLICY IF EXISTS "Users can insert their fish trap messages" ON public.fish_trap_messages;
DROP POLICY IF EXISTS "Admins can view fish trap messages" ON public.fish_trap_messages;

CREATE POLICY "Users can view active decoy profiles"
  ON public.decoy_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage decoy profiles"
  ON public.decoy_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can manage their fish trap interactions"
  ON public.fish_trap_interactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view fish trap interactions"
  ON public.fish_trap_interactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can view their fish trap messages"
  ON public.fish_trap_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.fish_trap_interactions i
      WHERE i.id = public.fish_trap_messages.interaction_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their fish trap messages"
  ON public.fish_trap_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.fish_trap_interactions i
      WHERE i.id = public.fish_trap_messages.interaction_id
        AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view fish trap messages"
  ON public.fish_trap_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());
