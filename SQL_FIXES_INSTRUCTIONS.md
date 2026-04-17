# SQL Migration Fixes - Instructions

## 📋 **Problem Summary**
Multiple SQL migration files contain errors and inconsistencies causing:
- Schema conflicts (duplicate table definitions)
- Column name mismatches (`interaction_id` vs `conversation_id`)
- Incorrect RLS policies
- Missing dependencies
- Function conflicts

## 🚀 **Solution Options**

### **Option A: Quick Fix (Recommended)**
For existing database with minimal disruption:

1. **Login to Supabase Dashboard**
   - Go to https://mocbhyhccwwbczcqcdwb.supabase.co
   - Navigate to SQL Editor

2. **Run `FIX_CRITICAL_ERRORS.sql`**
   ```sql
   -- Copy entire content from FIX_CRITICAL_ERRORS.sql
   -- Paste into SQL Editor
   -- Click "Run"
   ```

3. **Verify Fixes**
   ```sql
   -- Test 1: Check admin function
   SELECT public.is_admin();
   
   -- Test 2: Check fish trap columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'fish_trap_messages' 
   AND column_name IN ('interaction_id', 'conversation_id');
   
   -- Test 3: Check decoy profiles
   SELECT COUNT(*) FROM public.decoy_profiles WHERE is_active = true;
   ```

### **Option B: Complete Rebuild**
For fresh database or major cleanup:

1. **Backup existing data** (if needed)
2. **Run `FIXED_COMPLETE_MIGRATION.sql`**
   - This creates unified schema
   - Seeds all required data
   - Sets up all RLS policies

3. **Verify Complete Setup**
   ```sql
   -- Check all tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

### **Option C: Sequential Fix**
If you want to preserve existing migrations:

Run migrations in this exact order:
```
1. supabase/migrations/20260415_workflow_admin_backend.sql
2. supabase/migrations/trust_and_verification.sql  
3. supabase/migrations/notification_tokens.sql
4. supabase/migrations/fish_trap_schema.sql
5. supabase/migrations/20260416_core_tables.sql
6. supabase/migrations/20260416_safety_features.sql
7. supabase/migrations/seed_decoys_data.sql
8. FIX_CRITICAL_ERRORS.sql  (to fix remaining issues)
```

## 🔧 **Specific Errors Fixed**

### 1. **Admin Check Fix**
**Problem**: Multiple `is_admin()` functions, incorrect RLS policies
**Fix**: Unified function using `admin_users` table

### 2. **Fish Trap Schema Fix**
**Problem**: `interaction_id` vs `conversation_id` confusion
**Fix**: Added both columns for compatibility

### 3. **Decoy Profiles Fix**
**Problem**: Column name mismatch between table definition and seed data
**Fix**: Added both `name/age` and `persona_name/persona_age` columns

### 4. **RLS Policy Fix**
**Problem**: Policies using `auth.jwt() ->> 'role'` or wrong table references
**Fix**: Standardized policies using `public.is_admin()`

### 5. **Missing Columns Fix**
**Problem**: Some migrations assume columns exist that don't
**Fix**: Added `ADD COLUMN IF NOT EXISTS` for all required columns

## 🧪 **Testing After Fixes**

### Test 1: Admin Dashboard
1. Open `admin.html` in browser
2. Login with admin credentials
3. Verify all sections load without errors
4. Test ban/unban functionality

### Test 2: Fish Trap System
1. Check unverified users see decoy profiles
2. Test decoy chat initiation
3. Verify messages save to database

### Test 3: Verification System
1. Test verification request submission
2. Verify admin can review requests

## 📊 **Database Verification Queries**

```sql
-- Verify all critical tables exist
SELECT 'users' as table, COUNT(*) as count FROM users UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users UNION ALL
SELECT 'decoy_profiles', COUNT(*) FROM decoy_profiles UNION ALL
SELECT 'fish_trap_interactions', COUNT(*) FROM fish_trap_interactions UNION ALL
SELECT 'fish_trap_messages', COUNT(*) FROM fish_trap_messages UNION ALL
SELECT 'notification_tokens', COUNT(*) FROM notification_tokens UNION ALL
SELECT 'verification_requests', COUNT(*) FROM verification_requests UNION ALL
SELECT 'contact_info_logs', COUNT(*) FROM contact_info_logs UNION ALL
SELECT 'reports', COUNT(*) FROM reports UNION ALL
SELECT 'user_blocks', COUNT(*) FROM user_blocks;

-- Check column compatibility
SELECT 
  'fish_trap_messages' as table,
  COUNT(*) as has_interaction_id
FROM information_schema.columns 
WHERE table_name = 'fish_trap_messages' 
AND column_name = 'interaction_id';

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'posts', 'messages', 'fish_trap_messages');
```

## ⚠️ **Important Notes**

1. **Storage Buckets**: SQL migrations don't create storage buckets. Create these manually in Supabase UI:
   - `avatars` (public)
   - `posts` (public) 
   - `verification_media` (private)

2. **Environment Variables**: Ensure these are set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_DEEPSEEK_API_KEY`

3. **Existing Data**: If database has existing data, test fixes on staging first.

4. **App Compatibility**: After database fixes, ensure app code matches schema.

## 📞 **Support**

If issues persist after applying fixes:

1. Check Supabase logs for specific errors
2. Verify table structures match expected schema
3. Test individual queries from app services
4. Compare with `FIXED_COMPLETE_MIGRATION.sql` schema

## ✅ **Expected Outcome**
After applying fixes:
- ✅ All SQL migrations run without errors
- ✅ Admin dashboard loads and functions
- ✅ Fish trap system works (decoy profiles, chats)
- ✅ Verification system operates
- ✅ No "column does not exist" errors
- ✅ RLS policies allow proper access control