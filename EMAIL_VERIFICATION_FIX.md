# Email Verification Error - Complete Fix Guide

## Problem
Users see error: "**email not confirmed**" during login, even though their email shows as confirmed in the user record.

**User data example:**
```json
{
  "confirmed_at": "2026-04-13 04:44:29.975866+00",
  "raw_user_meta_data": {
    "email_verified": true
  }
}
```

## Root Cause
Supabase Email provider requires email confirmation by default (production setting). The error occurs because:
1. Signup doesn't auto-confirm emails
2. Supabase auth session rejects unconfirmed emails at login
3. Even if `confirmed_at` is set, the API may still block login

---

## PERMANENT SOLUTION (Recommended)

### **Step 1: Disable Email Confirmation in Supabase (QUICKEST FIX)**

Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email Provider**:

1. Click **Email** provider
2. Look for toggle: **"Require email confirmation before signing in"**
3. **Toggle OFF** ❌
4. Click **Save**

**This solves the problem instantly for all existing and new users.**

---

## ALTERNATIVE SOLUTION (If you need email confirmation for production)

### **Step 2: Configure Email Verification Flow**

If you need email confirmation for security reasons, follow this approach:

#### A. Update Supabase Settings
1. Keep email confirmation **enabled**
2. Configure redirect URL: `Authentication → URL Configuration`
3. Add: `suyavaraa://auth/confirm?token_hash={{token_hash}}&type={{type}}`

#### B. Update Email Service
In `src/services/moderationService.js` or create new email service:
```javascript
const sendConfirmationEmail = async (email, confirmationUrl) => {
  // Send email with link containing token
  // User clicks link to confirm email
};
```

---

## WHAT WAS UPDATED IN CODE

### 1. **SignupScreen.js** (Auto-confirmation approach)
- Now auto-logs in users immediately after signup
- No confirmation email wait required
- Users proceed directly to profile setup

### 2. **LoginScreen.js** (Error handling)
- Added graceful handling for "email not confirmed" errors
- Provides user-friendly error message
- Can be extended to auto-confirm or resend confirmation link

---

## HOW TO VERIFY THE FIX

### Test Case 1: Create New User
1. Delete test account from Supabase
2. Sign up with: `test@example.com` / `password123`
3. Should see immediate login or profile setup
4. ✅ Should NOT see "email not confirmed" error

### Test Case 2: Existing User
For user `divya.bharatig@gmail.com`:
1. Try logging in with their password
2. Should now work (after disabling confirmation requirement)
3. ✅ Should proceed to home screen

---

## Configuration Check

Your current setup (**from .env.local**):
```
EXPO_PUBLIC_SUPABASE_URL=https://gvajzwhyszzxvxohwfey.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Verify in dashboard:** https://app.supabase.com → Select project `suyavaraa`

---

## Summary

| Approach | Pros | Cons | Timeline |
|----------|------|------|----------|
| **Disable Confirmation** | Instant fix, no code changes needed | Less secure | ⚡ 30 seconds |
| **Auto-confirm on Signup** | Added to code | Still needs Supabase setting | 📝 Already done |
| **Email Verification Flow** | Most secure | Most complex | 📅 1-2 hours |

**Recommended:** Go with **Step 1** (disable confirmation) for immediate fix, then evaluate security needs.

---

## Still Having Issues?

If error persists after disabling confirmation:
1. Check browser cache/app cache
2. Force close and restart the app
3. Check if token hasn't expired (invalid JWT)
4. Review Supabase logs: Authentication → Audit Logs
