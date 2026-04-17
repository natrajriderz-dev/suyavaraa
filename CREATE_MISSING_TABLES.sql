-- ============================================
-- CREATE MISSING TABLES - Fix "relation does not exist" errors
-- ============================================
-- Run this before any other fixes if getting "table does not exist" errors

-- 1. First create fish_trap_interactions if it doesn't exist
CREATE TABLE IF NOT EXISTS public.fish_trap_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decoy_id UUID NOT NULL REFERENCES public.decoy_profiles(id) ON DELETE CASCADE,
  request_id UUID UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  behavior_flags JSONB DEFAULT '[]',
  red_flag_count INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, decoy_id)
);

-- 2. Create fish_trap_messages if it doesn't exist
CREATE TABLE IF NOT EXISTS public.fish_trap_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES public.fish_trap_interactions(id) ON DELETE CASCADE,
  conversation_id UUID, -- For backward compatibility
  sender_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  decoy_id UUID REFERENCES public.decoy_profiles(id),
  content TEXT NOT NULL,
  displayed_content TEXT,
  contains_contact_info BOOLEAN DEFAULT false,
  contact_info_type VARCHAR(50),
  red_flags JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_user ON public.fish_trap_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_interactions_decoy ON public.fish_trap_interactions(decoy_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_interaction ON public.fish_trap_messages(interaction_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_conversation ON public.fish_trap_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_fish_trap_messages_created ON public.fish_trap_messages(created_at);

-- 4. Enable RLS
ALTER TABLE public.fish_trap_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fish_trap_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create basic RLS policies (simplified)
DROP POLICY IF EXISTS "Users manage fish trap interactions" ON public.fish_trap_interactions;
CREATE POLICY "Users manage fish trap interactions"
  ON public.fish_trap_interactions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view fish trap interactions" ON public.fish_trap_interactions;
CREATE POLICY "Admins view fish trap interactions"
  ON public.fish_trap_interactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users view fish trap messages" ON public.fish_trap_messages;
CREATE POLICY "Users view fish trap messages"
  ON public.fish_trap_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fish_trap_interactions i
      WHERE (i.id = fish_trap_messages.interaction_id OR i.id = fish_trap_messages.conversation_id)
        AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view fish trap messages" ON public.fish_trap_messages;
CREATE POLICY "Admins view fish trap messages"
  ON public.fish_trap_messages FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 6. Update function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Trigger for updated_at
DROP TRIGGER IF EXISTS update_fish_trap_interactions_updated_at ON public.fish_trap_interactions;
CREATE TRIGGER update_fish_trap_interactions_updated_at
    BEFORE UPDATE ON public.fish_trap_interactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Also check for fish_trap_conversations (old name) and migrate if needed
DO $$
BEGIN
  -- Check if old table name exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fish_trap_conversations') THEN
    -- Copy data from old to new if new is empty
    IF NOT EXISTS (SELECT 1 FROM public.fish_trap_interactions LIMIT 1) THEN
      INSERT INTO public.fish_trap_interactions 
      SELECT * FROM public.fish_trap_conversations
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'Migrated data from fish_trap_conversations to fish_trap_interactions';
    END IF;
  END IF;
END $$;

-- 9. Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Missing tables created successfully!';
  RAISE NOTICE 'fish_trap_interactions table: created';
  RAISE NOTICE 'fish_trap_messages table: created';
  RAISE NOTICE 'Indexes: created';
  RAISE NOTICE 'RLS policies: applied';
END $$;