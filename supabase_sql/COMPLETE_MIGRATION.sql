-- ============================================
-- FIXED COMPLETE MIGRATION - Suyavaraa App
-- ============================================
-- This migration fixes all SQL errors and inconsistencies
-- Run this ENTIRE file in Supabase SQL Editor

-- ============================================
-- PART 1: Admin & Core Functions (prerequisites)
-- ============================================

-- Create admin_users table first (referenced by is_admin function)
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

-- Unified is_admin() function (drop if exists to avoid conflict)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
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

-- ============================================
-- PART 2: Core User Tables
-- ============================================

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
  preferred_mode TEXT DEFAULT 'zone',
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'advisor',
  can_message BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (primary_user_id, member_user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can be accessed by owner" ON public.family_members;
CREATE POLICY "Family members can be accessed by owner"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (primary_user_id = auth.uid());

DROP POLICY IF EXISTS "Family members owner manage own membership" ON public.family_members;
CREATE POLICY "Family members owner manage own membership"
  ON public.family_members FOR ALL
  TO authenticated
  USING (primary_user_id = auth.uid())
  WITH CHECK (primary_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
CREATE POLICY "Users can view profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- FIX 2: Removed TO authenticated, added OR auth.uid() IS NULL for trigger context
DROP POLICY IF EXISTS "Users can insert own row" ON public.users;
CREATE POLICY "Users can insert own row"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Admins can manage users"
  ON public.users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- FIX 1: handle_new_user with SET search_path, user_profiles insert, and EXCEPTION block
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Extended user profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  primary_photo_url TEXT,
  additional_photos TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  religion TEXT,
  education TEXT,
  occupation TEXT,
  height_cm INT,
  mother_tongue TEXT,
  about TEXT,
  looking_for TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_profiles" ON public.user_profiles;
CREATE POLICY "Anyone can view user_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users manage own profile" ON public.user_profiles;
CREATE POLICY "Users manage own profile"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- FIX 3: Allow trigger to insert initial user_profiles row
DROP POLICY IF EXISTS "Trigger can insert initial profile" ON public.user_profiles;
CREATE POLICY "Trigger can insert initial profile"
  ON public.user_profiles FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NULL);

-- ============================================
-- PART 3: Dating/Matching Core Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('like', 'pass', 'superlike', 'block')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(actor_user_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_actions_actor ON public.user_actions(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_target ON public.user_actions(target_user_id);

ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own actions" ON public.user_actions;
CREATE POLICY "Users manage own actions"
  ON public.user_actions FOR ALL
  TO authenticated
  USING (auth.uid() = actor_user_id)
  WITH CHECK (auth.uid() = actor_user_id);

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches(user2_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
CREATE POLICY "Users can create matches"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','video','audio')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match participants can read messages" ON public.messages;
CREATE POLICY "Match participants can read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Match participants can send messages" ON public.messages;
CREATE POLICY "Match participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- ============================================
-- PART 4: Posts & Social Features
-- ============================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls TEXT[] DEFAULT '{}',
  tribe_tags TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','tribes','private')),
  is_removed BOOLEAN DEFAULT FALSE,
  removal_reason TEXT,
  removal_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public posts" ON public.posts;
CREATE POLICY "Anyone can view public posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (
    (visibility = 'public' AND is_removed = FALSE)
    OR auth.uid() = user_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users manage own posts" ON public.posts;
CREATE POLICY "Users manage own posts"
  ON public.posts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
CREATE POLICY "Anyone can view reactions"
  ON public.post_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users manage own reactions" ON public.post_reactions;
CREATE POLICY "Users manage own reactions"
  ON public.post_reactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 5: Tribes System
-- ============================================

CREATE TABLE IF NOT EXISTS public.tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  icon_url TEXT,
  category TEXT,
  member_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

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
  ('spiritual-matrimony', 'Spiritual Matrimony', 'Religious, meditative, and community-oriented', '🕉️', 'matrimony', 0),
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

-- ============================================
-- PART 6: Fish Trap System
-- ============================================

CREATE TABLE IF NOT EXISTS public.decoy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  bio TEXT,
  profile_photo_url TEXT,
  persona_name TEXT,
  persona_age INT,
  persona_gender VARCHAR(50),
  persona_city VARCHAR(100),
  persona_bio TEXT,
  persona_occupation TEXT,
  tribe_id UUID REFERENCES public.tribes(id),
  is_active BOOLEAN DEFAULT true,
  characteristics JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_request_sent_at TIMESTAMP,
  request_send_interval INT DEFAULT 172800
);

CREATE TABLE IF NOT EXISTS public.fish_trap_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decoy_id UUID NOT NULL REFERENCES public.decoy_profiles(id) ON DELETE CASCADE,
  request_id UUID UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  behavior_flags JSONB DEFAULT '[]',
  red_flag_count INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, decoy_id)
);

CREATE TABLE IF NOT EXISTS public.fish_trap_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES public.fish_trap_interactions(id) ON DELETE CASCADE,
  conversation_id UUID,
  sender_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  decoy_id UUID REFERENCES public.decoy_profiles(id),
  content TEXT NOT NULL,
  displayed_content TEXT,
  contains_contact_info BOOLEAN DEFAULT false,
  contact_info_type VARCHAR(50),
  red_flags JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_user ON public.fish_trap_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_decoy ON public.fish_trap_interactions(decoy_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_interaction ON public.fish_trap_messages(interaction_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_conversation ON public.fish_trap_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_created ON public.fish_trap_messages(created_at);

ALTER TABLE public.decoy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_trap_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_trap_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active decoy profiles" ON public.decoy_profiles;
CREATE POLICY "Users can view active decoy profiles"
  ON public.decoy_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage decoy profiles" ON public.decoy_profiles;
CREATE POLICY "Admins can manage decoy profiles"
  ON public.decoy_profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can manage their fish trap interactions" ON public.fish_trap_interactions;
CREATE POLICY "Users can manage their fish trap interactions"
  ON public.fish_trap_interactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view fish trap interactions" ON public.fish_trap_interactions;
CREATE POLICY "Admins can view fish trap interactions"
  ON public.fish_trap_interactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view their fish trap messages" ON public.fish_trap_messages;
CREATE POLICY "Users can view their fish trap messages"
  ON public.fish_trap_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.fish_trap_interactions i
      WHERE (i.id = public.fish_trap_messages.interaction_id OR i.id = public.fish_trap_messages.conversation_id)
        AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their fish trap messages" ON public.fish_trap_messages;
CREATE POLICY "Users can insert their fish trap messages"
  ON public.fish_trap_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.fish_trap_interactions i
      WHERE (i.id = public.fish_trap_messages.interaction_id OR i.id = public.fish_trap_messages.conversation_id)
        AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view fish trap messages" ON public.fish_trap_messages;
CREATE POLICY "Admins can view fish trap messages"
  ON public.fish_trap_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- FIX 4: update_updated_at_column with SET search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_fish_trap_interactions_updated_at ON public.fish_trap_interactions;
CREATE TRIGGER update_fish_trap_interactions_updated_at
    BEFORE UPDATE ON public.fish_trap_interactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PART 7: Verification System
-- ============================================

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can view their own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can insert their own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

CREATE TABLE IF NOT EXISTS public.contact_info_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID,
  detected_content TEXT,
  contact_type TEXT,
  attempt_count INT DEFAULT 1,
  action_taken TEXT DEFAULT 'monitor',
  is_suspicious BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.contact_info_logs ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- PART 8: Safety & Moderation System
-- ============================================

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
  category TEXT DEFAULT 'general'
    CHECK (category IN ('spam','sexual_content','harassment','deepfake','scam','violence','hate_speech','general')),
  severity TEXT DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  ai_analysis TEXT,
  auto_flagged BOOLEAN DEFAULT FALSE,
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

CREATE OR REPLACE FUNCTION public.is_blocked_by(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = target_user_id
      AND blocked_id = auth.uid()
  );
$$;

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  endpoint TEXT,
  tokens_used INT DEFAULT 0,
  response_time BIGINT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view api logs" ON public.api_usage_logs;
CREATE POLICY "Admins view api logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service can insert api logs" ON public.api_usage_logs;
CREATE POLICY "Service can insert api logs"
  ON public.api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- PART 9: Notification System
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON public.notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_active ON public.notification_tokens(is_active, user_id);

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their notification tokens" ON public.notification_tokens;
CREATE POLICY "Users can manage their notification tokens"
  ON public.notification_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- FIX 5: update_notification_tokens_timestamp with SET search_path
CREATE OR REPLACE FUNCTION public.update_notification_tokens_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_notification_tokens_timestamp ON public.notification_tokens;
CREATE TRIGGER trigger_update_notification_tokens_timestamp
  BEFORE UPDATE ON public.notification_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_notification_tokens_timestamp();

-- ============================================
-- PART 10: Suyamvaram System
-- ============================================

CREATE TABLE IF NOT EXISTS public.suyamvaram_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  max_participants INTEGER DEFAULT 50,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  reward TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  participant_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.suyamvaram_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.suyamvaram_challenges;
CREATE POLICY "Anyone can view active challenges"
  ON public.suyamvaram_challenges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create challenges" ON public.suyamvaram_challenges;
CREATE POLICY "Users can create challenges"
  ON public.suyamvaram_challenges FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their own challenges" ON public.suyamvaram_challenges;
CREATE POLICY "Creators can update their own challenges"
  ON public.suyamvaram_challenges FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS public.suyamvaram_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.suyamvaram_challenges(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, applicant_id)
);

ALTER TABLE public.suyamvaram_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own applications or applications to their challenges" ON public.suyamvaram_applications;
CREATE POLICY "Users can view their own applications or applications to their challenges"
  ON public.suyamvaram_applications FOR SELECT
  USING (
    auth.uid() = applicant_id
    OR
    auth.uid() IN (SELECT creator_id FROM public.suyamvaram_challenges WHERE id = challenge_id)
  );

DROP POLICY IF EXISTS "Users can apply to challenges" ON public.suyamvaram_applications;
CREATE POLICY "Users can apply to challenges"
  ON public.suyamvaram_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Creators can update application status" ON public.suyamvaram_applications;
CREATE POLICY "Creators can update application status"
  ON public.suyamvaram_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT creator_id FROM public.suyamvaram_challenges WHERE id = challenge_id));

