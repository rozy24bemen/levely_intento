-- Mentions System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- CREATE MENTIONS TABLE
-- ============================================

-- Create mentions table to track user mentions in posts and comments
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentioner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Either post_id or comment_id must be set, but not both
  CONSTRAINT mention_source CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  -- Unique constraint to prevent duplicate mentions
  UNIQUE(mentioner_id, mentioned_user_id, post_id, comment_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON public.mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_post_id ON public.mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_mentions_comment_id ON public.mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON public.mentions(created_at DESC);

-- Enable RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all mentions" ON public.mentions;
DROP POLICY IF EXISTS "Users can create mentions" ON public.mentions;
DROP POLICY IF EXISTS "Users can delete their own mentions" ON public.mentions;
DROP POLICY IF EXISTS "Service role can manage mentions" ON public.mentions;

-- RLS Policies
CREATE POLICY "Users can view all mentions"
ON public.mentions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create mentions"
ON public.mentions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = mentioner_id);

CREATE POLICY "Users can delete their own mentions"
ON public.mentions FOR DELETE
TO authenticated
USING (auth.uid() = mentioner_id);

-- Policy for service role (allows triggers and functions to work)
CREATE POLICY "Service role can manage mentions"
ON public.mentions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- NOTIFICATION SYSTEM INTEGRATION
-- ============================================

-- Function to create notification when someone mentions a user
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  mentioner_username TEXT;
  content_type TEXT;
  target_post_id UUID;
  notification_message TEXT;
BEGIN
  -- Only create notification if mentioning someone else
  IF NEW.mentioner_id != NEW.mentioned_user_id THEN
    -- Get username of person who mentioned
    SELECT username INTO mentioner_username
    FROM public.profiles
    WHERE id = NEW.mentioner_id;
    
    -- Determine content type and get the post_id
    IF NEW.post_id IS NOT NULL THEN
      content_type := 'post';
      target_post_id := NEW.post_id;
      notification_message := mentioner_username || ' te mencionó en un post';
    ELSE
      content_type := 'comentario';
      -- Get the post_id from the comment
      SELECT post_id INTO target_post_id
      FROM public.comments
      WHERE id = NEW.comment_id;
      notification_message := mentioner_username || ' te mencionó en un comentario';
    END IF;
    
    -- Create notification with unique action_key
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      action_key
    ) VALUES (
      NEW.mentioned_user_id,
      'message',
      'Te mencionaron',
      notification_message,
      jsonb_build_object(
        'mentioner_id', NEW.mentioner_id,
        'mentioner_username', mentioner_username,
        'content_type', content_type,
        'post_id', target_post_id,
        'comment_id', NEW.comment_id
      ),
      'mention_' || NEW.id
    )
    ON CONFLICT (action_key) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete notification when mention is removed
CREATE OR REPLACE FUNCTION delete_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE action_key = 'mention_' || OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR NOTIFICATIONS
-- ============================================

DROP TRIGGER IF EXISTS on_mention_create_notification ON public.mentions;
CREATE TRIGGER on_mention_create_notification
  AFTER INSERT ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

DROP TRIGGER IF EXISTS on_mention_delete_notification ON public.mentions;
CREATE TRIGGER on_mention_delete_notification
  AFTER DELETE ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION delete_mention_notification();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Mentions system installed successfully!' AS status;

-- Check mentions table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mentions'
ORDER BY ordinal_position;
