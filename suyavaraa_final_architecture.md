# Suyavaraa — Final Architecture Spec & Codex Prompt
# Version: MVP Launch
# Last updated: April 2026
# Decisions locked in: All 6 confirmed

---

## CONFIRMED DECISIONS

| Decision | Answer |
|---|---|
| Matchmaking AI | After 5K users — skip MVP |
| DB separation | Separate tables per mode |
| Grievance Officer | Founder (Natraj) |
| AI Customer Support | Claude API (Sonnet) |
| Photo/Post Moderation | Admin team of 5, manual approval |
| AI moderation cost | ₹0 until 10K users |

---

# PART A — SUPABASE SCHEMA (Run in SQL Editor)

## A1 — Shared Tables (already exist, minor additions)

```sql
-- Add preferred_mode and grievance fields to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_mode TEXT DEFAULT 'dating',
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'BasicInfo',
  ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Profile views (shared, tracks who viewed whom)
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);

-- Photo approval queue (ALL uploaded photos need admin approval before display)
CREATE TABLE IF NOT EXISTS photo_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'profile', -- 'profile' | 'post' | 'verification'
  status TEXT DEFAULT 'pending',     -- 'pending' | 'approved' | 'rejected'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_photo_approvals_status ON photo_approvals(status);
CREATE INDEX IF NOT EXISTS idx_photo_approvals_user_id ON photo_approvals(user_id);
```

## A2 — Admin Team Tables

```sql
-- Admin users with roles
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'moderator',
  -- roles: 'super_admin' | 'moderator' | 'support' | 'viewer'
  permissions JSONB DEFAULT '{}',
  -- {
  --   "approve_photos": true,
  --   "approve_posts": true,
  --   "resolve_reports": true,
  --   "manage_verifications": true,
  --   "view_users": true,
  --   "ban_users": true,
  --   "view_messages": false,    -- privacy — only super_admin
  --   "manage_admins": false     -- only super_admin
  -- }
  invited_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

-- Admin activity log (audit trail)
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  -- 'approved_photo' | 'rejected_photo' | 'approved_post' | 'rejected_post'
  -- 'resolved_report' | 'banned_user' | 'verified_user' | 'closed_feedback'
  target_id UUID,           -- the photo/post/user/report ID acted on
  target_type TEXT,         -- 'photo' | 'post' | 'user' | 'report'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created_at ON admin_activity_log(created_at DESC);

-- Admin invitations (how you onboard your 5 team members)
CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'moderator',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES users(id),
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  accepted BOOLEAN DEFAULT FALSE,
  accepted_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## A3 — Dating Mode Tables (separate)

```sql
-- Dating likes
CREATE TABLE IF NOT EXISTS dating_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  liked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  super_like BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(liker_id, liked_id)
);
CREATE INDEX IF NOT EXISTS idx_dating_likes_liked_id ON dating_likes(liked_id);

-- Dating matches (mutual likes)
CREATE TABLE IF NOT EXISTS dating_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active' | 'unmatched' | 'blocked'
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);
CREATE INDEX IF NOT EXISTS idx_dating_matches_user1 ON dating_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_dating_matches_user2 ON dating_matches(user2_id);

-- Dating messages
CREATE TABLE IF NOT EXISTS dating_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES dating_matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  message_type TEXT DEFAULT 'text', -- 'text' | 'image' | 'gif'
  is_read BOOLEAN DEFAULT FALSE,
  moderated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dating_messages_match_id ON dating_messages(match_id);

-- Impress posts (dating only)
CREATE TABLE IF NOT EXISTS dating_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls TEXT[],
  tribe_tags TEXT[],
  visibility TEXT DEFAULT 'public', -- 'public' | 'matches_only'
  status TEXT DEFAULT 'pending',    -- 'pending' | 'approved' | 'rejected'
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dating_posts_status ON dating_posts(status);
CREATE INDEX IF NOT EXISTS idx_dating_posts_user_id ON dating_posts(user_id);