CREATE OR REPLACE FUNCTION public.sync_suyamvaram_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.suyamvaram_challenges
  SET participant_count = (
    SELECT COUNT(*) FROM public.suyamvaram_applications
    WHERE challenge_id = COALESCE(NEW.challenge_id, OLD.challenge_id)
      AND status = 'accepted'
  )
  WHERE id = COALESCE(NEW.challenge_id, OLD.challenge_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_participant_count ON public.suyamvaram_applications;
CREATE TRIGGER trg_sync_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON public.suyamvaram_applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_suyamvaram_participant_count();

-- ============================================
-- PART 11: Seed Data
-- ============================================

INSERT INTO public.decoy_profiles (
  name, age, gender, city, bio, profile_photo_url, characteristics,
  persona_name, persona_age, persona_gender, persona_city, persona_bio, persona_occupation, is_active
)
VALUES
('Priya Sharma', 26, 'female', 'Mumbai', 'Software engineer by day, food blogger by night. Love exploring new restaurants and trying exotic cuisines. Looking for someone who appreciates good conversation and adventure.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=60', '{"personality": "professional", "red_flag_triggers": ["money_mention", "rush_relationship"]}', 'Priya Sharma', 26, 'female', 'Mumbai', 'Software engineer by day, food blogger by night.', 'Software Engineer', true),
('Arjun Patel', 29, 'male', 'Delhi', 'Entrepreneur building my dream startup. Love traveling, hiking, and deep conversations about life. Seeking a partner who shares my ambition and values.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=60', '{"personality": "ambitious", "red_flag_triggers": ["investment_opportunity", "business_venture"]}', 'Arjun Patel', 29, 'male', 'Delhi', 'Entrepreneur building my dream startup.', 'Entrepreneur', true),
('Sneha Gupta', 24, 'female', 'Bangalore', 'UX Designer with a passion for creating beautiful digital experiences. Coffee addict, book lover, and weekend hiker.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=60', '{"personality": "creative", "red_flag_triggers": ["contact_exchange", "meet_immediately"]}', 'Sneha Gupta', 24, 'female', 'Bangalore', 'UX Designer with a passion for creating beautiful digital experiences.', 'UX Designer', true),
('Rohan Singh', 31, 'male', 'Chennai', 'Doctor working in emergency medicine. Long shifts but love helping people.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=60', '{"personality": "caring", "red_flag_triggers": ["emergency_money", "family_emergency"]}', 'Rohan Singh', 31, 'male', 'Chennai', 'Doctor working in emergency medicine.', 'Doctor', true),
('Ananya Reddy', 27, 'female', 'Hyderabad', 'Marketing manager who loves planning events and bringing people together. Fitness enthusiast, yoga practitioner, and amateur photographer.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=60', '{"personality": "social", "red_flag_triggers": ["gift_sending", "expensive_gifts"]}', 'Ananya Reddy', 27, 'female', 'Hyderabad', 'Marketing manager who loves planning events.', 'Marketing Manager', true),
('Vikram Kumar', 28, 'male', 'Pune', 'Data scientist fascinated by AI and machine learning. Love solving complex problems and teaching others.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=60', '{"personality": "intellectual", "red_flag_triggers": ["crypto_investment", "tech_startup"]}', 'Vikram Kumar', 28, 'male', 'Pune', 'Data scientist fascinated by AI and machine learning.', 'Data Scientist', true),
('Kavya Menon', 25, 'female', 'Kochi', 'Journalist covering social issues and human stories. Passionate about making a difference.', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=60', '{"personality": "activist", "red_flag_triggers": ["charity_scam", "donation_request"]}', 'Kavya Menon', 25, 'female', 'Kochi', 'Journalist covering social issues.', 'Journalist', true),
('Aditya Joshi', 30, 'male', 'Ahmedabad', 'Architect designing sustainable buildings for the future. Love sustainable living, organic farming, and eco-friendly travel.', 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=500&q=60', '{"personality": "environmentalist", "red_flag_triggers": ["property_investment", "real_estate"]}', 'Aditya Joshi', 30, 'male', 'Ahmedabad', 'Architect designing sustainable buildings.', 'Architect', true),
('Meera Iyer', 26, 'female', 'Chennai', 'Classical dancer and teacher. Expressing emotions through movement and music.', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&q=60', '{"personality": "artistic", "red_flag_triggers": ["spiritual_scam", "guru_disciple"]}', 'Meera Iyer', 26, 'female', 'Chennai', 'Classical dancer and teacher.', 'Classical Dancer', true),
('Rahul Verma', 32, 'male', 'Jaipur', 'Hotel manager overseeing luxury properties. Love fine dining, wine tasting, and cultural experiences.', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&q=60', '{"personality": "luxury", "red_flag_triggers": ["expensive_dates", "luxury_lifestyle"]}', 'Rahul Verma', 32, 'male', 'Jaipur', 'Hotel manager overseeing luxury properties.', 'Hotel Manager', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 12: Migration Data Fixes
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fish_trap_messages'
      AND column_name = 'conversation_id'
  ) THEN
    UPDATE public.fish_trap_messages
    SET interaction_id = conversation_id
    WHERE interaction_id IS NULL AND conversation_id IS NOT NULL;
    RAISE NOTICE 'Migrated conversation_id to interaction_id for fish_trap_messages';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Run verification queries to confirm.';
END $$;

/*
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN
('users', 'user_profiles', 'user_actions', 'matches', 'messages',
 'posts', 'post_reactions', 'tribes', 'user_tribes',
 'decoy_profiles', 'fish_trap_interactions', 'fish_trap_messages',
 'notification_tokens', 'verification_requests', 'contact_info_logs',
 'reports', 'user_blocks', 'user_feedback', 'deepfake_scans',
 'content_auto_removals', 'admin_activity_log', 'api_usage_logs',
 'suyamvaram_challenges', 'suyamvaram_applications', 'admin_users')
ORDER BY table_name;

SELECT COUNT(*) as decoy_count FROM public.decoy_profiles;
SELECT public.is_admin();
*/
