-- Create notification_tokens table to store push tokens for each user
CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON notification_tokens(user_id);

-- Create index for active tokens
CREATE INDEX IF NOT EXISTS idx_notification_tokens_active ON notification_tokens(is_active, user_id);

-- Add RLS policy
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own notification tokens
DROP POLICY IF EXISTS "Users can manage their notification tokens" ON notification_tokens;
CREATE POLICY "Users can manage their notification tokens"
  ON notification_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a function to update the last_updated timestamp
CREATE OR REPLACE FUNCTION update_notification_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_updated
DROP TRIGGER IF EXISTS trigger_update_notification_tokens_timestamp ON notification_tokens;
CREATE TRIGGER trigger_update_notification_tokens_timestamp
  BEFORE UPDATE ON notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_tokens_timestamp();
