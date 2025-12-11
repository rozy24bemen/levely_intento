-- Comment Likes System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- CREATE COMMENT_LIKES TABLE
-- ============================================

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes(created_at DESC);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can create comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can delete their own comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Service role can manage comment likes" ON public.comment_likes;

-- RLS Policies
CREATE POLICY "Users can view all comment likes"
ON public.comment_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create comment likes"
ON public.comment_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
ON public.comment_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy for service role (allows triggers and functions to work)
CREATE POLICY "Service role can manage comment likes"
ON public.comment_likes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- ADD LIKES_COUNT TO COMMENTS TABLE
-- ============================================

-- Add likes_count column to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- FUNCTIONS TO UPDATE LIKE COUNTERS
-- ============================================

-- Function to increment comment like count
CREATE OR REPLACE FUNCTION increment_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments
  SET likes_count = likes_count + 1
  WHERE id = NEW.comment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement comment like count
CREATE OR REPLACE FUNCTION decrement_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = OLD.comment_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR LIKE COUNTERS
-- ============================================

DROP TRIGGER IF EXISTS on_comment_like_increment_count ON public.comment_likes;
CREATE TRIGGER on_comment_like_increment_count
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_comment_like_count();

DROP TRIGGER IF EXISTS on_comment_like_delete_decrement_count ON public.comment_likes;
CREATE TRIGGER on_comment_like_delete_decrement_count
  AFTER DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comment_like_count();

-- ============================================
-- NOTIFICATION SYSTEM INTEGRATION
-- ============================================

-- Function to create notification when someone likes a comment
CREATE OR REPLACE FUNCTION create_comment_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id UUID;
  commenter_username TEXT;
BEGIN
  -- Get comment author
  SELECT author_id INTO comment_author_id
  FROM public.comments
  WHERE id = NEW.comment_id;
  
  -- Only create notification if the liker is not the comment author
  IF comment_author_id != NEW.user_id THEN
    -- Get username of person who liked
    SELECT username INTO commenter_username
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Create notification with unique action_key
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata,
      action_key
    ) VALUES (
      comment_author_id,
      'like',
      'Nuevo like',
      commenter_username || ' le dio like a tu comentario',
      jsonb_build_object(
        'liker_id', NEW.user_id,
        'liker_username', commenter_username,
        'comment_id', NEW.comment_id
      ),
      'comment_like_' || NEW.comment_id || '_' || NEW.user_id
    )
    ON CONFLICT (action_key) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete notification when comment like is removed
CREATE OR REPLACE FUNCTION delete_comment_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE action_key = 'comment_like_' || OLD.comment_id || '_' || OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR NOTIFICATIONS
-- ============================================

DROP TRIGGER IF EXISTS on_comment_like_create_notification ON public.comment_likes;
CREATE TRIGGER on_comment_like_create_notification
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_like_notification();

DROP TRIGGER IF EXISTS on_comment_like_delete_notification ON public.comment_likes;
CREATE TRIGGER on_comment_like_delete_notification
  AFTER DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION delete_comment_like_notification();

-- ============================================
-- INITIALIZE EXISTING COUNTERS
-- ============================================

-- Update likes_count for existing comments
UPDATE public.comments AS comment
SET likes_count = (
  SELECT COUNT(*)
  FROM public.comment_likes AS likes
  WHERE likes.comment_id = comment.id
);

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Comment likes system installed successfully!' AS status;

-- Check comment_likes table
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'comment_likes'
ORDER BY ordinal_position;

-- Check likes_count column in comments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'comments'
  AND column_name = 'likes_count';
