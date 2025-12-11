-- Create Groups System for LEVELY
-- Execute this script in your Supabase SQL Editor to add group chat functionality

-- ============================================
-- CREATE ALL TABLES FIRST
-- ============================================

-- GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_groups_owner ON public.groups(owner_id);

-- GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- GROUP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON public.group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON public.group_messages(created_at DESC);

-- ============================================
-- ENABLE RLS AND CREATE POLICIES
-- ============================================

-- GROUPS POLICIES
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;
CREATE POLICY "Users can view their groups"
  ON public.groups FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = id)
  );

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update group" ON public.groups;
CREATE POLICY "Owner can update group"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can delete group" ON public.groups;
CREATE POLICY "Owner can delete group"
  ON public.groups FOR DELETE
  USING (auth.uid() = owner_id);

-- GROUP MEMBERS POLICIES
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
CREATE POLICY "Users can view group members"
  ON public.group_members FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_members.group_id)
  );

DROP POLICY IF EXISTS "Group owners can add members" ON public.group_members;
CREATE POLICY "Group owners can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT owner_id FROM groups WHERE id = group_id)
  );

DROP POLICY IF EXISTS "Members can leave groups" ON public.group_members;
CREATE POLICY "Members can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- GROUP MESSAGES POLICIES
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view group messages" ON public.group_messages;
CREATE POLICY "Users can view group messages"
  ON public.group_messages FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_messages.group_id)
  );

DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;
CREATE POLICY "Group members can send messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_messages.group_id)
  );

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.group_messages;
CREATE POLICY "Users can delete their own messages"
  ON public.group_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================
-- FUNCTION: Create Group
-- ============================================

CREATE OR REPLACE FUNCTION create_group(
  p_name TEXT,
  p_owner_id UUID,
  p_member_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  member_id UUID;
BEGIN
  -- Create the group
  INSERT INTO public.groups (name, owner_id)
  VALUES (p_name, p_owner_id)
  RETURNING id INTO new_group_id;
  
  -- Add owner as member
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (new_group_id, p_owner_id);
  
  -- Add other members
  IF p_member_ids IS NOT NULL THEN
    FOREACH member_id IN ARRAY p_member_ids
    LOOP
      IF member_id != p_owner_id THEN
        INSERT INTO public.group_members (group_id, user_id)
        VALUES (new_group_id, member_id)
        ON CONFLICT (group_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Groups system created successfully!' as status;
