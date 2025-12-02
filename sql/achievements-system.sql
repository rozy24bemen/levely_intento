-- Achievements System for LEVELY
-- Execute this script in your Supabase SQL Editor to add the achievements system

-- ============================================
-- PREDEFINED ACHIEVEMENTS
-- ============================================

-- Clear existing achievements (optional, comment out if you want to keep existing)
-- DELETE FROM public.achievements;

-- Beginner Achievements
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES 
  ('first_post', '¡Primer Paso!', 'Publica tu primer post', 50, '📝', 'post_count', 1),
  ('profile_complete', 'Identificación Completa', 'Completa tu biografía', 25, '✨', 'profile_complete', 0),
  ('first_like_received', 'Popular', 'Recibe tu primer like', 10, '❤️', 'like_received_count', 1);

-- Post Milestones
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('posts_10', 'Escritor Activo', 'Publica 10 posts', 100, '✍️', 'post_count', 10),
  ('posts_25', 'Creador de Contenido', 'Publica 25 posts', 200, '📚', 'post_count', 25),
  ('posts_50', 'Influencer', 'Publica 50 posts', 500, '🌟', 'post_count', 50),
  ('posts_100', 'Leyenda de LEVELY', 'Publica 100 posts', 1000, '👑', 'post_count', 100);

-- Like Milestones
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('likes_10', 'Bien Recibido', 'Recibe 10 likes en total', 75, '💙', 'like_received_count', 10),
  ('likes_50', 'Muy Querido', 'Recibe 50 likes en total', 250, '💜', 'like_received_count', 50),
  ('likes_100', 'Estrella de la Comunidad', 'Recibe 100 likes en total', 500, '⭐', 'like_received_count', 100),
  ('likes_500', 'Ídolo de LEVELY', 'Recibe 500 likes en total', 1500, '🏆', 'like_received_count', 500);

-- Level Milestones
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('level_5', 'Veterano', 'Alcanza nivel 5', 100, '🎖️', 'level', 5),
  ('level_10', 'Experto', 'Alcanza nivel 10', 300, '🥇', 'level', 10),
  ('level_25', 'Maestro', 'Alcanza nivel 25', 1000, '🎯', 'level', 25),
  ('level_50', 'Legendario', 'Alcanza nivel 50', 2500, '💎', 'level', 50);

-- Special Achievements
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES
  ('early_bird', 'Madrugador', 'Publica antes de las 6 AM', 50, '🌅', 'special', 0),
  ('night_owl', 'Noctámbulo', 'Publica después de las 12 AM', 50, '🌙', 'special', 0),
  ('streak_7', 'Consistencia', 'Publica durante 7 días seguidos', 200, '🔥', 'streak', 7);

-- ============================================
-- FUNCTIONS FOR ACHIEVEMENT SYSTEM
-- ============================================

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievement(
  user_id_param UUID,
  achievement_slug_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  achievement_record RECORD;
  already_awarded BOOLEAN;
BEGIN
  -- Check if achievement exists
  SELECT * INTO achievement_record
  FROM public.achievements
  WHERE slug = achievement_slug_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if already awarded
  SELECT EXISTS(
    SELECT 1 FROM public.user_achievements
    WHERE user_id = user_id_param AND achievement_id = achievement_record.id
  ) INTO already_awarded;
  
  IF already_awarded THEN
    RETURN FALSE;
  END IF;
  
  -- Award achievement
  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (user_id_param, achievement_record.id);
  
  -- Award XP bonus
  IF achievement_record.xp_reward > 0 THEN
    PERFORM award_xp(user_id_param, achievement_record.xp_reward);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check post count achievements
CREATE OR REPLACE FUNCTION check_post_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  post_count INTEGER;
BEGIN
  -- Get user's post count
  SELECT COUNT(*) INTO post_count
  FROM public.posts
  WHERE author_id = user_id_param;
  
  -- Check milestones
  IF post_count = 1 THEN
    PERFORM check_and_award_achievement(user_id_param, 'first_post');
  ELSIF post_count = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'posts_10');
  ELSIF post_count = 25 THEN
    PERFORM check_and_award_achievement(user_id_param, 'posts_25');
  ELSIF post_count = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'posts_50');
  ELSIF post_count = 100 THEN
    PERFORM check_and_award_achievement(user_id_param, 'posts_100');
  END IF;
  
  -- Check time-based achievements
  IF EXTRACT(HOUR FROM NOW()) < 6 THEN
    PERFORM check_and_award_achievement(user_id_param, 'early_bird');
  ELSIF EXTRACT(HOUR FROM NOW()) >= 0 AND EXTRACT(HOUR FROM NOW()) < 2 THEN
    PERFORM check_and_award_achievement(user_id_param, 'night_owl');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check like achievements
