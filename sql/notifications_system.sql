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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

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
  
  -- Only create notification if XP increased
  IF xp_diff > 0 THEN
    -- Create XP gained notification
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.id,
      'xp_gained',
      '¡Ganaste experiencia!',
      'Has ganado ' || xp_diff || ' puntos de experiencia',
      jsonb_build_object('xp_amount', xp_diff)
    );
  END IF;
  
  -- Check for level up
  old_level := OLD.level;
  new_level := NEW.level;
  
  IF new_level > old_level THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.id,
      'level_up',
      '¡Subiste de nivel!',
      '¡Felicidades! Ahora eres nivel ' || new_level,
      jsonb_build_object('new_level', new_level, 'old_level', old_level)
    );
  END IF;
  
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
  post_owner_id UUID;
BEGIN
  -- Get post owner
  SELECT user_id INTO post_owner_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user likes their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get liker username
  SELECT username INTO liker_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    post_owner_id,
    'like',
    'Nuevo me gusta',
    liker_username || ' le gustó tu publicación',
    jsonb_build_object('from_user', liker_username, 'post_id', NEW.post_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like notifications
DROP TRIGGER IF EXISTS like_notification_trigger ON likes;
CREATE TRIGGER like_notification_trigger
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_like_notification();

-- Function to create follow notification
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  follower_username TEXT;
BEGIN
  -- Get follower username
  SELECT username INTO follower_username
  FROM profiles
  WHERE id = NEW.follower_id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.following_id,
    'follow',
    'Nuevo seguidor',
    follower_username || ' comenzó a seguirte',
    jsonb_build_object('from_user', follower_username, 'user_id', NEW.follower_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow notifications
DROP TRIGGER IF EXISTS follow_notification_trigger ON follows;
CREATE TRIGGER follow_notification_trigger
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();
