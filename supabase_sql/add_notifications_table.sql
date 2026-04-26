-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'interest', 'match', 'message', 'system'
    title TEXT,
    content TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Function to handle interest notifications
CREATE OR REPLACE FUNCTION public.handle_user_action_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only notify if it's a 'like'
    IF NEW.action_type = 'like' THEN
        -- Check if there's already a mutual like (don't send interest notification if it's already a match)
        IF NOT EXISTS (
            SELECT 1 FROM public.user_actions
            WHERE actor_user_id = NEW.target_user_id
              AND target_user_id = NEW.actor_user_id
              AND action_type = 'like'
        ) THEN
            INSERT INTO public.notifications (user_id, actor_id, type, title, content, data)
            VALUES (
                NEW.target_user_id,
                NEW.actor_user_id,
                'interest',
                'New Interest! 👋',
                (SELECT full_name FROM public.users WHERE id = NEW.actor_user_id) || ' is interested in you.',
                jsonb_build_object('actor_id', NEW.actor_user_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_action_notification ON public.user_actions;
CREATE TRIGGER trg_user_action_notification
    AFTER INSERT ON public.user_actions
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_action_notification();

-- Function to handle match notifications
CREATE OR REPLACE FUNCTION public.handle_match_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Notify User 1
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, data)
    VALUES (
        NEW.user1_id,
        NEW.user2_id,
        'match',
        'It''s a Match! 💕',
        'You and ' || (SELECT full_name FROM public.users WHERE id = NEW.user2_id) || ' matched!',
        jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user2_id)
    );

    -- Notify User 2
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, data)
    VALUES (
        NEW.user2_id,
        NEW.user1_id,
        'match',
        'It''s a Match! 💕',
        'You and ' || (SELECT full_name FROM public.users WHERE id = NEW.user1_id) || ' matched!',
        jsonb_build_object('match_id', NEW.id, 'other_user_id', NEW.user1_id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_notification ON public.matches;
CREATE TRIGGER trg_match_notification
    AFTER INSERT ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.handle_match_notification();
