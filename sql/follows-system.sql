-- Follows System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- FOLLOWS TABLE
-- ============================================

-- Create follows table (who follows who)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Users can't follow themselves
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- ============================================
-- ADD COUNTERS TO PROFILES
-- ============================================

-- Add followers and following counts to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;

-- Everyone can view follows
CREATE POLICY "Follows are viewable by everyone"
ON public.follows FOR SELECT
USING (true);

-- Authenticated users can follow others
CREATE POLICY "Users can follow others"
ON public.follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete their own follows)
CREATE POLICY "Users can unfollow others"
ON public.follows FOR DELETE
USING (auth.uid() = follower_id);

-- ============================================
-- FUNCTIONS TO UPDATE COUNTERS
-- ============================================

-- Function to increment follow counters
CREATE OR REPLACE FUNCTION increment_follow_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment follower's following_count
  UPDATE public.profiles
  SET following_count = following_count + 1
  WHERE id = NEW.follower_id;
  
  -- Increment following's followers_count
  UPDATE public.profiles
  SET followers_count = followers_count + 1
  WHERE id = NEW.following_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement follow counters
CREATE OR REPLACE FUNCTION decrement_follow_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement follower's following_count
  UPDATE public.profiles
  SET following_count = GREATEST(following_count - 1, 0)
  WHERE id = OLD.follower_id;
  
  -- Decrement following's followers_count
  UPDATE public.profiles
  SET followers_count = GREATEST(followers_count - 1, 0)
  WHERE id = OLD.following_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR FOLLOW COUNTERS
-- ============================================

DROP TRIGGER IF EXISTS on_follow_increment_counters ON public.follows;
CREATE TRIGGER on_follow_increment_counters
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION increment_follow_counters();

DROP TRIGGER IF EXISTS on_unfollow_decrement_counters ON public.follows;
CREATE TRIGGER on_unfollow_decrement_counters
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION decrement_follow_counters();

-- ============================================
-- FUNCTION TO CREATE FOLLOW NOTIFICATION
-- ============================================

CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  follower_username TEXT;
  follower_avatar TEXT;
  notification_action_key TEXT;
BEGIN
  -- Get follower info
  SELECT username, avatar_url INTO follower_username, follower_avatar
  FROM public.profiles
  WHERE id = NEW.follower_id;
  
  -- Create unique action key: follow_{follower_id}_{following_id}
  notification_action_key := 'follow_' || NEW.follower_id || '_' || NEW.following_id;
  
  -- Create notification
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, metadata, action_key)
    VALUES (
      NEW.following_id,
      'follow',
      'Nuevo seguidor',
      follower_username || ' comenzó a seguirte',
      jsonb_build_object(
        'from_user', follower_username,
        'from_user_id', NEW.follower_id,
        'from_user_avatar', follower_avatar
      ),
      notification_action_key
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Notification already exists, ignore
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to delete follow notification when unfollowed
CREATE OR REPLACE FUNCTION delete_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_action_key TEXT;
BEGIN
  -- Create the same action key used when creating the notification
  notification_action_key := 'follow_' || OLD.follower_id || '_' || OLD.following_id;
  
  -- Delete the notification using the action key
  DELETE FROM public.notifications WHERE action_key = notification_action_key;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR FOLLOW NOTIFICATIONS
-- ============================================

DROP TRIGGER IF EXISTS follow_notification_trigger ON public.follows;
CREATE TRIGGER follow_notification_trigger
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

DROP TRIGGER IF EXISTS delete_follow_notification_trigger ON public.follows;
CREATE TRIGGER delete_follow_notification_trigger
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION delete_follow_notification();

-- ============================================
-- INITIALIZE EXISTING COUNTERS
-- ============================================

-- Update followers_count for existing users
UPDATE public.profiles
SET followers_count = (
  SELECT COUNT(*)
  FROM public.follows
  WHERE following_id = profiles.id
);

-- Update following_count for existing users
UPDATE public.profiles
SET following_count = (
  SELECT COUNT(*)
  FROM public.follows
  WHERE follower_id = profiles.id
);

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Follows system installed successfully!' AS status;

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'follows'
ORDER BY ordinal_position;

-- Check profile counters
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('followers_count', 'following_count')
ORDER BY ordinal_position;
