-- Comments System for LEVELY
-- Execute this script in your Supabase SQL Editor to add the comments system

-- ============================================
-- COMMENTS TABLE
-- ============================================

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- Add comments_count to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Everyone can view comments
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================
-- FUNCTIONS FOR COMMENTS
-- ============================================

-- Function to update comments count on posts
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award XP for comments
CREATE OR REPLACE FUNCTION handle_comment_xp()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Award 3 XP to the commenter
    PERFORM award_xp(NEW.author_id, 3);
    
    -- Get the post author
    SELECT author_id INTO post_author_id
    FROM public.posts
    WHERE id = NEW.post_id;
    
    -- Award 2 XP to the post author (if not commenting on own post)
    IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
      PERFORM award_xp(post_author_id, 2);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove 3 XP from the commenter
    PERFORM award_xp(OLD.author_id, -3);
    
    -- Get the post author
    SELECT author_id INTO post_author_id
    FROM public.posts
    WHERE id = OLD.post_id;
    
    -- Remove 2 XP from the post author (if not their own comment)
    IF post_author_id IS NOT NULL AND post_author_id != OLD.author_id THEN
      PERFORM award_xp(post_author_id, -2);
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update comments_count
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

DROP TRIGGER IF EXISTS on_comment_deleted ON public.comments;
CREATE TRIGGER on_comment_deleted
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- Trigger to award XP for comments
DROP TRIGGER IF EXISTS on_comment_xp ON public.comments;
CREATE TRIGGER on_comment_xp
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_xp();

-- Trigger to update updated_at on comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENT ACHIEVEMENTS
-- ============================================

-- Add comment-related achievements
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('first_comment', 'Conversador', 'Escribe tu primer comentario', 20, '💬', 'comment_count', 1),
  ('comments_10', 'Comentarista Activo', 'Escribe 10 comentarios', 50, '🗨️', 'comment_count', 10),
  ('comments_50', 'Gran Conversador', 'Escribe 50 comentarios', 150, '💭', 'comment_count', 50),
  ('comments_100', 'Maestro del Diálogo', 'Escribe 100 comentarios', 300, '🎭', 'comment_count', 100)
ON CONFLICT (slug) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  icon = EXCLUDED.icon,
  trigger_type = EXCLUDED.trigger_type,
  trigger_value = EXCLUDED.trigger_value;

-- Function to check comment achievements
CREATE OR REPLACE FUNCTION check_comment_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  comment_count INTEGER;
BEGIN
  -- Get user's comment count
  SELECT COUNT(*) INTO comment_count
  FROM public.comments
  WHERE author_id = user_id_param;
  
  -- Check milestones
  IF comment_count = 1 THEN
    PERFORM check_and_award_achievement(user_id_param, 'first_comment');
  ELSIF comment_count = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'comments_10');
  ELSIF comment_count = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'comments_50');
  ELSIF comment_count = 100 THEN
    PERFORM check_and_award_achievement(user_id_param, 'comments_100');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check comment achievements
CREATE OR REPLACE FUNCTION trigger_check_comment_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_comment_achievements(NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_check_achievements ON public.comments;
CREATE TRIGGER on_comment_check_achievements
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_comment_achievements();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check comments table was created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'comments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check triggers were created
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%comment%'
ORDER BY trigger_name;

-- Check comment achievements
SELECT slug, title, xp_reward 
FROM public.achievements 
WHERE trigger_type = 'comment_count'
ORDER BY trigger_value;
