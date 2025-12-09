-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('xp_gained', 'message', 'like', 'comment', 'follow', 'level_up')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add action_key column if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_key TEXT;

-- Delete duplicate notifications keeping only the most recent one
DELETE FROM notifications a
USING notifications b
WHERE a.action_key = b.action_key
  AND a.action_key IS NOT NULL
  AND a.id < b.id;

-- Create unique constraint on action_key to prevent duplicates
-- Drop first in case it exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS unique_action_key;
ALTER TABLE notifications ADD CONSTRAINT unique_action_key UNIQUE (action_key);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable Realtime (skip if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Function to create XP notification
CREATE OR REPLACE FUNCTION create_xp_notification()
RETURNS TRIGGER AS $$
DECLARE
  xp_diff INTEGER;
  old_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Calculate XP difference
  xp_diff := NEW.xp - OLD.xp;
  
  -- Check for level up (this should always notify)
  old_level := OLD.level;
  new_level := NEW.level;
  
  IF new_level > old_level THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.id,
      'level_up',
      '¡Subiste de nivel!',
      '¡Felicidades! Ahora eres nivel ' || new_level,
      jsonb_build_object('new_level', new_level, 'old_level', old_level, 'xp_gained', xp_diff)
    );
  END IF;
  
  -- No crear notificaciones standalone de XP
  -- La XP siempre se mostrará con la acción que la generó (like, comment, etc.)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for XP notifications
DROP TRIGGER IF EXISTS xp_notification_trigger ON profiles;
CREATE TRIGGER xp_notification_trigger
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.xp IS DISTINCT FROM NEW.xp OR OLD.level IS DISTINCT FROM NEW.level)
EXECUTE FUNCTION create_xp_notification();

