-- Pets System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- CREATE PETS TABLE
-- ============================================

-- Create pets table
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  experience INTEGER DEFAULT 0 NOT NULL,
  max_experience INTEGER DEFAULT 100 NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_is_active ON public.pets(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON public.pets(created_at DESC);

-- Enable RLS
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can create their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;

-- RLS Policies
CREATE POLICY "Users can view their own pets"
ON public.pets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pets"
ON public.pets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets"
ON public.pets FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets"
ON public.pets FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS FOR PETS
-- ============================================

-- Function to ensure only one active pet per user
CREATE OR REPLACE FUNCTION ensure_single_active_pet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other pets for this user
    UPDATE public.pets
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure only one active pet
DROP TRIGGER IF EXISTS on_pet_activate ON public.pets;
CREATE TRIGGER on_pet_activate
  BEFORE INSERT OR UPDATE OF is_active ON public.pets
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_pet();

-- Function to handle pet level up
CREATE OR REPLACE FUNCTION check_pet_level_up()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if experience exceeds max_experience
  WHILE NEW.experience >= NEW.max_experience LOOP
    NEW.level := NEW.level + 1;
    NEW.experience := NEW.experience - NEW.max_experience;
    NEW.max_experience := NEW.max_experience + 50; -- Increase required XP by 50 each level
  END LOOP;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic level up
DROP TRIGGER IF EXISTS on_pet_experience_update ON public.pets;
CREATE TRIGGER on_pet_experience_update
  BEFORE UPDATE OF experience ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION check_pet_level_up();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Pets system installed successfully!' AS status;

-- Check pets table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pets'
ORDER BY ordinal_position;
