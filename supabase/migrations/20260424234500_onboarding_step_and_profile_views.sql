ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'BasicInfo';

UPDATE public.users
SET onboarding_step = 'BasicInfo'
WHERE onboarding_step IS NULL;

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id
  ON public.profile_views(viewed_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_views_unique_daily
  ON public.profile_views(viewer_id, viewed_id, (DATE(created_at)));

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own profile views" ON public.profile_views;
CREATE POLICY "Users can create their own profile views"
  ON public.profile_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can view profile view rows involving them" ON public.profile_views;
CREATE POLICY "Users can view profile view rows involving them"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewer_id OR auth.uid() = viewed_id);