-- Function to create message notification
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_username TEXT;
BEGIN
  -- Get sender username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Create notification for receiver
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.receiver_id,
    'message',
    'Nuevo mensaje',
    sender_username || ' te ha enviado un mensaje',
    jsonb_build_object('from_user', sender_username, 'conversation_id', NEW.conversation_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message notifications
DROP TRIGGER IF EXISTS message_notification_trigger ON messages;
CREATE TRIGGER message_notification_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION create_message_notification();

-- Function to create like notification
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  liker_username TEXT;
  liker_avatar TEXT;
  post_owner_id UUID;
  post_content TEXT;
  post_media TEXT;
  notification_action_key TEXT;
  existing_notification_id UUID;
  existing_metadata JSONB;
  like_count INTEGER;
  other_likers JSONB;
BEGIN
  -- Get post owner and content
  SELECT author_id, content, media_url INTO post_owner_id, post_content, post_media
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user likes their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker info
  SELECT username, avatar_url INTO liker_username, liker_avatar
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Create unique action key per post (not per user): like_{post_id}
  notification_action_key := 'like_' || NEW.post_id;
  
  -- Check if notification already exists for this post
  SELECT id, metadata INTO existing_notification_id, existing_metadata
  FROM notifications
  WHERE action_key = notification_action_key;
  
  IF existing_notification_id IS NOT NULL THEN
    -- Notification exists, update it with batching
    -- Get current like count for this post
    SELECT COUNT(*) INTO like_count
    FROM likes
    WHERE post_id = NEW.post_id;
    
    -- Update the notification with new count and latest liker
    UPDATE notifications
    SET 
      message = CASE
        WHEN like_count = 1 THEN liker_username || ' le gustó tu publicación (+5 XP)'
        WHEN like_count = 2 THEN liker_username || ' y 1 usuario más les gustó tu publicación (+' || (like_count * 5) || ' XP)'
        ELSE liker_username || ' y ' || (like_count - 1) || ' usuarios más les gustó tu publicación (+' || (like_count * 5) || ' XP)'
      END,
      metadata = jsonb_set(
        jsonb_set(
          jsonb_set(
            existing_metadata,
            '{from_user}', to_jsonb(liker_username)
          ),
          '{from_user_avatar}', to_jsonb(liker_avatar)
        ),
        '{like_count}', to_jsonb(like_count)
      ),
      is_read = false,
      created_at = NOW(),
      updated_at = NOW()
    WHERE id = existing_notification_id;
  ELSE
    -- Create new notification
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, metadata, action_key)
      VALUES (
        post_owner_id,
        'like',
        'Nuevo me gusta',
        liker_username || ' le gustó tu publicación (+5 XP)',
        jsonb_build_object(
          'from_user', liker_username,
          'from_user_id', NEW.user_id,
          'from_user_avatar', liker_avatar,
          'post_id', NEW.post_id,
          'post_preview', SUBSTRING(post_content, 1, 100),
          'post_media', post_media,
          'xp_gained', 5,
          'like_count', 1
        ),
        notification_action_key
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Notification was just created by another process, update it instead
        SELECT COUNT(*) INTO like_count
        FROM likes
        WHERE post_id = NEW.post_id;
        
        UPDATE notifications
        SET 
          message = CASE
            WHEN like_count = 1 THEN liker_username || ' le gustó tu publicación (+5 XP)'
            WHEN like_count = 2 THEN liker_username || ' y 1 usuario más les gustó tu publicación (+' || (like_count * 5) || ' XP)'
            ELSE liker_username || ' y ' || (like_count - 1) || ' usuarios más les gustó tu publicación (+' || (like_count * 5) || ' XP)'
          END,
          metadata = jsonb_set(
            jsonb_set(
              jsonb_set(
                metadata,
                '{from_user}', to_jsonb(liker_username)
              ),
              '{from_user_avatar}', to_jsonb(liker_avatar)
            ),
            '{like_count}', to_jsonb(like_count)
          ),
          is_read = false,
          created_at = NOW(),
          updated_at = NOW()
        WHERE action_key = notification_action_key;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like notifications
DROP TRIGGER IF EXISTS like_notification_trigger ON likes;
CREATE TRIGGER like_notification_trigger
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

-- Function to delete like notification when like is removed
CREATE OR REPLACE FUNCTION delete_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_action_key TEXT;
  remaining_likes INTEGER;
  latest_liker_username TEXT;
  latest_liker_avatar TEXT;
  latest_liker_id UUID;
  existing_metadata JSONB;
  notification_id UUID;
BEGIN
  -- Create the same action key used when creating the notification (per post)
  notification_action_key := 'like_' || OLD.post_id;
  
  -- Check how many likes remain for this post
  SELECT COUNT(*) INTO remaining_likes
  FROM likes
  WHERE post_id = OLD.post_id;
  
  IF remaining_likes = 0 THEN
    -- No likes left, delete the notification
    DELETE FROM notifications WHERE action_key = notification_action_key;
  ELSE
    -- Still have likes, update the notification with new count and latest liker
    -- Get the most recent liker (not the one being deleted)
    SELECT l.user_id, p.username, p.avatar_url 
    INTO latest_liker_id, latest_liker_username, latest_liker_avatar
    FROM likes l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.post_id = OLD.post_id
    ORDER BY l.created_at DESC
    LIMIT 1;
    
    -- Get existing notification
    SELECT id, metadata INTO notification_id, existing_metadata
    FROM notifications
    WHERE action_key = notification_action_key;
    
    IF notification_id IS NOT NULL THEN
      -- Update notification with new count
      UPDATE notifications
      SET 
        message = CASE
          WHEN remaining_likes = 1 THEN latest_liker_username || ' le gustó tu publicación (+5 XP)'
          WHEN remaining_likes = 2 THEN latest_liker_username || ' y 1 usuario más les gustó tu publicación (+' || (remaining_likes * 5) || ' XP)'
          ELSE latest_liker_username || ' y ' || (remaining_likes - 1) || ' usuarios más les gustó tu publicación (+' || (remaining_likes * 5) || ' XP)'
        END,
        metadata = jsonb_set(
          jsonb_set(
            jsonb_set(
              existing_metadata,
              '{from_user}', to_jsonb(latest_liker_username)
            ),
            '{from_user_avatar}', to_jsonb(latest_liker_avatar)
          ),
          '{like_count}', to_jsonb(remaining_likes)
        ),
        updated_at = NOW()
      WHERE id = notification_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to delete like notification when like is removed
DROP TRIGGER IF EXISTS delete_like_notification_trigger ON likes;
CREATE TRIGGER delete_like_notification_trigger
AFTER DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION delete_like_notification();

-- Function to create comment notification
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  commenter_username TEXT;
  commenter_avatar TEXT;
  post_owner_id UUID;
  post_content TEXT;
  post_media TEXT;
  notification_action_key TEXT;
BEGIN
  -- Get post owner and content
  SELECT author_id, content, media_url INTO post_owner_id, post_content, post_media
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
  IF post_owner_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter info
  SELECT username, avatar_url INTO commenter_username, commenter_avatar
  FROM profiles
  WHERE id = NEW.author_id;
  
  -- Create unique action key: comment_{comment_id}
  notification_action_key := 'comment_' || NEW.id;
  
  -- Try to insert, if it fails due to duplicate action_key, ignore it
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, metadata, action_key)
    VALUES (
      post_owner_id,
      'comment',
      'Nuevo comentario',
      commenter_username || ' comentó en tu publicación (+3 XP)',
      jsonb_build_object(
        'from_user', commenter_username,
        'from_user_id', NEW.author_id,
        'from_user_avatar', commenter_avatar,
        'post_id', NEW.post_id,
        'post_preview', SUBSTRING(post_content, 1, 100),
        'post_media', post_media,
        'xp_gained', 3
      ),
      notification_action_key
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Notification already exists, do nothing
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment notifications
DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();

-- Function to delete comment notification when comment is removed
CREATE OR REPLACE FUNCTION delete_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_action_key TEXT;
BEGIN
  -- Create the same action key used when creating the notification
  notification_action_key := 'comment_' || OLD.id;
  
  -- Delete the notification using the action key
  DELETE FROM notifications WHERE action_key = notification_action_key;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to delete comment notification when comment is removed
DROP TRIGGER IF EXISTS delete_comment_notification_trigger ON comments;
CREATE TRIGGER delete_comment_notification_trigger
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION delete_comment_notification();
