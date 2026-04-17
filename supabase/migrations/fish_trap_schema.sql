-- ============================================
-- SUYAVARAA Fish Trap Database Schema
-- ============================================
-- This migration creates all tables needed for the Fish Trap
-- proactive scammer interception system

-- Create Tribes table first (referenced by decoy_profiles)
CREATE TABLE IF NOT EXISTS public.tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Decoy Profiles Table
-- Stores the 20+ decoy profiles that act as bait for scammers
CREATE TABLE IF NOT EXISTS public.decoy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  bio TEXT,
  profile_photo_url TEXT,
  tribe_id UUID REFERENCES public.tribes(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_request_sent_at TIMESTAMP,
  request_send_interval INT DEFAULT 172800, -- 2 days in seconds
  characteristics JSONB -- personality traits for response generation
);

-- Fish Trap Interactions
-- Tracks each conversation between unverified users and decoy profiles
CREATE TABLE IF NOT EXISTS public.fish_trap_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decoy_id UUID NOT NULL REFERENCES public.decoy_profiles(id) ON DELETE CASCADE,
  request_id UUID UNIQUE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, blocked
  behavior_flags JSONB DEFAULT '[]', -- array of detected red flags
  red_flag_count INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, decoy_id)
);

-- Fish Trap Messages
-- Stores all messages in decoy conversations, with scrubbing applied
CREATE TABLE IF NOT EXISTS public.fish_trap_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES public.fish_trap_interactions(id) ON DELETE CASCADE,
  sender_type VARCHAR(50) NOT NULL, -- 'user' or 'decoy'
  user_id UUID REFERENCES auth.users(id),
  decoy_id UUID REFERENCES public.decoy_profiles(id),
  content TEXT NOT NULL, -- original content (for analysis)
  displayed_content TEXT, -- scrubbed content (phone/instagram hidden)
  contains_contact_info BOOLEAN DEFAULT false,
  contact_info_type VARCHAR(50), -- 'phone', 'instagram', 'whatsapp', etc
  red_flags JSONB DEFAULT '{}', -- detected patterns
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure columns exist if tables were created with different schema
ALTER TABLE public.fish_trap_interactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS decoy_id UUID REFERENCES public.decoy_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS request_id UUID,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS behavior_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS red_flag_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE public.fish_trap_messages
  ADD COLUMN IF NOT EXISTS interaction_id UUID REFERENCES public.fish_trap_interactions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS decoy_id UUID REFERENCES public.decoy_profiles(id),
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS displayed_content TEXT,
  ADD COLUMN IF NOT EXISTS contains_contact_info BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_info_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Note: contact_info_logs table is created in trust_and_verification.sql migration

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_user ON public.fish_trap_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_decoy ON public.fish_trap_interactions(decoy_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_interaction ON public.fish_trap_messages(interaction_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_created ON public.fish_trap_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.decoy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_trap_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_trap_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only access for security)
DROP POLICY IF EXISTS "Admin only access to decoy profiles" ON public.decoy_profiles;
CREATE POLICY "Admin only access to decoy profiles" ON public.decoy_profiles
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only access to fish trap interactions" ON public.fish_trap_interactions;
CREATE POLICY "Admin only access to fish trap interactions" ON public.fish_trap_interactions
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin only access to fish trap messages" ON public.fish_trap_messages;
CREATE POLICY "Admin only access to fish trap messages" ON public.fish_trap_messages
  FOR ALL USING (public.is_admin());

-- Note: contact_info_logs RLS policies are configured in trust_and_verification.sql migration

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for fish_trap_interactions
DROP TRIGGER IF EXISTS update_fish_trap_interactions_updated_at ON public.fish_trap_interactions;
CREATE TRIGGER update_fish_trap_interactions_updated_at
  BEFORE UPDATE ON public.fish_trap_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();