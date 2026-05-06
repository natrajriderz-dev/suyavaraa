-- Add referral columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Create RPC to generate a random referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
  is_unique BOOLEAN := FALSE;
BEGIN
  WHILE NOT is_unique LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = result) THEN
      is_unique := TRUE;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Generate referral codes for existing users who don't have one
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.users WHERE referral_code IS NULL LOOP
    UPDATE public.users SET referral_code = generate_referral_code() WHERE id = u.id;
  END LOOP;
END;
$$;

-- Update the handle_new_user trigger to auto-generate referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, referral_code)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    generate_referral_code()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC to apply referral code and grant rewards
CREATE OR REPLACE FUNCTION apply_referral_code(p_user_id UUID, p_referral_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Find the referrer
  SELECT id INTO v_referrer_id FROM public.users WHERE referral_code = p_referral_code AND id != p_user_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE; -- Invalid code or referring oneself
  END IF;

  -- Ensure the user hasn't already been referred
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND referred_by IS NOT NULL) THEN
    RETURN FALSE; -- Already referred
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
