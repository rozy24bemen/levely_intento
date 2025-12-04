-- Storage bucket for user avatars
-- Execute this script in your Supabase SQL Editor

-- ============================================
-- CREATE AVATARS BUCKET (if not exists via UI)
-- ============================================
-- You need to create the bucket via Supabase Dashboard first:
-- 1. Go to Storage
-- 2. Click "New bucket"
-- 3. Name: avatars
-- 4. Public bucket: YES
-- 5. Click "Create bucket"

-- ============================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ============================================

-- Allow authenticated users to upload their own avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow everyone to view avatars (public bucket)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT 'Avatars storage policies installed successfully!' AS status;

-- Check policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;
