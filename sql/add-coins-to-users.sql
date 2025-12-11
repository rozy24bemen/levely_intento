-- Add 10000 coins to all existing users
UPDATE public.profiles 
SET coins = 10000 
WHERE coins IS NOT NULL;

-- Verify the update
SELECT 
  id, 
  username, 
  coins 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;
