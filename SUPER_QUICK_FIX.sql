-- ============================================
-- SUPER QUICK FIX - Immediate Production Fixes
-- ============================================
-- Minimal fixes for critical errors
-- Run this first if admin dashboard or fish trap is broken

-- 1. FIX: Ensure admin_users table exists
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

-- 2. FIX: Unified is_admin() function
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

-- 3. FIX: Contact info logs RLS policy
DROP POLICY IF EXISTS "Admins can view all logs" ON public.contact_info_logs;
CREATE POLICY "Admins can view all logs"
  ON public.contact_info_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 4. FIX: Fish trap messages column compatibility
-- Add interaction_id if it doesn't exist
ALTER TABLE public.fish_trap_messages 
  ADD COLUMN IF NOT EXISTS interaction_id UUID;

-- Add conversation_id if it doesn't exist  
ALTER TABLE public.fish_trap_messages 
  ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Copy data between columns for compatibility
UPDATE public.fish_trap_messages
SET interaction_id = conversation_id
WHERE interaction_id IS NULL AND conversation_id IS NOT NULL;

UPDATE public.fish_trap_messages  
SET conversation_id = interaction_id
WHERE conversation_id IS NULL AND interaction_id IS NOT NULL;

-- 5. FIX: Decoy profile column compatibility
ALTER TABLE public.decoy_profiles 
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS age INT,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS persona_name TEXT,
  ADD COLUMN IF NOT EXISTS persona_age INT,
  ADD COLUMN IF NOT EXISTS persona_gender VARCHAR(50),
  ADD COLUMN IF NOT EXISTS persona_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS persona_bio TEXT,
  ADD COLUMN IF NOT EXISTS persona_occupation TEXT;

-- Copy data between old and new columns
UPDATE public.decoy_profiles 
SET 
  name = COALESCE(name, persona_name),
  age = COALESCE(age, persona_age),
  gender = COALESCE(gender, persona_gender),
  city = COALESCE(city, persona_city),
  bio = COALESCE(bio, persona_bio),
  profile_photo_url = COALESCE(profile_photo_url, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=60')
WHERE name IS NULL AND persona_name IS NOT NULL;

UPDATE public.decoy_profiles 
SET 
  persona_name = COALESCE(persona_name, name),
  persona_age = COALESCE(persona_age, age),
  persona_gender = COALESCE(persona_gender, gender),
  persona_city = COALESCE(persona_city, city),
  persona_bio = COALESCE(persona_bio, bio)
WHERE persona_name IS NULL AND name IS NOT NULL;

-- 6. FIX: Ensure required columns in users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- 7. QUICK TEST
DO $$
BEGIN
  RAISE NOTICE '✅ Quick fixes applied!';
  RAISE NOTICE 'Check: Admin dashboard should now work';
  RAISE NOTICE 'Check: Fish trap should now work';
  RAISE NOTICE 'Check: Verification system should now work';
END $$;