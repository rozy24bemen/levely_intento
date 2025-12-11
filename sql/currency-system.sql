-- Currency System for LEVELY
-- Execute this script in your Supabase SQL Editor to add coins system

-- Add coins column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 1000 NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins);

-- Function to award coins
CREATE OR REPLACE FUNCTION award_coins(user_id_param UUID, coin_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET coins = coins + coin_amount
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update award_xp function to also give coins
CREATE OR REPLACE FUNCTION award_xp(user_id_param UUID, xp_amount INTEGER)
RETURNS void AS $$
DECLARE
  new_xp INTEGER;
  new_level INTEGER;
  pet_bonus INTEGER;
  final_xp INTEGER;
  coin_reward INTEGER;
BEGIN
  -- Get pet bonus percentage
  pet_bonus := get_pet_xp_bonus(user_id_param);
  
  -- Calculate final XP with bonus (if xp_amount is positive)
  IF xp_amount > 0 THEN
    final_xp := xp_amount + (xp_amount * pet_bonus / 100);
    -- Also give coins (1 coin per 2 XP)
    coin_reward := FLOOR(final_xp / 2.0);
  ELSE
    -- Don't apply bonus to negative XP (when removing likes)
    final_xp := xp_amount;
    coin_reward := 0;
  END IF;
  
  -- Add XP to user
  UPDATE public.profiles
  SET xp = xp + final_xp,
      coins = coins + coin_reward
  WHERE id = user_id_param
  RETURNING xp INTO new_xp;
  
  -- Calculate new level
  new_level := calculate_level(new_xp);
  
  -- Update level if changed
  UPDATE public.profiles
  SET level = new_level
  WHERE id = user_id_param AND level != new_level;
  
  -- Give same XP to active pet if XP was positive
  -- The pet receives the same amount as the user (with bonus included)
  IF xp_amount > 0 THEN
    UPDATE public.pets
    SET experience = experience + final_xp
    WHERE user_id = user_id_param AND is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify installation
SELECT 'Currency system installed successfully!' AS status;

-- Show current coins for all users
SELECT 
  id,
  username,
  coins,
  xp,
  level
FROM public.profiles
ORDER BY coins DESC
LIMIT 10;