-- Post reactions (dating)
CREATE TABLE IF NOT EXISTS dating_post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES dating_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Tribes (dating communities)
CREATE TABLE IF NOT EXISTS tribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  cover_image_url TEXT,
  member_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tribe_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tribe_id UUID REFERENCES tribes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'member' | 'moderator'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tribe_id, user_id)
);
```

## A4 — Matrimony Mode Tables (separate)

```sql
-- Matrimony profile (extra fields for matrimony only)
CREATE TABLE IF NOT EXISTS matrimony_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  religion TEXT,
  caste TEXT,
  sub_caste TEXT,
  mother_tongue TEXT,
  education TEXT,
  annual_income TEXT,
  family_type TEXT,       -- 'nuclear' | 'joint'
  family_values TEXT,     -- 'traditional' | 'moderate' | 'liberal'
  manglik TEXT,           -- 'yes' | 'no' | 'dont_care'
  horoscope_match BOOLEAN DEFAULT FALSE,
  looking_for TEXT,       -- 'bride' | 'groom'
  preference_mode TEXT DEFAULT 'zone', -- 'zone' | 'community'
  zone_region TEXT,       -- city/district for zone-based
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communities (zone-based OR community-based)
CREATE TABLE IF NOT EXISTS communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,         -- 'zone' | 'community'
  description TEXT,
  region TEXT,                -- for zone type: city/district
  religion TEXT,              -- for community type: religion name
  caste_neutral BOOLEAN DEFAULT FALSE,  -- zone-based = true always
  language TEXT,
  cover_image_url TEXT,
  member_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,    -- admin verified community
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community channels (sub-groups within a community)
CREATE TABLE IF NOT EXISTS community_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT DEFAULT 'general',
  -- 'general' | 'parents' | 'youth' | 'elders' | 'announcements'
  description TEXT,
  is_parents_channel BOOLEAN DEFAULT FALSE,
  member_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community memberships (free / premium / family)
CREATE TABLE IF NOT EXISTS community_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'free',     -- 'free' | 'premium' | 'family'
  role TEXT DEFAULT 'member',   -- 'member' | 'parent' | 'moderator' | 'admin'
  paid_until TIMESTAMPTZ,
  payment_reference TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, community_id)
);
CREATE INDEX IF NOT EXISTS idx_community_memberships_user ON community_memberships(user_id);

-- Family accounts (parent linked to matrimony seeker)
CREATE TABLE IF NOT EXISTS family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'parent',   -- 'parent' | 'guardian'
  can_message BOOLEAN DEFAULT FALSE,
  can_view_proposals BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(primary_user_id, member_user_id)
);

-- Community channel messages
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  message_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'visible'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id);

-- Matrimony interests (like/express interest, not swipe)
CREATE TABLE IF NOT EXISTS matrimony_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,                   -- optional intro message
  status TEXT DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_matrimony_interests_receiver ON matrimony_interests(receiver_id);

-- Matrimony matches (accepted interests)
CREATE TABLE IF NOT EXISTS matrimony_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',  -- 'active' | 'closed' | 'blocked'
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Matrimony messages
CREATE TABLE IF NOT EXISTS matrimony_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matrimony_matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  message_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  visible_to_family BOOLEAN DEFAULT FALSE,  -- family accounts can see if true
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matrimony_messages_match ON matrimony_messages(match_id);

-- Suyamvaram — curated proposals (admin-curated or AI later)
CREATE TABLE IF NOT EXISTS suyamvaram_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  curated_by UUID REFERENCES users(id),   -- admin who curated it
  reason TEXT,                            -- why this match
  compatibility_score INT,
  status TEXT DEFAULT 'pending',          -- 'pending' | 'interested' | 'declined' | 'matched'
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## A5 — AI Customer Support Table

```sql
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open',         -- 'open' | 'escalated' | 'resolved'
  escalated_to UUID REFERENCES users(id),  -- admin who picked it up
  category TEXT,                      -- 'billing' | 'safety' | 'account' | 'general'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                 -- 'user' | 'assistant' | 'admin'
  content TEXT NOT NULL,
  is_escalation_trigger BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_conv ON support_messages(conversation_id);
```

## A6 — Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE photo_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own photo approvals
CREATE POLICY "users_own_photo_approvals" ON photo_approvals
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can see all photo approvals
CREATE POLICY "admin_all_photo_approvals" ON photo_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = TRUE)
  );

-- Dating posts: users see only approved posts OR their own
CREATE POLICY "dating_posts_visibility" ON dating_posts
  FOR SELECT USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = TRUE)
  );

