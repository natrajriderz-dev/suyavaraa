-- Add preferred_mode to users and create family_members for matrimony community support

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_mode TEXT DEFAULT 'zone';

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
