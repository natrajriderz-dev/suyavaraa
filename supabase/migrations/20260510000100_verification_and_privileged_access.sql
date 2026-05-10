-- Verification workflow and privileged access hardening

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.is_privileged_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND COALESCE(is_active, TRUE) = TRUE
      AND role IN ('executive', 'admin', 'super_admin')
  );
$$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS email_verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS selfie_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS id_card_url TEXT,
  ADD COLUMN IF NOT EXISTS id_verification_status TEXT DEFAULT 'not_submitted';

UPDATE public.users
SET
  verification_status = CASE
    WHEN is_verified = TRUE THEN 'verified'
    WHEN verification_status IS NULL OR verification_status = '' THEN 'unverified'
    ELSE verification_status
  END,
  email_verification_status = COALESCE(email_verification_status, 'pending'),
  phone_verification_status = COALESCE(phone_verification_status, 'unverified'),
  id_verification_status = COALESCE(id_verification_status, 'not_submitted')
WHERE
  verification_status IS NULL
  OR email_verification_status IS NULL
  OR phone_verification_status IS NULL
  OR id_verification_status IS NULL;

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'selfie_only',
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS id_card_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE public.verification_requests
SET
  selfie_url = COALESCE(selfie_url, media_url),
  request_type = CASE
    WHEN COALESCE(id_card_url, '') <> '' THEN 'selfie_with_id'
    ELSE COALESCE(request_type, 'selfie_only')
  END
WHERE selfie_url IS NULL OR request_type IS NULL;

DROP POLICY IF EXISTS "Privileged users can view users" ON public.users;
CREATE POLICY "Privileged users can view users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view reports" ON public.reports;
CREATE POLICY "Privileged users can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view user feedback" ON public.user_feedback;
CREATE POLICY "Privileged users can view user feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view user blocks" ON public.user_blocks;
CREATE POLICY "Privileged users can view user blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view deepfake scans" ON public.deepfake_scans;
CREATE POLICY "Privileged users can view deepfake scans"
  ON public.deepfake_scans FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view auto removals" ON public.content_auto_removals;
CREATE POLICY "Privileged users can view auto removals"
  ON public.content_auto_removals FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view verification requests" ON public.verification_requests;
CREATE POLICY "Privileged users can view verification requests"
  ON public.verification_requests FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view admin activity" ON public.admin_activity_log;
CREATE POLICY "Privileged users can view admin activity"
  ON public.admin_activity_log FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());

DROP POLICY IF EXISTS "Privileged users can view admin team" ON public.admin_users;
CREATE POLICY "Privileged users can view admin team"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_privileged_user());