-- Admin users table: only super_admin can manage
CREATE POLICY "admin_users_super_only" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = TRUE
    )
  );
```

---

# PART B — ADMIN MULTI-ACCOUNT SYSTEM

## B1 — Admin Roles & Permissions Matrix

```
Role          | Photos | Posts | Reports | Verifications | Users | Messages | Admins
──────────────|────────|───────|─────────|───────────────|───────|──────────|───────
super_admin   |  ✅    |  ✅   |   ✅    |      ✅       |  ✅   |    ✅    |   ✅
moderator     |  ✅    |  ✅   |   ✅    |      ✅       |  👁️   |    ❌    |   ❌
support       |  ❌    |  ❌   |   ✅    |      ❌       |  👁️   |    ❌    |   ❌
viewer        |  👁️    |  👁️   |   👁️    |      👁️       |  👁️   |    ❌    |   ❌

✅ = full access  👁️ = view only  ❌ = no access
```

## B2 — Admin Invitation Flow

```
1. Super admin (you) opens Admin Settings in app
2. Enter team member's email + select role
3. System creates row in admin_invitations table + sends email with magic link
4. Team member clicks link → creates Supabase account with that email
5. System checks admin_invitations table → creates admin_users row
6. Team member now sees admin dashboard with their role's permissions
```

## B3 — Admin Dashboard Screens Needed

```
AdminDashboard (home — stats overview)
  ├── PhotoQueue          ← NEW: pending photos waiting approval
  │     - Profile photos (uploaded during onboarding/edit)
  │     - Post media (dating_posts with status=pending)
  │     - Verification photos
  │     Action: Approve / Reject (with reason)
  │
  ├── PostQueue           ← NEW: pending Impress posts
  │     - Caption + media preview
  │     - User info + trust score
  │     Action: Approve / Reject (with reason → user notified)
  │
  ├── ReportsQueue        ← EXISTING (improve it)
  │     - User reports (harassment, fake, scam)
  │     - Auto-flagged content
  │     Action: Resolve / Dismiss / Ban user
  │
  ├── VerificationQueue   ← EXISTING (improve it)
  │     - Users who submitted verification video/photo
  │     Action: Approve / Reject → updates trust_level
  │
  ├── SupportQueue        ← NEW: escalated Claude support chats
  │     - Conversations flagged by AI for human review
  │     - Admin can reply as "Suyavaraa Team"
  │
  ├── UserManagement      ← NEW
  │     - Search user by email/name
  │     - View profile, trust score, reports against them
  │     - Actions: Warn / Suspend / Ban / Unban
  │
  ├── SuyamvaramManager   ← NEW (matrimony only)
  │     - Manually curate proposals
  │     - Assign compatibility score + reason
  │
  ├── TeamSettings        ← NEW (super_admin only)
  │     - Invite team member (email + role)
  │     - View active admins + their activity
  │     - Revoke access
  │
  └── ActivityLog         ← NEW (super_admin only)
        - All admin actions with timestamp
        - Filter by admin / action type / date
```

---

# PART C — AI CUSTOMER SUPPORT IMPLEMENTATION

## C1 — Support Flow

```
User opens Support → "Chat with Suyavaraa AI"
  │
  ├── Claude handles:
  │   - How to use features
  │   - Why photos are pending (photo approval explained)
  │   - Premium questions
  │   - Account recovery steps
  │   - Reporting guidance
  │   - General app help
  │
  └── Claude ESCALATES (creates support ticket) when:
      - Keywords: "payment", "refund", "charged", "scam", "harass",
                  "abuse", "fake", "suicide", "harm", "legal", "lawsuit"
      - User frustration score high (repeating same question 3+ times)
      - User explicitly asks for human
      → Sets support_conversations.status = 'escalated'
      → Admin sees it in SupportQueue
      → Admin replies as "Suyavaraa Team" in same thread
```

## C2 — Claude Support System Prompt

```javascript
// src/services/supportService.js

