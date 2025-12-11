-- Recommendation System for LEVELY
-- Execute this script in your Supabase SQL Editor to add the recommendation algorithm

-- ============================================
-- USER INTERACTIONS TABLE
-- ============================================

-- Track all user interactions with posts for recommendation algorithm
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  short_id UUID REFERENCES public.shorts(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (
    interaction_type IN ('view', 'like', 'comment', 'share', 'skip', 'watch_time')
  ),
  interaction_weight FLOAT DEFAULT 1.0,
  metadata JSONB, -- Para almacenar info adicional como watch_time, scroll_depth, etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraint: debe tener post_id O short_id, no ambos
  CONSTRAINT has_content CHECK (
    (post_id IS NOT NULL AND short_id IS NULL) OR 
    (post_id IS NULL AND short_id IS NOT NULL)
  )
);

-- Indexes para mejor performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_post_id ON public.user_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_short_id ON public.user_interactions(short_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON public.user_interactions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own interactions
CREATE POLICY "Users can view their own interactions"
  ON public.user_interactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own interactions
CREATE POLICY "Users can insert their own interactions"
  ON public.user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POST SCORES TABLE (Cached Scores)
-- ============================================

-- Precalculated scores for better performance
CREATE TABLE IF NOT EXISTS public.post_scores (
  post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  engagement_score FLOAT DEFAULT 0,
  recency_score FLOAT DEFAULT 0,
  quality_score FLOAT DEFAULT 0,
  total_score FLOAT DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_scores_total ON public.post_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_scores_last_calculated ON public.post_scores(last_calculated);

ALTER TABLE public.post_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post scores are viewable by everyone"
  ON public.post_scores FOR SELECT
  USING (true);

-- ============================================
-- SHORT SCORES TABLE (Cached Scores)
-- ============================================

CREATE TABLE IF NOT EXISTS public.short_scores (
  short_id UUID PRIMARY KEY REFERENCES public.shorts(id) ON DELETE CASCADE,
  engagement_score FLOAT DEFAULT 0,
  recency_score FLOAT DEFAULT 0,
  quality_score FLOAT DEFAULT 0,
  total_score FLOAT DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_short_scores_total ON public.short_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_short_scores_last_calculated ON public.short_scores(last_calculated);

ALTER TABLE public.short_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short scores are viewable by everyone"
  ON public.short_scores FOR SELECT
  USING (true);

-- ============================================
-- FUNCTION: Calculate Personalized Posts Feed
-- ============================================

CREATE OR REPLACE FUNCTION calculate_personalized_posts_feed(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  final_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_following AS (
    -- Get users that target user follows
    SELECT following_id 
    FROM follows 
    WHERE follower_id = target_user_id
  ),
  user_liked_authors AS (
    -- Authors whose posts the user has liked
    SELECT 
      p.author_id,
      COUNT(*) AS like_count
    FROM user_interactions ui
    JOIN posts p ON ui.post_id = p.id
    WHERE ui.user_id = target_user_id 
      AND ui.interaction_type = 'like'
      AND ui.created_at > NOW() - INTERVAL '30 days' -- Last 30 days
    GROUP BY p.author_id
  ),
  user_viewed_posts AS (
    -- Posts already viewed by user (to avoid repetition)
    SELECT post_id
    FROM user_interactions
    WHERE user_id = target_user_id
      AND interaction_type = 'view'
      AND created_at > NOW() - INTERVAL '7 days' -- Don't show posts viewed in last 7 days
  ),
  post_metrics AS (
    SELECT 
      p.id,
      p.author_id,
      p.created_at,
      p.likes_count,
      p.comments_count,
      p.media_type,
      
      -- Engagement Score (40% weight)
      -- Videos get higher weight
      (
        p.likes_count * 3 + 
        p.comments_count * 5 +
        CASE WHEN p.media_type = 'video' THEN 10 ELSE 0 END
      )::FLOAT AS engagement,
      
      -- Recency Score (30% weight) - Exponential decay
      -- Posts from last 24h get maximum score
      (EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0) * 100)::FLOAT AS recency,
      
      -- Following Bonus (20% weight)
      CASE 
        WHEN p.author_id IN (SELECT following_id FROM user_following) THEN 50.0
        ELSE 0.0 
      END AS follow_bonus,
      
      -- Interest Bonus (10% weight) - Based on past interactions
      COALESCE(
        (SELECT like_count * 5.0 FROM user_liked_authors WHERE author_id = p.author_id),
        0.0
      ) AS interest_bonus
      
    FROM posts p
    WHERE p.author_id != target_user_id -- Don't show own posts
      AND p.id NOT IN (SELECT post_id FROM user_viewed_posts) -- Don't show already viewed
  )
  SELECT 
    pm.id AS post_id,
    (
      pm.engagement * 0.4 + 
      pm.recency * 0.3 + 
      pm.follow_bonus * 0.2 + 
      pm.interest_bonus * 0.1
    ) AS final_score
  FROM post_metrics pm
  ORDER BY final_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Calculate Personalized Shorts Feed
-- ============================================

CREATE OR REPLACE FUNCTION calculate_personalized_shorts_feed(
  target_user_id UUID,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  short_id UUID,
  final_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_following AS (
    SELECT following_id 
    FROM follows 
    WHERE follower_id = target_user_id
  ),
  user_liked_authors AS (
    -- Authors whose shorts the user has liked
    SELECT 
      s.author_id,
      COUNT(*) AS like_count
    FROM user_interactions ui
    JOIN shorts s ON ui.short_id = s.id
    WHERE ui.user_id = target_user_id 
      AND ui.interaction_type = 'like'
      AND ui.created_at > NOW() - INTERVAL '30 days'
    GROUP BY s.author_id
  ),
  user_viewed_shorts AS (
    -- Shorts already viewed (don't show again for 3 days)
    SELECT short_id
    FROM user_interactions
    WHERE user_id = target_user_id
      AND interaction_type = 'view'
      AND created_at > NOW() - INTERVAL '3 days'
  ),
  short_metrics AS (
    SELECT 
      s.id,
      s.author_id,
      s.created_at,
      s.likes_count,
      s.comments_count,
      s.views_count,
      
      -- Engagement Score (50% weight) - More important for shorts
      (
        s.likes_count * 4 + 
        s.comments_count * 6 +
        s.views_count * 0.5
      )::FLOAT AS engagement,
      
      -- Recency Score (25% weight)
      (EXP(-EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 86400.0) * 100)::FLOAT AS recency,
      
      -- Following Bonus (15% weight)
      CASE 
        WHEN s.author_id IN (SELECT following_id FROM user_following) THEN 40.0
        ELSE 0.0 
      END AS follow_bonus,
      
      -- Interest Bonus (10% weight)
      COALESCE(
        (SELECT like_count * 4.0 FROM user_liked_authors WHERE author_id = s.author_id),
        0.0
      ) AS interest_bonus
      
    FROM shorts s
    WHERE s.author_id != target_user_id
      AND s.id NOT IN (SELECT short_id FROM user_viewed_shorts)
  )
  SELECT 
    sm.id AS short_id,
    (
      sm.engagement * 0.5 + 
      sm.recency * 0.25 + 
      sm.follow_bonus * 0.15 + 
      sm.interest_bonus * 0.1
    ) AS final_score
  FROM short_metrics sm
  ORDER BY final_score DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Track Interaction
-- ============================================

CREATE OR REPLACE FUNCTION track_user_interaction(
  p_user_id UUID,
  p_post_id UUID DEFAULT NULL,
  p_short_id UUID DEFAULT NULL,
  p_interaction_type TEXT DEFAULT 'view',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  interaction_id UUID;
  weight FLOAT;
BEGIN
  -- Calculate weight based on interaction type
  weight := CASE p_interaction_type
    WHEN 'view' THEN 1.0
    WHEN 'like' THEN 3.0
    WHEN 'comment' THEN 5.0
    WHEN 'share' THEN 7.0
    WHEN 'skip' THEN -1.0
    WHEN 'watch_time' THEN 2.0
    ELSE 1.0
  END;
  
  -- Insert interaction
  INSERT INTO public.user_interactions (
    user_id,
    post_id,
    short_id,
    interaction_type,
    interaction_weight,
    metadata
  )
  VALUES (
    p_user_id,
    p_post_id,
    p_short_id,
    p_interaction_type,
    weight,
    p_metadata
  )
  RETURNING id INTO interaction_id;
  
  RETURN interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Recalculate All Scores (Run periodically)
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_content_scores()
RETURNS void AS $$
BEGIN
  -- Recalculate post scores
  INSERT INTO public.post_scores (post_id, engagement_score, recency_score, quality_score, total_score, last_calculated)
  SELECT 
    p.id,
    (p.likes_count * 3 + p.comments_count * 5)::FLOAT AS engagement_score,
    (EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0) * 100)::FLOAT AS recency_score,
    (
      CASE 
        WHEN p.media_type IS NOT NULL THEN 20.0
        ELSE 10.0
      END
    )::FLOAT AS quality_score,
    (
      (p.likes_count * 3 + p.comments_count * 5) * 0.5 +
      (EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0) * 100) * 0.3 +
      CASE WHEN p.media_type IS NOT NULL THEN 20.0 ELSE 10.0 END * 0.2
    )::FLOAT AS total_score,
    NOW()
  FROM posts p
  ON CONFLICT (post_id) 
  DO UPDATE SET
    engagement_score = EXCLUDED.engagement_score,
    recency_score = EXCLUDED.recency_score,
    quality_score = EXCLUDED.quality_score,
    total_score = EXCLUDED.total_score,
    last_calculated = NOW();
    
  -- Recalculate short scores
  INSERT INTO public.short_scores (short_id, engagement_score, recency_score, quality_score, total_score, last_calculated)
  SELECT 
    s.id,
    (s.likes_count * 4 + s.comments_count * 6 + s.views_count * 0.5)::FLOAT AS engagement_score,
    (EXP(-EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 86400.0) * 100)::FLOAT AS recency_score,
    (s.views_count * 0.1)::FLOAT AS quality_score,
    (
      (s.likes_count * 4 + s.comments_count * 6 + s.views_count * 0.5) * 0.6 +
      (EXP(-EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 86400.0) * 100) * 0.3 +
      (s.views_count * 0.1) * 0.1
    )::FLOAT AS total_score,
    NOW()
  FROM shorts s
  ON CONFLICT (short_id) 
  DO UPDATE SET
    engagement_score = EXCLUDED.engagement_score,
    recency_score = EXCLUDED.recency_score,
    quality_score = EXCLUDED.quality_score,
    total_score = EXCLUDED.total_score,
    last_calculated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('user_interactions', 'post_scores', 'short_scores')
ORDER BY table_name;

-- Verify functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_personalized_posts_feed',
    'calculate_personalized_shorts_feed',
    'track_user_interaction',
    'recalculate_content_scores'
  )
ORDER BY routine_name;
