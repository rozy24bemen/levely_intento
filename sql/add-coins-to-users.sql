-- IMPORTANTE: Ejecuta primero currency-system.sql para crear la columna coins
-- Este script solo actualiza las monedas de usuarios existentes

-- Add 10000 coins to all existing users
UPDATE public.profiles 
SET coins = 10000;

-- Verify the update
SELECT 
  id, 
  username, 
  coins 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;