const SUPPORT_SYSTEM_PROMPT = `You are Suyavaraa's support assistant — a warm, helpful AI 
for a dating and matrimony app used primarily in India.

ABOUT SUYAVARAA:
- Dating mode: swipe-based matching, Impress feed (posts), Tribes (communities)
- Matrimony mode: profile-based matching, Zone-based (secular/modern), 
  Community-based (religion/region/language groups), Suyamvaram (curated proposals)
- Premium: unlocks both modes, unlimited matches, community membership
- Trust score: based on profile completeness + admin verification

YOUR ROLE:
- Answer in the same language the user writes in (Tamil, Hindi, English, Telugu etc.)
- Be warm and respectful — many users may be from conservative backgrounds
- Never judge relationship preferences
- Keep responses concise — users are on mobile

WHAT YOU CAN HELP WITH:
- App features and how to use them
- Profile setup and photo upload guidance
- Match and chat questions
- Premium subscription questions
- Reporting harassment or fake profiles
- Account and login issues
- Understanding photo pending/approval status

WHAT TO ESCALATE (say "I'm connecting you with our team" then set escalation):
- Payment disputes or refund requests
- Harassment or safety emergencies
- Legal threats or complaints
- User mentions self-harm or crisis
- Issue unresolved after 3 exchanges

PHOTO APPROVAL CONTEXT:
- All photos are reviewed by our safety team before appearing on profiles
- This takes up to 24 hours
- Reassure users this protects them from fake profiles

ESCALATION TRIGGER FORMAT:
When you need to escalate, include this exact JSON at the end of your message:
{"escalate": true, "category": "billing|safety|legal|crisis|general", "reason": "brief reason"}

GRIEVANCE OFFICER:
If asked about complaints or grievance, provide:
Name: [Founder Name]
Email: grievance@suyavaraa.com
Response time: 48 hours as per IT Act 2021`;
```

## C3 — Support API Call Pattern

```javascript
const callSupportAI = async (conversationId, userMessage, messageHistory) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SUPPORT_SYSTEM_PROMPT,
      messages: [
        ...messageHistory.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        { role: 'user', content: userMessage }
      ]
    })
  });

  const data = await response.json();
  const text = data.content[0]?.text || '';

  // Check for escalation trigger
  const escalationMatch = text.match(/\{"escalate":\s*true[^}]*\}/);
  let shouldEscalate = false;
  let escalationMeta = {};

  if (escalationMatch) {
    try {
      escalationMeta = JSON.parse(escalationMatch[0]);
      shouldEscalate = escalationMeta.escalate === true;
    } catch (e) {}
  }

  // Clean response (remove JSON from display)
  const cleanResponse = text.replace(/\{"escalate"[^}]*\}/, '').trim();

  if (shouldEscalate) {
    await supabase
      .from('support_conversations')
      .update({
        status: 'escalated',
        category: escalationMeta.category || 'general'
      })
      .eq('id', conversationId);
  }

  return { response: cleanResponse, escalated: shouldEscalate };
};
```

---

# PART D — PHOTO APPROVAL FLOW

## D1 — Upload → Pending → Approved flow

```
User uploads photo (profile or post)
  │
  ├── Photo stored in Supabase Storage (private bucket)
  ├── Row inserted into photo_approvals with status='pending'
  ├── Profile photo_url set to NULL until approved
  │   (user sees "Photo pending review" in their profile)
  │
  └── Admin sees in PhotoQueue dashboard
        Admin clicks: APPROVE → photo_approvals.status = 'approved'
                                user_profiles.primary_photo_url = photo_url
                                send push notification to user
        Admin clicks: REJECT  → photo_approvals.status = 'rejected'
                                rejection_reason saved
                                send push notification with reason
                                user can re-upload
```

## D2 — Photo pending UI for users

```javascript
// In ProfileScreen, show pending state:
{profile?.photos?.filter(p => p.status === 'pending').length > 0 && (
  <View style={warningBanner}>
    <Text>⏳ {pendingCount} photo(s) pending review — usually within 24 hours</Text>
  </View>
)}
```

---

# PART E — UPDATED PRIVACY POLICY (Grievance Section)

## Replace Section 12 in the Privacy Policy with:

```
12. Grievance Officer (India — IT Act 2021 & DPDP Act 2023)

In accordance with the Information Technology Act, 2000 and the Digital Personal
Data Protection Act, 2023, the name and contact details of the Grievance Officer are:

Name:            [Your Full Name]
Designation:     Founder & Grievance Officer, Suyavaraa
Email:           grievance@suyavaraa.com
Response time:   Within 48 hours of receipt of complaint

