-- ============================================
-- Suyavaraa Trust & Verification Schema
-- ============================================

-- 1. Add Trust & Verification columns to users/profiles
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Policies for verification_requests
DROP POLICY IF EXISTS "Users can view their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can view their own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own verification requests" ON public.verification_requests;
CREATE POLICY "Users can insert their own verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Create contact_info_logs if not exists (referenced by trustScoreService)
CREATE TABLE IF NOT EXISTS public.contact_info_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID,
  detected_content TEXT,
  is_suspicious BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for contact_info_logs
ALTER TABLE public.contact_info_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all logs" ON public.contact_info_logs;
CREATE POLICY "Admins can view all logs"
  ON public.contact_info_logs FOR SELECT
  USING (public.is_admin());
