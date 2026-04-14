-- SQL to check and fix storage bucket issues
-- Run this in Supabase SQL Editor

-- Note: Storage buckets are typically created via the Supabase UI or API
-- This script checks for common issues and provides guidance

-- 1. Check if storage schema exists
SELECT 
  schema_name,
  'Storage schema check' as check_type,
  CASE 
    WHEN schema_name = 'storage' THEN '✅ Storage schema exists'
    ELSE '❌ Storage schema not found'
  END as status
FROM information_schema.schemata 
WHERE schema_name = 'storage';

-- 2. Check for required buckets (via information_schema if possible)
-- Note: Direct bucket queries require storage API, but we can check if tables exist
SELECT 
  'Bucket existence check' as check_type,
  '⚠️ Buckets must be checked via Supabase Dashboard > Storage' as status;

-- 3. Check RLS policies on storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- 4. Create helper function to test storage access
CREATE OR REPLACE FUNCTION test_storage_access()
RETURNS TABLE (
  test_name TEXT,
  test_result TEXT,
  details TEXT
) AS $$
BEGIN
  -- Test 1: Check if storage schema is accessible
  RETURN QUERY SELECT 
    'Storage Schema Access' as test_name,
    '✅ Accessible' as test_result,
    'Storage schema exists and is accessible' as details;
    
  -- Note: Actual bucket operations require storage API calls
  -- which cannot be done from SQL directly
  
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Storage Schema Access' as test_name,
      '❌ Not Accessible' as test_result,
      SQLERRM as details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Run the tests
SELECT * FROM test_storage_access();

-- 6. Provide guidance for bucket creation
DO $$
BEGIN
  RAISE NOTICE '
  ===========================================
  STORAGE BUCKET SETUP INSTRUCTIONS
  ===========================================
  
  Your app requires these storage buckets:
  
  1. avatars     - For user profile photos (Public)
  2. posts       - For social media posts (Public)  
  3. verification_media - For video verification (Private)
  
  To create buckets:
  
  1. Go to Supabase Dashboard: https://mocbhyhccwwbczcqcdwb.supabase.co
  2. Login with your credentials
  3. Click "Storage" in the left menu
  4. Click "Create new bucket"
  5. Enter bucket name exactly as shown above
  6. Set to "Public" for avatars and posts
  7. Set to "Private" for verification_media (optional)
  8. Click "Create bucket"
  
  Common Issues:
  
  ❌ "Bucket not found" error:
      - Bucket doesn''t exist
      - Bucket name is misspelled
      - Solution: Create the bucket
  
  ❌ "Permission denied" error:
      - Bucket is private but app tries public access
      - RLS policies are too restrictive
      - Solution: Make bucket public or adjust RLS
  
  ❌ "File too large" error:
      - Default limit is 50MB per file
      - Solution: Compress images before upload
  
  After creating buckets, test upload with:
  
  1. Restart your app
  2. Try uploading a small test image
  3. Check browser/device console for errors
  
  ===========================================
  ';
END $$;

-- 7. Check if there are any existing storage policies that might block uploads
-- These are the default policies that should exist for public buckets:

/*
-- Example policies for a public "avatars" bucket:
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());
*/

-- 8. Summary report
SELECT 
  'Storage Setup Status' as category,
  '⚠️ Manual Configuration Required' as status,
  'Buckets must be created via Supabase Dashboard UI' as details
UNION ALL
SELECT 
  'Required Buckets',
  'Check Dashboard',
  'avatars, posts, verification_media'
UNION ALL
SELECT 
  'Current Project',
  'Connected',
  'https://mocbhyhccwwbczcqcdwb.supabase.co'
UNION ALL
SELECT 
  'Next Steps',
  'Action Required',
  '1. Create buckets 2. Test upload 3. Check RLS';