You may raise any complaint regarding:
- Privacy violations or data misuse
- Inappropriate content not removed after reporting
- Account wrongful suspension or ban
- Any violation of your rights under applicable law

The Grievance Officer shall acknowledge your complaint within 24 hours and
resolve it within 15 days of receipt.
```

---

# PART F — CODEX IMPLEMENTATION ORDER

## Phase 1 — Foundation (do first, needed for everything else)

```
1. Run all SQL from Part A in Supabase
2. Update ModeContext.js (simplified version from earlier doc)
3. Update App.js (route to DatingTabs or MatrimonyTabs)
4. Create screens/dating/ folder structure
5. Create screens/matrimony/ folder structure
6. Create screens/shared/AdminScreen.js (move existing)
```

## Phase 2 — Admin Team System

```
7. Create admin_users rows for your 5 team members via SQL:
   INSERT INTO admin_users (user_id, role, permissions, invited_by)
   VALUES (
     '<their_user_id>',
     'moderator',
     '{"approve_photos":true,"approve_posts":true,"resolve_reports":true,
       "manage_verifications":true,"view_users":true,"ban_users":false}',
     '<your_user_id>'
   );

8. Update AdminScreen.js — add these new sections:
   - PhotoQueue tab
   - PostQueue tab
   - SupportQueue tab
   - UserManagement tab
   - TeamSettings tab (super_admin only)
   - ActivityLog tab (super_admin only)

9. Update adminDashboardService.js — add methods:
   - getPendingPhotos()
   - approvePhoto(photoId, adminId)
   - rejectPhoto(photoId, adminId, reason)
   - getPendingPosts()
   - approvePost(postId, adminId)
   - rejectPost(postId, adminId, reason)
   - getEscalatedSupport()
   - replyToSupport(conversationId, adminId, message)
   - searchUsers(query)
   - banUser(userId, adminId, reason)
   - logAdminAction(adminId, action, targetId, targetType, notes)
```

## Phase 3 — Dating Mode Screens

```
10. DatingTabs.js (from earlier doc)
11. DatingHomeStack.js
12. DatingProfileStack.js (copy ProfileStack, hardcode pink theme)
13. DatingChatStack.js (copy ChatStack, use dating_messages table)
14. ImpressStack.js (wrap existing ImpressScreen, use dating_posts)
15. TribesStack.js (move existing)

Key change in DatingProfileStack:
- "Switch to Matrimony" button in Settings calls:
  await switchMode('matrimony')
  navigation.reset({ index: 0, routes: [{ name: 'Matrimony' }] })
```

## Phase 4 — Matrimony Mode Screens

```
16. MatrimonyTabs.js (from earlier doc)
17. MatrimonyHomeStack.js
    - Toggle: Zone-based / Community-based (stored in matrimony_profiles.preference_mode)
18. MatrimonyProfileStack.js (copy ProfileStack, hardcode gold theme, add matrimony fields)
19. MatrimonyChack.js (chat using matrimony_messages table)
20. SuyamvaramStack.js (curated proposals UI)
21. ZonesStack.js (zone-based browse)
22. CommunityStack.js (community channels browse)
23. FamilyAccountScreen.js (link parent account)
```

## Phase 5 — Support & Photo Approval

```
24. SupportScreen.js — Claude-powered chat UI
    - Uses support_conversations + support_messages tables
    - Calls Claude API with SUPPORT_SYSTEM_PROMPT
    - Shows "Connecting to team..." when escalated
    - Admin can reply from SupportQueue in admin dashboard

25. Update EditProfileScreen:
    - After photo upload → insert into photo_approvals (status=pending)
    - Don't show photo in profile until approved
    - Show pending count banner

26. Update onboarding photo upload:
    - Same pending flow
    - User can complete onboarding with pending photo
    - profile_complete = true even if photo pending
```

## Phase 6 — Legal & Launch Prep

```
27. Update Privacy Policy:
    - Add grievance officer name
    - Update hosting location (Singapore or Mumbai)

28. Onboarding consent screen:
    - Checkbox: "I agree to Privacy Policy"
    - Checkbox: "I confirm I am 18 years or older"  
    - For matrimony: "I consent to sharing religion/caste for matchmaking"
    - Save consent timestamp to users table

