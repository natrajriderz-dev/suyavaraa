-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'BasicInfo';

-- Ensure profile_complete exists (it should, but just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profile_complete') THEN
        ALTER TABLE public.users ADD COLUMN profile_complete BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
