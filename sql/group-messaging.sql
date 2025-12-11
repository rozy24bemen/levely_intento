-- Group messaging extension for LEVELY

-- Create group_conversations table
CREATE TABLE IF NOT EXISTS public.group_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_conversations_last_message ON public.group_conversations(last_message_at DESC);

-- Row Level Security
ALTER TABLE public.group_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Policies: members and owners can view
DROP POLICY IF EXISTS "Members can view group conversations" ON public.group_conversations;
CREATE POLICY "Members can view group conversations"
  ON public.group_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert group messages" ON public.group_messages;
CREATE POLICY "Members can insert group messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages"
  ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

-- Function to create a group (owner + members array)
CREATE OR REPLACE FUNCTION create_group(owner UUID, member_ids UUID[], group_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  members_count INT;
  m UUID;
BEGIN
  members_count := array_length(member_ids, 1);
  IF members_count IS NULL THEN
    members_count := 0;
  END IF;

  -- Limit total members to 3 (owner + up to 2 others)
  IF members_count > 2 THEN
    RAISE EXCEPTION 'Group cannot have more than 3 users total (owner + 2)';
  END IF;

  INSERT INTO public.group_conversations (name, owner_id)
  VALUES (group_name, owner)
  RETURNING id INTO new_group_id;

  -- Insert owner as member
  INSERT INTO public.group_members (group_id, user_id) VALUES (new_group_id, owner);

  -- Insert other members
  FOREACH m IN ARRAY member_ids LOOP
    INSERT INTO public.group_members (group_id, user_id) VALUES (new_group_id, m);
  END LOOP;

  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send message in a group and update last_message_at
CREATE OR REPLACE FUNCTION send_group_message(g_id UUID, sender UUID, msg TEXT)
RETURNS UUID AS $$
DECLARE
  new_msg_id UUID;
BEGIN
  INSERT INTO public.group_messages (group_id, sender_id, content)
  VALUES (g_id, sender, msg)
  RETURNING id INTO new_msg_id;

  UPDATE public.group_conversations SET last_message_at = NOW() WHERE id = g_id;

  RETURN new_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions to authenticated
GRANT EXECUTE ON FUNCTION create_group(UUID, UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_group_message(UUID, UUID, TEXT) TO authenticated;

-- Allow authenticated to select/insert on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_messages TO authenticated;
