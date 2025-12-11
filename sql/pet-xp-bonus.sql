-- Pet XP Bonus Integration for LEVELY
-- Execute this script in your Supabase SQL Editor to integrate pet bonuses with XP system

-- ============================================
-- UPDATED AWARD_XP FUNCTION WITH PET BONUS
-- ============================================

-- Function to get active pet bonus for user
CREATE OR REPLACE FUNCTION get_pet_xp_bonus(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  pet_rarity TEXT;
  pet_level INTEGER;
  rarity_bonus INTEGER;
  level_bonus INTEGER;
BEGIN
  -- Get active pet's rarity and level
  SELECT rarity, level INTO pet_rarity, pet_level
  FROM public.pets
  WHERE user_id = user_id_param AND is_active = true
  LIMIT 1;
  
  -- If no active pet, return 0
  IF pet_rarity IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Base bonus by rarity
  rarity_bonus := CASE pet_rarity
    WHEN 'common' THEN 5
    WHEN 'rare' THEN 10
    WHEN 'epic' THEN 15
    WHEN 'legendary' THEN 25
    ELSE 0
  END;
  
  -- Level bonus: +1% per level
  level_bonus := COALESCE(pet_level, 1);
  
  RETURN rarity_bonus + level_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to award XP with pet bonus
CREATE OR REPLACE FUNCTION award_xp(user_id_param UUID, xp_amount INTEGER)
RETURNS void AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER;
  pet_bonus INTEGER;
  final_xp INTEGER;
BEGIN
  -- Get pet bonus percentage
  pet_bonus := get_pet_xp_bonus(user_id_param);
  
  -- Calculate final XP with bonus (if xp_amount is positive)
  IF xp_amount > 0 THEN
    final_xp := xp_amount + (xp_amount * pet_bonus / 100);
  ELSE
    -- Don't apply bonus to negative XP (when removing likes)
    final_xp := xp_amount;
  END IF;
  
  -- Add XP to user
  UPDATE public.profiles
  SET xp = xp + final_xp
  WHERE id = user_id_param
  RETURNING xp INTO new_xp;
  
  -- Calculate new level
  new_level := calculate_level(new_xp);
  
  -- Update level if changed
  UPDATE public.profiles
  SET level = new_level
  WHERE id = user_id_param AND level != new_level;
  
  -- Give XP to active pet if XP was positive
  IF xp_amount > 0 THEN
    UPDATE public.pets
    SET experience = experience + 5
    WHERE user_id = user_id_param AND is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Pet XP bonus system integrated successfully!' AS status;

-- Test the functions
SELECT get_pet_xp_bonus(auth.uid()) AS "My Pet Bonus";
