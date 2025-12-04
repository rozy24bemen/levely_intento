-- Image Upload System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Create storage bucket for post images (if not exists)
-- Note: This needs to be run in Supabase Dashboard > Storage
-- Or via SQL if you have the proper extensions

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow anyone to view images (public read)
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- UPDATE XP SYSTEM FOR IMAGES
-- ============================================

-- Update the post XP function to award more XP for posts with images
CREATE OR REPLACE FUNCTION handle_post_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_amount INTEGER;
BEGIN
  -- Award 15 XP for posts with images, 10 XP for text-only posts
  IF NEW.media_url IS NOT NULL THEN
    xp_amount := 15;
  ELSE
    xp_amount := 10;
  END IF;
  
  PERFORM award_xp(NEW.author_id, xp_amount);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- IMAGE ACHIEVEMENTS
-- ============================================

-- Add image-related achievements
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('first_image', 'Fotógrafo Novato', 'Sube tu primera imagen', 30, '📷', 'image_count', 1),
  ('images_10', 'Aficionado Visual', 'Sube 10 imágenes', 100, '📸', 'image_count', 10),
  ('images_25', 'Creador Visual', 'Sube 25 imágenes', 200, '🎨', 'image_count', 25),
  ('images_50', 'Maestro de la Fotografía', 'Sube 50 imágenes', 500, '🖼️', 'image_count', 50)
ON CONFLICT (slug) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  icon = EXCLUDED.icon,
  trigger_type = EXCLUDED.trigger_type,
  trigger_value = EXCLUDED.trigger_value;

-- Function to check image achievements
CREATE OR REPLACE FUNCTION check_image_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  image_count INTEGER;
BEGIN
  -- Get user's posts with images count
  SELECT COUNT(*) INTO image_count
  FROM public.posts
  WHERE author_id = user_id_param
    AND media_url IS NOT NULL;
  
  -- Check milestones
  IF image_count = 1 THEN
    PERFORM check_and_award_achievement(user_id_param, 'first_image');
  ELSIF image_count = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'images_10');
  ELSIF image_count = 25 THEN
    PERFORM check_and_award_achievement(user_id_param, 'images_25');
  ELSIF image_count = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'images_50');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update post achievements trigger to check images too
CREATE OR REPLACE FUNCTION trigger_check_post_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_post_achievements(NEW.author_id);
  PERFORM check_image_achievements(NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check storage bucket was created
SELECT * FROM storage.buckets WHERE id = 'post-images';

-- Check storage policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%post images%';

-- Check image achievements
SELECT slug, title, xp_reward 
FROM public.achievements 
WHERE trigger_type = 'image_count'
ORDER BY trigger_value;
