const { supabase } = require('../../supabase');

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

async function loadAdminDashboardData() {
  const [
    usersRes,
    reportsRes,
    feedbackRes,
    blocksRes,
    scansRes,
    removalsRes,
    verifyRes,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, is_banned, ban_reason, trust_score, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('reports')
      .select('id, reporter_id, target_id, reason, category, severity, status, created_at')
      .order('created_at', { ascending: false })
      .limit(40),
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
      .select('id, user_id, scan_type, result, confidence_score, scanned_at')
      .order('scanned_at', { ascending: false })
      .limit(30),
    supabase
      .from('content_auto_removals')
      .select('id, user_id, content_type, removal_reason, category, ai_confidence, removed_at')
      .order('removed_at', { ascending: false })
      .limit(30),
    supabase
      .from('verification_requests')
      .select('id, user_id, media_url, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20),
  ]);

  const errors = [
    usersRes.error,
    reportsRes.error,
    feedbackRes.error,
    blocksRes.error,
    scansRes.error,
    removalsRes.error,
    verifyRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return {
    users: usersRes.data || [],
    reports: reportsRes.data || [],
    feedback: feedbackRes.data || [],
    blocks: blocksRes.data || [],
    deepfakeScans: scansRes.data || [],
    autoRemovals: removalsRes.data || [],
    verificationQueue: verifyRes.data || [],
  };
}

async function resolveReport(reportId, adminId, status) {
  return supabase
    .from('reports')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
    })
    .eq('id', reportId);
}

async function closeFeedback(feedbackId, adminId, reply) {
  return supabase
    .from('user_feedback')
    .update({
      status: 'closed',
      admin_reply: reply || null,
      admin_id: adminId,
    })
    .eq('id', feedbackId);
}

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

  if (updateRes.error || !approved) return updateRes;

  const userRes = await supabase
    .from('users')
    .update({ is_verified: true, trust_level: 'green_verified' })
    .eq('id', row.user_id);

  return userRes.error ? userRes : updateRes;
}

module.exports = {
  getCurrentAdminUser,
  loadAdminDashboardData,
  resolveReport,
  closeFeedback,
  processVerification,
};
