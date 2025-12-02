-- XP System Upgrade for LEVELY
-- Execute this script in your Supabase SQL Editor to add automatic XP and level-up functionality

-- ============================================
-- FUNCTIONS FOR XP SYSTEM
-- ============================================

-- Function to calculate level based on XP
CREATE OR REPLACE FUNCTION calculate_level(user_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Formula: level = floor(xp / 100) + 1
  -- Level 1: 0-99 XP, Level 2: 100-199 XP, etc.
  RETURN FLOOR(user_xp / 100.0) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award XP and auto level-up
CREATE OR REPLACE FUNCTION award_xp(user_id_param UUID, xp_amount INTEGER)
RETURNS void AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  -- Add XP to user
  UPDATE public.profiles
  SET xp = xp + xp_amount
  WHERE id = user_id_param
  RETURNING xp INTO new_xp;
  
  -- Calculate new level
  new_level := calculate_level(new_xp);
  
  -- Update level if changed
  UPDATE public.profiles
  SET level = new_level
  WHERE id = user_id_param AND level != new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle XP on post creation
CREATE OR REPLACE FUNCTION handle_post_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 10 XP for creating a post
  PERFORM award_xp(NEW.author_id, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle XP on like received
CREATE OR REPLACE FUNCTION handle_like_xp()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the post author
    SELECT author_id INTO post_author_id
    FROM public.posts
    WHERE id = NEW.post_id;
    
    -- Award 5 XP to the post author (not the liker)
    IF post_author_id IS NOT NULL THEN
      PERFORM award_xp(post_author_id, 5);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove 5 XP when like is removed
    SELECT author_id INTO post_author_id
    FROM public.posts
    WHERE id = OLD.post_id;
    
    IF post_author_id IS NOT NULL THEN
      PERFORM award_xp(post_author_id, -5);
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR AUTOMATIC XP
-- ============================================

-- Trigger to award XP when a post is created
DROP TRIGGER IF EXISTS on_post_created_award_xp ON public.posts;
CREATE TRIGGER on_post_created_award_xp
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_xp();

-- Trigger to award/remove XP when a post receives/loses a like
DROP TRIGGER IF EXISTS on_like_award_xp ON public.likes;
CREATE TRIGGER on_like_award_xp
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_like_xp();

-- ============================================
-- OPTIONAL: Recalculate XP for existing users
-- ============================================

-- Uncomment and run this if you want to recalculate XP for users who already have posts/likes

/*
DO $$
DECLARE
  user_record RECORD;
  post_count INTEGER;
  likes_received INTEGER;
  total_xp INTEGER;
  new_level INTEGER;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles LOOP
    -- Count posts
    SELECT COUNT(*) INTO post_count
    FROM public.posts
    WHERE author_id = user_record.id;
    
    -- Count likes received
    SELECT COUNT(*) INTO likes_received
    FROM public.likes l
    JOIN public.posts p ON l.post_id = p.id
    WHERE p.author_id = user_record.id;
    
    -- Calculate total XP (10 per post + 5 per like)
    total_xp := (post_count * 10) + (likes_received * 5);
    
    -- Calculate level
    new_level := calculate_level(total_xp);
    
    -- Update user
    UPDATE public.profiles
    SET xp = total_xp,
        level = new_level
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Updated user %: % posts, % likes, % XP, level %', 
      user_record.id, post_count, likes_received, total_xp, new_level;
  END LOOP;
END $$;
*/

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check that functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('calculate_level', 'award_xp', 'handle_post_xp', 'handle_like_xp')
ORDER BY routine_name;

-- Check that triggers were created
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('on_post_created_award_xp', 'on_like_award_xp')
ORDER BY trigger_name;
