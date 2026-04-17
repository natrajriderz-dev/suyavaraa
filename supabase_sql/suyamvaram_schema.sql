-- Supabase Schema for Suyamvaram Feature

-- Create suyamvaram_challenges table
CREATE TABLE IF NOT EXISTS public.suyamvaram_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL,
    max_participants INTEGER DEFAULT 50,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    reward TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for suyamvaram_challenges
ALTER TABLE public.suyamvaram_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for suyamvaram_challenges
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


-- Create suyamvaram_applications table
CREATE TABLE IF NOT EXISTS public.suyamvaram_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES public.suyamvaram_challenges(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(challenge_id, applicant_id)
);

-- Enable RLS for suyamvaram_applications
ALTER TABLE public.suyamvaram_applications ENABLE ROW LEVEL SECURITY;

-- Policies for suyamvaram_applications
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
