-- Add image_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for message images
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload message images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

-- Allow anyone to view images
CREATE POLICY "Anyone can view message images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own message images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-images' AND auth.uid()::text = (storage.foldername(name))[1]);
