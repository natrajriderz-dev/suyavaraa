-- ============================================
-- FIX CRITICAL SQL ERRORS
-- ============================================
-- Run this in Supabase SQL Editor to fix immediate errors
-- Safe to run multiple times (idempotent)

-- ============================================
-- 1. FIX: trust_and_verification.sql RLS policy error
-- ============================================
-- The original policy uses wrong admin check
DROP POLICY IF EXISTS "Admins can view all logs" ON public.contact_info_logs;

CREATE POLICY "Admins can view all logs"
  ON public.contact_info_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 2. FIX: fish_trap_schema.sql RLS policy error
-- ============================================
-- Fix RLS policies that use auth.jwt() incorrectly
DROP POLICY IF EXISTS "Admin only access to decoy profiles" ON public.decoy_profiles;
DROP POLICY IF EXISTS "Admin only access to fish trap interactions" ON public.fish_trap_interactions;
DROP POLICY IF EXISTS "Admin only access to fish trap messages" ON public.fish_trap_messages;

-- Create unified is_admin() function if not exists
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

-- Apply correct RLS policies
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

-- ============================================
-- 3. FIX: Column mismatch between seed data and table definition
-- ============================================
-- Add missing columns to decoy_profiles for seed data compatibility
ALTER TABLE public.decoy_profiles 
  ADD COLUMN IF NOT EXISTS persona_name TEXT,
  ADD COLUMN IF NOT EXISTS persona_age INT,
  ADD COLUMN IF NOT EXISTS persona_gender VARCHAR(50),
  ADD COLUMN IF NOT EXISTS persona_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS persona_bio TEXT,
  ADD COLUMN IF NOT EXISTS persona_occupation TEXT,
  ADD COLUMN IF NOT EXISTS characteristics JSONB;

-- Copy data from old columns to new columns if needed
UPDATE public.decoy_profiles 
SET 
  persona_name = COALESCE(persona_name, name),
  persona_age = COALESCE(persona_age, age),
  persona_gender = COALESCE(persona_gender, gender),
  persona_city = COALESCE(persona_city, city),
  persona_bio = COALESCE(persona_bio, bio)
WHERE persona_name IS NULL;

-- ============================================
-- 4. FIX: interaction_id vs conversation_id confusion
-- ============================================
-- Add conversation_id column if it doesn't exist (for backward compatibility)
ALTER TABLE public.fish_trap_messages 
  ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Add interaction_id column if it doesn't exist
ALTER TABLE public.fish_trap_messages 
  ADD COLUMN IF NOT EXISTS interaction_id UUID REFERENCES public.fish_trap_interactions(id) ON DELETE CASCADE;

-- Copy conversation_id to interaction_id if interaction_id is NULL
UPDATE public.fish_trap_messages
SET interaction_id = conversation_id
WHERE interaction_id IS NULL AND conversation_id IS NOT NULL;

-- Create index for conversation_id if needed
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_conversation 
ON public.fish_trap_messages(conversation_id);

-- ============================================
-- 5. FIX: Ensure admin_users table exists
-- ============================================
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

-- ============================================
-- 6. FIX: Ensure users table has all required columns
-- ============================================
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 7. FIX: Ensure notification_tokens table exists with correct schema
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

-- ============================================
-- 8. FIX: Ensure verification_requests table exists
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

-- ============================================
-- 9. FIX: Ensure contact_info_logs has all columns
-- ============================================
ALTER TABLE public.contact_info_logs
  ADD COLUMN IF NOT EXISTS contact_type TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS action_taken TEXT DEFAULT 'monitor',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 10. FIX: Ensure all required indexes exist
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_user ON public.fish_trap_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_decoy ON public.fish_trap_interactions(decoy_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_interaction ON public.fish_trap_messages(interaction_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_created ON public.fish_trap_messages(created_at);

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Critical errors fixed successfully!';
  RAISE NOTICE 'Check these common issues:';
  RAISE NOTICE '1. Admin check should now work via public.is_admin()';
  RAISE NOTICE '2. Fish trap tables have both interaction_id and conversation_id for compatibility';
  RAISE NOTICE '3. Decoy profiles have both old and new column names';
  RAISE NOTICE '4. All required tables and indexes created';
END $$;

-- Quick test query (should not error)
SELECT 
  (SELECT COUNT(*) FROM public.decoy_profiles WHERE is_active = true) as active_decoys,
  (SELECT public.is_admin()) as is_admin_check,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'fish_trap_messages' AND column_name IN ('interaction_id', 'conversation_id')) as fish_trap_columns;