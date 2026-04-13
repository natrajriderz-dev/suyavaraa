# Supabase Storage Buckets

This app requires the following Supabase storage buckets for media uploads:

- `avatars`
- `posts`
- `verification_media`

## Why these buckets are needed

- `avatars`: profile photo uploads in `src/screens/auth/BasicInfoScreen.js`
- `posts`: media uploads for social posts in `src/screens/main/ImpressScreen.js`
- `verification_media`: video verification uploads in `src/screens/auth/VideoVerificationScreen.js`

## How to create them

1. Open your Supabase project.
2. Go to **Storage** in the left menu.
3. Click **Create new bucket**.
4. Enter the bucket name exactly as listed above.
5. Choose **Public** or **Private** depending on your needs.
6. Save.

## Notes

- If any bucket is missing, uploads will fail with a storage error.
- The code now surfaces a clear error if a bucket does not exist.
