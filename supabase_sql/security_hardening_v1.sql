-- 1. Cap referrals and validate input
CREATE OR REPLACE FUNCTION apply_referral_code(p_user_id UUID, p_referral_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_count INTEGER;
  v_is_verified BOOLEAN;
  v_profile_complete BOOLEAN;
  v_clean_code TEXT;
BEGIN
  -- Basic sanitization (prevent SQL injection and standardise format)
  v_clean_code := UPPER(regexp_replace(p_referral_code, '[^A-Z0-9]', '', 'g'));

  IF length(v_clean_code) < 4 OR length(v_clean_code) > 10 THEN
    RETURN FALSE;
  END IF;

  -- Find the referrer
  SELECT id INTO v_referrer_id 
  FROM public.users 
  WHERE referral_code = v_clean_code AND id != p_user_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE; -- Invalid code or referring oneself
  END IF;

  -- Ensure the referring user is legitimate (verified and complete)
  SELECT is_verified, profile_complete INTO v_is_verified, v_profile_complete
  FROM public.users WHERE id = v_referrer_id;

  IF NOT v_is_verified OR NOT v_profile_complete THEN
    RETURN FALSE; -- Referrer must be fully onboarded
  END IF;

  -- Ensure the new user hasn't already been referred
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND referred_by IS NOT NULL) THEN
    RETURN FALSE; -- Already referred
  END IF;

  -- Abuse Prevention: Limit max referrals per referrer to 10
  SELECT count(*) INTO v_referral_count
  FROM public.users WHERE referred_by = v_referrer_id;

  IF v_referral_count >= 10 THEN
    RETURN FALSE; -- Maximum referral limit reached
  END IF;

  -- Update the referred user's record
  UPDATE public.users SET referred_by = v_referrer_id WHERE id = p_user_id;

  -- Reward the referrer (7 days of premium)
  UPDATE public.users 
  SET 
    is_premium = TRUE,
    premium_expires_at = COALESCE(premium_expires_at, NOW()) + INTERVAL '7 days'
  WHERE id = v_referrer_id;

  -- Reward the referred user (3 days of premium)
  UPDATE public.users 
  SET 
    is_premium = TRUE,
    premium_expires_at = COALESCE(premium_expires_at, NOW()) + INTERVAL '3 days'
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Secure the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  -- Validate and sanitize metadata input
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');
  v_full_name := trim(regexp_replace(v_full_name, '[^a-zA-Z0-9 -]', '', 'g'));

  IF length(v_full_name) > 50 THEN
     v_full_name := substring(v_full_name from 1 for 50);
  END IF;

  INSERT INTO public.users (id, email, full_name, referral_code)
  VALUES (
    new.id, 
    new.email, 
    v_full_name,
    generate_referral_code()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Lock down 'users' table RLS to prevent client-side privilege escalation
-- Drop the overly permissive update policy if it exists
DROP POLICY IF EXISTS "Users can update own row" ON public.users;

-- Recreate policy strictly preventing updates to secure fields
CREATE POLICY "Users can update own row basic fields" 
ON public.users
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- Explicitly block users from making themselves premium, verified, or admins
    -- These fields must be updated server-side or by triggers
    AND (
      is_premium IS NOT DISTINCT FROM (SELECT is_premium FROM public.users WHERE id = auth.uid())
      AND is_verified IS NOT DISTINCT FROM (SELECT is_verified FROM public.users WHERE id = auth.uid())
      AND is_banned IS NOT DISTINCT FROM (SELECT is_banned FROM public.users WHERE id = auth.uid())
      AND role IS NOT DISTINCT FROM (SELECT role FROM public.users WHERE id = auth.uid())
      AND trust_score IS NOT DISTINCT FROM (SELECT trust_score FROM public.users WHERE id = auth.uid())
      AND premium_expires_at IS NOT DISTINCT FROM (SELECT premium_expires_at FROM public.users WHERE id = auth.uid())
    )
);

-- Note: Referral codes don't need a specific RLS block because we only want 
-- to protect fields that escalate privileges or bypass safety checks.
