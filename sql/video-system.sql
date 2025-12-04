-- Video System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- ADD MEDIA_TYPE TO POSTS
-- ============================================

-- Add media_type column to differentiate between image and video
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video'));

-- Set existing posts with media_url to 'image'
UPDATE public.posts
SET media_type = 'image'
WHERE media_url IS NOT NULL AND media_type IS NULL;

-- ============================================
-- STORAGE BUCKET FOR VIDEOS
-- ============================================

-- Create storage bucket for post videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES FOR VIDEOS
-- ============================================

-- Allow anyone to view videos (public read)
CREATE POLICY "Anyone can view post videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-videos');

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload post videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-videos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- UPDATE XP FUNCTION FOR VIDEOS
-- ============================================

-- Update handle_post_xp to award 20 XP for videos, 15 for images, 10 for text
CREATE OR REPLACE FUNCTION handle_post_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_amount INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Determine XP based on media type
    IF NEW.media_type = 'video' THEN
      xp_amount := 20;
    ELSIF NEW.media_url IS NOT NULL THEN
      xp_amount := 15;
    ELSE
      xp_amount := 10;
    END IF;
    
    PERFORM award_xp(NEW.author_id, xp_amount);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove XP based on media type
    IF OLD.media_type = 'video' THEN
      xp_amount := 20;
    ELSIF OLD.media_url IS NOT NULL THEN
      xp_amount := 15;
    ELSE
      xp_amount := 10;
    END IF;
    
    PERFORM award_xp(OLD.author_id, -xp_amount);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIDEO ACHIEVEMENTS
-- ============================================

-- Add video-related achievements
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('first_video', 'Cineasta Novato', 'Sube tu primer video', 30, '🎬', 'video_count', 1),
  ('videos_10', 'Director Aficionado', 'Sube 10 videos', 100, '🎥', 'video_count', 10),
  ('videos_25', 'Creador de Contenido', 'Sube 25 videos', 250, '📹', 'video_count', 25),
  ('videos_50', 'Maestro del Video', 'Sube 50 videos', 500, '🎞️', 'video_count', 50)
ON CONFLICT (slug) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  icon = EXCLUDED.icon,
  trigger_type = EXCLUDED.trigger_type,
  trigger_value = EXCLUDED.trigger_value;

-- ============================================
-- CHECK VIDEO ACHIEVEMENTS FUNCTION
-- ============================================

-- Function to check video achievements
CREATE OR REPLACE FUNCTION check_video_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  video_count INTEGER;
BEGIN
  -- Get user's video count
  SELECT COUNT(*) INTO video_count
  FROM public.posts
  WHERE author_id = user_id_param AND media_type = 'video';
  
  -- Check milestones
  IF video_count = 1 THEN
    PERFORM check_and_award_achievement(user_id_param, 'first_video');
  ELSIF video_count = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'videos_10');
  ELSIF video_count = 25 THEN
    PERFORM check_and_award_achievement(user_id_param, 'videos_25');
  ELSIF video_count = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'videos_50');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER FOR VIDEO ACHIEVEMENTS
-- ============================================

-- Trigger to check video achievements
CREATE OR REPLACE FUNCTION trigger_check_video_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.media_type = 'video' THEN
    PERFORM check_video_achievements(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_video_post_check_achievements ON public.posts;
CREATE TRIGGER on_video_post_check_achievements
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_video_achievements();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check media_type column
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'media_type';

-- Check video achievements
SELECT slug, title, xp_reward 
FROM public.achievements 
WHERE trigger_type = 'video_count'
ORDER BY trigger_value;
