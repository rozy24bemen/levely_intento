-- Comment Replies System for LEVELY
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- ADD PARENT_ID TO COMMENTS TABLE
-- ============================================

-- Add parent_id column to comments table for replies (threads)
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

-- Add replies_count column to track number of replies
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================
-- FUNCTIONS TO UPDATE REPLY COUNTERS
-- ============================================

-- Function to increment reply count
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if this is a reply (has parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE public.comments
    SET replies_count = replies_count + 1
    WHERE id = NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement reply count
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if this was a reply (had parent_id)
  IF OLD.parent_id IS NOT NULL THEN
    UPDATE public.comments
    SET replies_count = GREATEST(replies_count - 1, 0)
    WHERE id = OLD.parent_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR REPLY COUNTERS
-- ============================================

DROP TRIGGER IF EXISTS on_reply_increment_count ON public.comments;
CREATE TRIGGER on_reply_increment_count
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_reply_count();

DROP TRIGGER IF EXISTS on_reply_delete_decrement_count ON public.comments;
CREATE TRIGGER on_reply_delete_decrement_count
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reply_count();

-- ============================================
-- INITIALIZE EXISTING COUNTERS
-- ============================================

-- Update replies_count for existing comments
UPDATE public.comments AS parent
SET replies_count = (
  SELECT COUNT(*)
  FROM public.comments AS replies
  WHERE replies.parent_id = parent.id
);

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Comment replies system installed successfully!' AS status;

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'comments'
  AND column_name IN ('parent_id', 'replies_count')
ORDER BY ordinal_position;
