-- Migration: Add missing columns and fix schema inconsistencies
-- Run this in the Supabase SQL Editor

-- 1. Add onboarding_step to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'BasicInfo';

-- 2. Ensure profile_complete exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_complete') THEN
        ALTER TABLE public.users ADD COLUMN profile_complete BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Add age column to users (it was used in App.js log but might be missing in some versions)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS age INT;

-- 4. Create api_usage_logs table if it doesn't exist (used by aiResponderService)
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT NOT NULL,
    endpoint TEXT,
    tokens_used INT DEFAULT 0,
    response_time BIGINT,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Add RLS for api_usage_logs
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert logs" ON public.api_usage_logs;
CREATE POLICY "System can insert logs" ON public.api_usage_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view logs" ON public.api_usage_logs;
CREATE POLICY "Admins can view logs" ON public.api_usage_logs FOR SELECT USING (public.is_admin());
