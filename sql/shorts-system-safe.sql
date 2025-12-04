-- Shorts System for LEVELY (Feed vertical estilo TikTok/Reels)
-- Execute this script in your Supabase SQL Editor
-- This version safely handles existing objects

-- ============================================
-- SHORTS TABLE
-- ============================================

-- Create shorts table (separate from posts for vertical video content)
CREATE TABLE IF NOT EXISTS public.shorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT CHECK (char_length(description) <= 500),
  likes_count INTEGER DEFAULT 0 NOT NULL,
  comments_count INTEGER DEFAULT 0 NOT NULL,
  views_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES FOR SHORTS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shorts_author_id ON public.shorts(author_id);
CREATE INDEX IF NOT EXISTS idx_shorts_created_at ON public.shorts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shorts_views_count ON public.shorts(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_shorts_likes_count ON public.shorts(likes_count DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR SHORTS
-- ============================================

ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Shorts are viewable by everyone" ON public.shorts;
DROP POLICY IF EXISTS "Users can insert their own shorts" ON public.shorts;
DROP POLICY IF EXISTS "Users can update their own shorts" ON public.shorts;
DROP POLICY IF EXISTS "Users can delete their own shorts" ON public.shorts;

-- Create policies
CREATE POLICY "Shorts are viewable by everyone"
  ON public.shorts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own shorts"
  ON public.shorts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own shorts"
  ON public.shorts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own shorts"
  ON public.shorts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================
-- SHORTS LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.shorts_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(short_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shorts_likes_short_id ON public.shorts_likes(short_id);
CREATE INDEX IF NOT EXISTS idx_shorts_likes_user_id ON public.shorts_likes(user_id);

ALTER TABLE public.shorts_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Shorts likes are viewable by everyone" ON public.shorts_likes;
DROP POLICY IF EXISTS "Users can like shorts" ON public.shorts_likes;
DROP POLICY IF EXISTS "Users can unlike shorts" ON public.shorts_likes;

-- Create policies
CREATE POLICY "Shorts likes are viewable by everyone"
  ON public.shorts_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like shorts"
  ON public.shorts_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike shorts"
  ON public.shorts_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SHORTS COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.shorts_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shorts_comments_short_id ON public.shorts_comments(short_id);
CREATE INDEX IF NOT EXISTS idx_shorts_comments_author_id ON public.shorts_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_shorts_comments_created_at ON public.shorts_comments(created_at DESC);

ALTER TABLE public.shorts_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Shorts comments are viewable by everyone" ON public.shorts_comments;
DROP POLICY IF EXISTS "Users can insert their own comments on shorts" ON public.shorts_comments;
DROP POLICY IF EXISTS "Users can update their own comments on shorts" ON public.shorts_comments;
DROP POLICY IF EXISTS "Users can delete their own comments on shorts" ON public.shorts_comments;

-- Create policies
CREATE POLICY "Shorts comments are viewable by everyone"
  ON public.shorts_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments on shorts"
  ON public.shorts_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments on shorts"
  ON public.shorts_comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments on shorts"
  ON public.shorts_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================
-- TRIGGER FUNCTIONS FOR SHORTS
-- ============================================

-- Update updated_at timestamp
DROP TRIGGER IF EXISTS update_shorts_updated_at ON public.shorts;
CREATE TRIGGER update_shorts_updated_at
  BEFORE UPDATE ON public.shorts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shorts_comments_updated_at ON public.shorts_comments;
CREATE TRIGGER update_shorts_comments_updated_at
  BEFORE UPDATE ON public.shorts_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update likes count on shorts
CREATE OR REPLACE FUNCTION update_short_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shorts
    SET likes_count = likes_count + 1
    WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shorts
    SET likes_count = likes_count - 1
    WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_like_created ON public.shorts_likes;
CREATE TRIGGER on_short_like_created
  AFTER INSERT ON public.shorts_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_short_likes_count();

DROP TRIGGER IF EXISTS on_short_like_deleted ON public.shorts_likes;
CREATE TRIGGER on_short_like_deleted
  AFTER DELETE ON public.shorts_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_short_likes_count();

-- Update comments count on shorts
CREATE OR REPLACE FUNCTION update_short_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shorts
    SET comments_count = comments_count + 1
    WHERE id = NEW.short_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shorts
    SET comments_count = comments_count - 1
    WHERE id = OLD.short_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_comment_created ON public.shorts_comments;
CREATE TRIGGER on_short_comment_created
  AFTER INSERT ON public.shorts_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_short_comments_count();

DROP TRIGGER IF EXISTS on_short_comment_deleted ON public.shorts_comments;
CREATE TRIGGER on_short_comment_deleted
  AFTER DELETE ON public.shorts_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_short_comments_count();

-- ============================================
-- XP SYSTEM FOR SHORTS
-- ============================================

-- Award XP for creating shorts (25 XP - más que videos normales)
CREATE OR REPLACE FUNCTION handle_short_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM award_xp(NEW.author_id, 25);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM award_xp(OLD.author_id, -25);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_xp ON public.shorts;
CREATE TRIGGER on_short_xp
  AFTER INSERT OR DELETE ON public.shorts
  FOR EACH ROW
  EXECUTE FUNCTION handle_short_xp();

-- Award XP for likes received on shorts (5 XP to short author)
CREATE OR REPLACE FUNCTION handle_short_like_xp()
RETURNS TRIGGER AS $$
DECLARE
  short_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT author_id INTO short_author_id
    FROM public.shorts
    WHERE id = NEW.short_id;
    
    IF short_author_id IS NOT NULL AND short_author_id != NEW.user_id THEN
      PERFORM award_xp(short_author_id, 5);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT author_id INTO short_author_id
    FROM public.shorts
    WHERE id = OLD.short_id;
    
    IF short_author_id IS NOT NULL AND short_author_id != OLD.user_id THEN
      PERFORM award_xp(short_author_id, -5);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_like_xp ON public.shorts_likes;
CREATE TRIGGER on_short_like_xp
  AFTER INSERT OR DELETE ON public.shorts_likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_short_like_xp();

-- Award XP for comments on shorts (3 XP to commenter, 2 XP to short author)
CREATE OR REPLACE FUNCTION handle_short_comment_xp()
RETURNS TRIGGER AS $$
DECLARE
  short_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM award_xp(NEW.author_id, 3);
    
    SELECT author_id INTO short_author_id
    FROM public.shorts
    WHERE id = NEW.short_id;
    
    IF short_author_id IS NOT NULL AND short_author_id != NEW.author_id THEN
      PERFORM award_xp(short_author_id, 2);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM award_xp(OLD.author_id, -3);
    
    SELECT author_id INTO short_author_id
    FROM public.shorts
    WHERE id = OLD.short_id;
    
    IF short_author_id IS NOT NULL AND short_author_id != OLD.author_id THEN
      PERFORM award_xp(short_author_id, -2);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_comment_xp ON public.shorts_comments;
CREATE TRIGGER on_short_comment_xp
  AFTER INSERT OR DELETE ON public.shorts_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_short_comment_xp();

-- ============================================
-- SHORTS ACHIEVEMENTS
-- ============================================

INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('first_short', 'Creador Viral', 'Sube tu primer Short', 40, '⚡', 'short_count', 1),
  ('shorts_10', 'Influencer Emergente', 'Sube 10 Shorts', 150, '🌟', 'short_count', 10),
  ('shorts_50', 'Estrella del Contenido', 'Sube 50 Shorts', 400, '💫', 'short_count', 50),
  ('shorts_100', 'Leyenda Viral', 'Sube 100 Shorts', 800, '👑', 'short_count', 100),
  ('short_viral_100', 'Short Viral', 'Consigue 100 likes en un Short', 100, '🔥', 'short_likes', 100),
  ('short_viral_500', 'Sensación Viral', 'Consigue 500 likes en un Short', 300, '💥', 'short_likes', 500),
  ('short_viral_1000', 'Fenómeno Viral', 'Consigue 1000 likes en un Short', 600, '🚀', 'short_likes', 1000)
ON CONFLICT (slug) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  icon = EXCLUDED.icon,
  trigger_type = EXCLUDED.trigger_type,
  trigger_value = EXCLUDED.trigger_value;

-- Check shorts achievements
CREATE OR REPLACE FUNCTION check_shorts_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  shorts_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO shorts_count
  FROM public.shorts
  WHERE author_id = user_id_param;
  
  IF shorts_count = 1 THEN
    PERFORM check_and_award_achievement(user_id_param, 'first_short');
  ELSIF shorts_count = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'shorts_10');
  ELSIF shorts_count = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'shorts_50');
  ELSIF shorts_count = 100 THEN
    PERFORM check_and_award_achievement(user_id_param, 'shorts_100');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check viral achievements (when a short gets many likes)
CREATE OR REPLACE FUNCTION check_short_viral_achievements(short_id_param UUID)
RETURNS void AS $$
DECLARE
  likes_count_var INTEGER;
  author_id_var UUID;
BEGIN
  SELECT s.likes_count, s.author_id INTO likes_count_var, author_id_var
  FROM public.shorts s
  WHERE s.id = short_id_param;
  
  IF likes_count_var = 100 THEN
    PERFORM check_and_award_achievement(author_id_var, 'short_viral_100');
  ELSIF likes_count_var = 500 THEN
    PERFORM check_and_award_achievement(author_id_var, 'short_viral_500');
  ELSIF likes_count_var = 1000 THEN
    PERFORM check_and_award_achievement(author_id_var, 'short_viral_1000');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for shorts count achievements
CREATE OR REPLACE FUNCTION trigger_check_shorts_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_shorts_achievements(NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_check_achievements ON public.shorts;
CREATE TRIGGER on_short_check_achievements
  AFTER INSERT ON public.shorts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_shorts_achievements();

-- Trigger for viral achievements
CREATE OR REPLACE FUNCTION trigger_check_short_viral_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_short_viral_achievements(NEW.short_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_short_like_check_viral ON public.shorts_likes;
CREATE TRIGGER on_short_like_check_viral
  AFTER INSERT ON public.shorts_likes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_short_viral_achievements();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Shorts system installed successfully!' AS status;

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'shorts%'
ORDER BY table_name;

-- Check shorts achievements
SELECT slug, title, xp_reward 
FROM public.achievements 
WHERE trigger_type IN ('short_count', 'short_likes')
ORDER BY xp_reward;
