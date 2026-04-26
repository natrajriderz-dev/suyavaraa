const { supabase } = require('../../supabase');

class FamilyAccountService {
  async getFamilyMembers(userId) {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('member_user_id, role, can_message, is_active, linked_at')
        .eq('primary_user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('FamilyAccountService.getFamilyMembers error:', error);
      return [];
    }
  }

  async getPreferredMode(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferred_mode')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data?.preferred_mode || 'zone';
    } catch (error) {
      console.error('FamilyAccountService.getPreferredMode error:', error);
      return 'zone';
    }
  }

  async canAccessFamilyAccount(userId) {
    const mode = await this.getPreferredMode(userId);
    return mode === 'community';
  }

  async addFamilyMember(primaryUserId, memberUserId, role = 'advisor') {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          primary_user_id: primaryUserId,
          member_user_id: memberUserId,
          role,
          can_message: true,
          is_active: true,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('FamilyAccountService.addFamilyMember error:', error);
      return null;
    }
  }

  async removeFamilyMember(primaryUserId, memberUserId) {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .match({ primary_user_id: primaryUserId, member_user_id: memberUserId });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('FamilyAccountService.removeFamilyMember error:', error);
      return false;
    }
  }

  async updatePreferredMode(userId, mode) {
    if (!['zone', 'community'].includes(mode)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ preferred_mode: mode })
        .eq('id', userId)
        .select('preferred_mode')
        .single();

      if (error) throw error;
      return data?.preferred_mode || mode;
    } catch (error) {
      console.error('FamilyAccountService.updatePreferredMode error:', error);
      return null;
    }
  }
}

module.exports = new FamilyAccountService();