29. Safety features:
    - Report button visible on every profile card
    - Safe messaging tips link in chat screen
    - Emergency exit (triple-tap logo = go to home screen)

30. Play Store assets:
    - App icon (1024x1024)
    - Feature graphic (1024x500)
    - Screenshots: Dating mode + Matrimony mode (both)
    - Short description (80 chars max)
    - Full description
```

---

# PART G — QUICK START: Create Your 5 Admin Accounts

## Step 1 — Ask each team member to sign up in the app normally

They create a regular Suyavaraa account. Get their user IDs from Supabase:
```sql
SELECT id, full_name, email FROM users WHERE email IN (
  'friend1@email.com',
  'friend2@email.com',
  'friend3@email.com',
  'friend4@email.com',
  'friend5@email.com'
);
```

## Step 2 — Insert admin records

```sql
-- You (super_admin)
INSERT INTO admin_users (user_id, role, permissions)
VALUES (
  '<your_user_id>',
  'super_admin',
  '{"approve_photos":true,"approve_posts":true,"resolve_reports":true,
    "manage_verifications":true,"view_users":true,"ban_users":true,
    "view_messages":true,"manage_admins":true}'
);

-- Each team member (moderator)
INSERT INTO admin_users (user_id, role, permissions, invited_by)
VALUES
  ('<friend1_id>', 'moderator',
   '{"approve_photos":true,"approve_posts":true,"resolve_reports":true,
     "manage_verifications":true,"view_users":true,"ban_users":false}',
   '<your_user_id>'),
  ('<friend2_id>', 'moderator', '...same...', '<your_user_id>'),
  ('<friend3_id>', 'moderator', '...same...', '<your_user_id>'),
  ('<friend4_id>', 'moderator', '...same...', '<your_user_id>'),
  ('<friend5_id>', 'support',
   '{"approve_photos":false,"approve_posts":false,"resolve_reports":true,
     "manage_verifications":false,"view_users":true,"ban_users":false}',
   '<your_user_id>');
```

## Step 3 — They login to the app

The admin dashboard is already behind `isPrivilegedOwner` check.
Update that check to read from `admin_users` table instead of a hardcoded ID list.

---

# PART H — COST SUMMARY (MVP to 10K)

```
Phase         Users    Monthly Cost
──────────────────────────────────────────────
MVP Launch    0-500    ~₹1,500/mo
              Supabase free, Expo free, KVM ₹1,200

Growth        500-2K   ~₹4,000/mo  
              Supabase Pro $25, Claude API ~$10

Scaling       2K-10K   ~₹15,000/mo
              Supabase Pro, Claude API ~$50-80
              No AI moderation cost (admin team)
              No matchmaking AI cost

Post-10K      10K+     ~₹40,000/mo
              Add Hive moderation ~$50
              Add matchmaking AI (self-hosted)
              Supabase dedicated or self-host
```

---

# FILES TO CREATE/MODIFY (complete list)

## New files
```
screens/dating/DatingTabs.js
screens/dating/DatingHomeStack.js
screens/dating/DatingProfileStack.js
screens/dating/DatingChatStack.js
screens/dating/ImpressStack.js
screens/dating/TribesStack.js
screens/matrimony/MatrimonyTabs.js
screens/matrimony/MatrimonyHomeStack.js
screens/matrimony/MatrimonyProfileStack.js
screens/matrimony/MatrimonyChack.js
screens/matrimony/SuyamvaramStack.js
screens/matrimony/ZonesStack.js
screens/matrimony/CommunityStack.js
screens/matrimony/FamilyAccountScreen.js
screens/shared/AdminScreen.js
src/screens/support/SupportScreen.js
src/services/supportService.js
src/services/adminDashboardService.js (rewrite)
```

## Modified files
```
App.js                    ← route to Dating/Matrimony
context/ModeContext.js    ← simplified
screens/main/ProfileStack.js ← DEPRECATED (split into Dating/Matrimony versions)
screens/main/MainTabs.js  ← DEPRECATED (replaced by DatingTabs/MatrimonyTabs)
```

## SQL to run
```
All of Part A (A1 through A6) in Supabase SQL Editor
Part G Step 1-2 for admin accounts
```