CREATE OR REPLACE FUNCTION check_like_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  like_count INTEGER;
BEGIN
  -- Get user's received likes count
  SELECT COUNT(*) INTO like_count
  FROM public.likes l
  JOIN public.posts p ON l.post_id = p.id
  WHERE p.author_id = user_id_param;
  
  -- Check milestones
  IF like_count = 1 THEN
    PERFORM check_and_award_achievement(user_id_param, 'first_like_received');
  ELSIF like_count = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'likes_10');
  ELSIF like_count = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'likes_50');
  ELSIF like_count = 100 THEN
    PERFORM check_and_award_achievement(user_id_param, 'likes_100');
  ELSIF like_count = 500 THEN
    PERFORM check_and_award_achievement(user_id_param, 'likes_500');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check level achievements
CREATE OR REPLACE FUNCTION check_level_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  user_level INTEGER;
BEGIN
  -- Get user's level
  SELECT level INTO user_level
  FROM public.profiles
  WHERE id = user_id_param;
  
  -- Check milestones
  IF user_level = 5 THEN
    PERFORM check_and_award_achievement(user_id_param, 'level_5');
  ELSIF user_level = 10 THEN
    PERFORM check_and_award_achievement(user_id_param, 'level_10');
  ELSIF user_level = 25 THEN
    PERFORM check_and_award_achievement(user_id_param, 'level_25');
  ELSIF user_level = 50 THEN
    PERFORM check_and_award_achievement(user_id_param, 'level_50');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check profile complete achievement
CREATE OR REPLACE FUNCTION check_profile_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Get user's profile
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_id_param;
  
  -- Check if bio is complete
  IF profile_record.bio IS NOT NULL AND TRIM(profile_record.bio) != '' THEN
    PERFORM check_and_award_achievement(user_id_param, 'profile_complete');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR ACHIEVEMENTS
-- ============================================

-- Trigger to check achievements after post creation
CREATE OR REPLACE FUNCTION trigger_check_post_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_post_achievements(NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_check_achievements ON public.posts;
CREATE TRIGGER on_post_check_achievements
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_post_achievements();

-- Trigger to check achievements after receiving a like
CREATE OR REPLACE FUNCTION trigger_check_like_achievements()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get post author
    SELECT author_id INTO post_author_id
    FROM public.posts
    WHERE id = NEW.post_id;
    
    -- Check like achievements for the post author
    IF post_author_id IS NOT NULL THEN
      PERFORM check_like_achievements(post_author_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_check_achievements ON public.likes;
CREATE TRIGGER on_like_check_achievements
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_like_achievements();

-- Trigger to check level achievements after XP update
CREATE OR REPLACE FUNCTION trigger_check_level_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.level > OLD.level THEN
    PERFORM check_level_achievements(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_level_up_check_achievements ON public.profiles;
CREATE TRIGGER on_level_up_check_achievements
  AFTER UPDATE OF level ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_level_achievements();

-- Trigger to check profile achievements after profile update
CREATE OR REPLACE FUNCTION trigger_check_profile_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bio IS DISTINCT FROM OLD.bio THEN
    PERFORM check_profile_achievements(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update_check_achievements ON public.profiles;
CREATE TRIGGER on_profile_update_check_achievements
  AFTER UPDATE OF bio ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_profile_achievements();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check achievements were created
SELECT slug, title, xp_reward, trigger_type 
FROM public.achievements 
ORDER BY 
  CASE trigger_type
    WHEN 'post_count' THEN 1
    WHEN 'like_received_count' THEN 2
    WHEN 'level' THEN 3
    WHEN 'profile_complete' THEN 4
    WHEN 'special' THEN 5
    WHEN 'streak' THEN 6
  END,
  trigger_value;

-- Check functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%achievement%'
ORDER BY routine_name;

-- Check triggers were created
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%achievement%'
ORDER BY trigger_name;
