const { supabase } = require('../../supabase');

const ROLE_PERMISSIONS = {
  executive: ['dashboard:view', 'users:view', 'verifications:view', 'activity:view'],
  admin: ['dashboard:view', 'users:view', 'users:moderate', 'verifications:view', 'verifications:review', 'content:moderate', 'activity:view'],
  super_admin: ['*'],
};

async function checkIsAdmin(userId) {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role, permissions, is_active')
      .eq('user_id', userId)
      .single();
    
    if (error || !data || data.is_active === false) return false;
    return ['executive', 'admin', 'super_admin'].includes(data.role);
  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
}

async function getPrivilegedAccess(userId) {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role, permissions, is_active')
      .eq('user_id', userId)
      .single();

    if (error || !data || data.is_active === false) return null;

    const basePermissions = ROLE_PERMISSIONS[data.role] || [];
    const extraPermissions = Array.isArray(data.permissions) ? data.permissions : [];
    const permissions = basePermissions.includes('*')
      ? ['*']
      : Array.from(new Set([...basePermissions, ...extraPermissions]));

    return {
      role: data.role,
      permissions,
      isActive: data.is_active !== false,
    };
  } catch (err) {
    console.error('Error loading privileged access:', err);
    return null;
  }
}

function hasPermission(access, permission) {
  if (!access || !permission) return false;
  return access.permissions?.includes('*') || access.permissions?.includes(permission);
}

// Kept for backward compatibility to prevent crashes, but will return false.
// New code must use checkIsAdmin.
function isOwnerUser(userId) {
  return false;
}

module.exports = {
  checkIsAdmin,
  getPrivilegedAccess,
  hasPermission,
  isOwnerUser,
};
