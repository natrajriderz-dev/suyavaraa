const { supabase } = require('../../supabase');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeSelect(table, selectClause = '*', callback) {
  try {
    const query = supabase.from(table).select(selectClause);
    if (typeof callback === 'function') {
      callback(query);
    }
    const result = await query;
    if (result.error) {
      const errorMessage = result.error.message || '';
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        return { data: [] };
      }
      console.warn(`[AdminDashboard] Table fetch failed: ${table} -> ${errorMessage}`);
      return { data: [] };
    }
    return result;
  } catch (err) {
    console.warn(`[AdminDashboard] Safe select failed: ${table}`, err.message);
    return { data: [] };
  }
}

/**
 * Logs an admin action to the admin_activity_log table.
 */
async function logAdminAction(adminId, action, targetType = null, targetId = null, details = null) {
  try {
    await supabase.from('admin_activity_log').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    console.warn('[AdminDashboard] Could not log action:', err.message);
  }
}

// ─── Auth / Admin User ────────────────────────────────────────────────────────

async function getCurrentAdminUser() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const user = authData?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: user.id,
    email: user.email,
    role: data.role || 'admin',
  };
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

async function loadAdminDashboardData() {
  const [
    usersRes,
    reportsRes,
    feedbackRes,
    blocksRes,
    scansRes,
    removalsRes,
    verifyRes,
    activityRes,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, is_banned, ban_reason, ban_expires_at, trust_score, trust_level, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('reports')
      .select('id, reporter_id, target_id, reason, category, severity, status, auto_flagged, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('user_feedback')
      .select('id, user_id, category, subject, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('user_blocks')
      .select('id, blocker_id, blocked_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('deepfake_scans')
      .select('id, user_id, image_url, scan_type, result, confidence_score, ai_reasoning, scanned_at')
      .order('scanned_at', { ascending: false })
      .limit(30),
    supabase
      .from('content_auto_removals')
      .select('id, user_id, content_type, content_preview, removal_reason, category, ai_confidence, removed_at, reinstated_at')
      .order('removed_at', { ascending: false })
      .limit(30),
    supabase
      .from('verification_requests')
      .select('id, user_id, media_url, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20),
    supabase
      .from('admin_activity_log')
      .select('id, admin_id, action, target_type, target_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const errors = [
    usersRes.error,
    reportsRes.error,
    feedbackRes.error,
    blocksRes.error,
    scansRes.error,
    removalsRes.error,
    verifyRes.error,
    activityRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const [pendingPhotos, pendingPosts, escalatedSupport, adminTeam] = await Promise.all([
    getPendingPhotos(20),
    getPendingPosts(20),
    getEscalatedSupport(20),
    getAdminTeam(20),
  ]);

  return {
    users: usersRes.data || [],
    reports: reportsRes.data || [],
    feedback: feedbackRes.data || [],
    blocks: blocksRes.data || [],
    deepfakeScans: scansRes.data || [],
    autoRemovals: removalsRes.data || [],
    verificationQueue: verifyRes.data || [],
    pendingPhotos,
    pendingPosts,
    escalatedSupport,
    adminTeam,
    activityLog: activityRes.data || [],
  };
}

// ─── Photo & Post Queues ──────────────────────────────────────────────────────

async function getPendingPhotos(limit = 20) {
  const result = await safeSelect(
    'photo_approvals',
    'id, user_id, photo_url, photo_type, status, rejection_reason, created_at',
    (q) => q.eq('status', 'pending').order('created_at', { ascending: false }).limit(limit)
  );
  return result.data || [];
}

async function approvePhoto(photoId, adminId) {
  const result = await supabase
    .from('photo_approvals')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('id', photoId);

  if (!result.error) {
    await logAdminAction(adminId, 'photo_approved', 'photo_approval', photoId);
  }

  return result;
}

async function rejectPhoto(photoId, adminId, reason) {
  const result = await supabase
    .from('photo_approvals')
    .update({ status: 'rejected', rejection_reason: reason || null, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('id', photoId);

  if (!result.error) {
    await logAdminAction(adminId, 'photo_rejected', 'photo_approval', photoId, { reason });
  }

  return result;
}

async function getPendingPosts(limit = 20) {
  const result = await safeSelect(
    'dating_posts',
    'id, user_id, caption, media_urls, status, rejection_reason, created_at',
    (q) => q.eq('status', 'pending').order('created_at', { ascending: false }).limit(limit)
  );
  return result.data || [];
}

async function approvePost(postId, adminId) {
  const result = await supabase
    .from('dating_posts')
    .update({ status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() })
    .eq('id', postId);

  if (!result.error) {
    await logAdminAction(adminId, 'post_approved', 'dating_post', postId);
  }

  return result;
}

async function rejectPost(postId, adminId, reason) {
  const result = await supabase
    .from('dating_posts')
    .update({ status: 'rejected', rejection_reason: reason || null, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('id', postId);

  if (!result.error) {
    await logAdminAction(adminId, 'post_rejected', 'dating_post', postId, { reason });
  }

  return result;
}

async function getEscalatedSupport(limit = 20) {
  const result = await safeSelect(
    'support_conversations',
    'id, user_id, status, category, escalated_to, created_at',
    (q) => q.eq('status', 'escalated').order('created_at', { ascending: false }).limit(limit)
  );
  return result.data || [];
}

async function replyToSupport(conversationId, adminId, message) {
  const insertRes = await supabase
    .from('support_messages')
    .insert({ conversation_id: conversationId, role: 'admin', content: message, created_at: new Date().toISOString() });

  if (insertRes.error) {
    return insertRes;
  }

  const updateRes = await supabase
    .from('support_conversations')
    .update({ escalated_to: adminId, status: 'open' })
    .eq('id', conversationId);

  if (!updateRes.error) {
    await logAdminAction(adminId, 'support_replied', 'support_conversation', conversationId, { message_preview: message.slice(0, 120) });
  }

  return updateRes.error ? updateRes : insertRes;
}

async function searchUsers(query, limit = 30) {
  if (!query || !query.trim()) return [];
  const filter = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, is_banned, ban_reason, ban_expires_at, trust_score, trust_level, created_at')
    .or(`full_name.ilike.${filter},email.ilike.${filter}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[AdminDashboard] searchUsers failed:', error.message);
    return [];
  }
  return data || [];
}

async function getAdminTeam(limit = 20) {
  const result = await safeSelect(
    'admin_users',
    'id, user_id, role, permissions, is_active, created_at',
    (q) => q.order('created_at', { ascending: false }).limit(limit)
  );
  return result.data || [];
}

// ─── Reports ──────────────────────────────────────────────────────────────────

async function resolveReport(reportId, adminId, status) {
  const result = await supabase
    .from('reports')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq('id', reportId);

  if (!result.error) {
    await logAdminAction(adminId, `report_${status}`, 'report', reportId);
  }

  return result;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

async function closeFeedback(feedbackId, adminId, reply) {
  const result = await supabase
    .from('user_feedback')
    .update({
      status: 'closed',
      admin_reply: reply || null,
      admin_id: adminId,
    })
    .eq('id', feedbackId);

  if (!result.error) {
    await logAdminAction(adminId, 'feedback_closed', 'feedback', feedbackId);
  }

  return result;
}

// ─── Verification ─────────────────────────────────────────────────────────────

async function processVerification(row, adminId, approved) {
  const status = approved ? 'approved' : 'rejected';

  const updateRes = await supabase
    .from('verification_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('id', row.id);

  if (updateRes.error) return updateRes;

  if (approved) {
    const userRes = await supabase
      .from('users')
      .update({ is_verified: true, trust_level: 'green_verified' })
      .eq('id', row.user_id);

    if (userRes.error) return userRes;
  }

  await logAdminAction(adminId, `verification_${status}`, 'verification_request', row.id, {
    user_id: row.user_id,
  });

  return updateRes;
}

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * Ban a user by ID. Optionally set a ban expiration.
 */
async function banUser(userId, adminId, reason, expiresAt = null) {
  const updateData = {
    is_banned: true,
    ban_reason: reason || 'Banned by admin',
    ban_expires_at: expiresAt || null,
  };

  const result = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (!result.error) {
    await logAdminAction(adminId, 'user_banned', 'user', userId, {
      reason,
      expires_at: expiresAt,
    });
  }

  return result;
}

/**
 * Unban a user by ID.
 */
async function unbanUser(userId, adminId) {
  const result = await supabase
    .from('users')
    .update({
      is_banned: false,
      ban_reason: null,
      ban_expires_at: null,
    })
    .eq('id', userId);

  if (!result.error) {
    await logAdminAction(adminId, 'user_unbanned', 'user', userId);
  }

  return result;
}

/**
 * Get a single user's full profile (users + user_profiles).
 */
async function getDetailedUser(userId) {
  const [userRes, profileRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, date_of_birth, gender, city, bio, profile_complete, is_verified, is_banned, ban_reason, ban_expires_at, trust_score, trust_level, role, is_premium, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (userRes.error) throw userRes.error;

  return {
    ...userRes.data,
    profile: profileRes.data || null,
  };
}

// ─── Deepfake Scans ───────────────────────────────────────────────────────────

/**
 * Resolve / review a deepfake scan.
 */
async function resolveScan(scanId, adminId, action) {
  const result = await supabase
    .from('deepfake_scans')
    .update({
      action_taken: action,
      reviewed_by: adminId,
    })
    .eq('id', scanId);

  if (!result.error) {
    await logAdminAction(adminId, `scan_${action}`, 'deepfake_scan', scanId);
  }

  return result;
}

// ─── Auto Removals ────────────────────────────────────────────────────────────

/**
 * Reinstate auto-removed content (mark reinstated).
 */
async function reinstateContent(removalId, adminId) {
  const result = await supabase
    .from('content_auto_removals')
    .update({
      reinstated_at: new Date().toISOString(),
      reinstated_by: adminId,
    })
    .eq('id', removalId);

  if (!result.error) {
    await logAdminAction(adminId, 'content_reinstated', 'content_auto_removal', removalId);
  }

  return result;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

/**
 * Fetch recent admin activity log.
 */
async function getActivityLog(limit = 50) {
  const { data, error } = await supabase
    .from('admin_activity_log')
    .select('id, admin_id, action, target_type, target_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Core
  getCurrentAdminUser,
  loadAdminDashboardData,
  resolveReport,
  closeFeedback,
  processVerification,
  // Photo and post queues
  getPendingPhotos,
  approvePhoto,
  rejectPhoto,
  getPendingPosts,
  approvePost,
  rejectPost,
  // Support
  getEscalatedSupport,
  replyToSupport,
  // User management
  banUser,
  unbanUser,
  searchUsers,
  getAdminTeam,
  getDetailedUser,
  // Scans
  resolveScan,
  // Content
  reinstateContent,
  // Activity
  getActivityLog,
  logAdminAction,
};
