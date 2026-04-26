// ============================================
// SUYAVARAA Fish Trap Service - Main Orchestrator
// ============================================
// Coordinates all Fish Trap functionality:
// - Quarantine logic for unverified users
// - Decoy profile management
// - AI response generation
// - Red flag detection
// - Contact info scrubbing
// - Admin monitoring

const { supabase } = require('../../supabase');
const { detectRedFlags } = require('../utils/redFlagPatterns');
const aiResponderService = require('./aiResponderService');
const contactInfoScrubbingService = require('./contactInfoScrubbingService');
const matchingAlgorithmService = require('./matchingAlgorithmService');

class FishTrapService {
  constructor() {
    this.quarantineEnabled = true;
    this.autoRequestInterval = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
    this.maxActiveDecoyChats = 3; // Max concurrent decoy chats per user
  }

  classifyProfileMode(profile) {
    const hasLookingFor = Boolean(profile.looking_for);
    const hasMatrimonyTraits = Boolean(
      profile.religion ||
      profile.education ||
      profile.occupation ||
      profile.about
    );

    if (hasLookingFor) return 'dating';
    if (hasMatrimonyTraits) return 'matrimony';
    return null;
  }

  filterProfilesByMode(profiles, mode) {
    if (!mode) return profiles;

    return profiles.filter((profile) => {
      const profileMode = this.classifyProfileMode(profile);
      if (mode === 'dating') {
        return profileMode === 'dating';
      }
      if (mode === 'matrimony') {
        return profileMode === 'matrimony' || profileMode === null;
      }
      return true;
    });
  }

  // ============================================
  // QUARANTINE LOGIC
  // ============================================

  // Check if user should be in quarantine
  async isUserInQuarantine(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('is_verified, is_banned, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Banned users are always in quarantine
      if (user.is_banned) return true;

      // Unverified users are in quarantine
      if (!user.is_verified) return true;

      // Verified users can access real profiles
      return false;

    } catch (error) {
      console.error('Error checking quarantine status:', error);
      return true; // Default to quarantine on error
    }
  }

  // Get profiles for user (mixed real + decoy for unverified, real only for verified)
  async getProfilesForUser(userId, options = {}) {
    const { limit = 20, offset = 0, mode } = options;

    const inQuarantine = await this.isUserInQuarantine(userId);

    if (!inQuarantine) {
      // Verified user - show real profiles only
      return await this.getRealProfiles(userId, { limit, offset, mode });
    } else {
      // Unverified user - show mixed real + decoy profiles
      return await this.getMixedProfiles(userId, { limit, offset, mode });
    }
  }

  // Get real profiles only (for verified users)
  async getRealProfiles(userId, options = {}) {
    const { limit = 20, offset = 0, mode } = options;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          primary_photo_url,
          additional_photos,
          interests,
          religion,
          education,
          occupation,
          about,
          looking_for,
          height_cm,
          mother_tongue,
          users!inner (
            id,
            full_name,
            age,
            gender,
            city,
            bio,
            is_verified,
            trust_score,
            is_banned
          )
        `)
        .neq('user_id', userId) // Exclude self
        .eq('users.is_banned', false) // Not banned
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Scrub any contact info in bios
      const scrubbedProfiles = await Promise.all(
        data.map(async (profile) => {
          const scrubbedBio = await contactInfoScrubbingService.scrubProfileText(
            profile.users.bio,
            profile.user_id
          );

          const profileType = this.classifyProfileMode(profile);
          return {
            ...profile,
            id: profile.user_id,
            profile_type: profileType || 'dating',
            user_id: profile.user_id,
            users: {
              ...profile.users,
              bio: scrubbedBio.scrubbedText
            },
            is_decoy: false,
            can_send_request: true
          };
        })
      );

      return mode ? this.filterProfilesByMode(scrubbedProfiles, mode) : scrubbedProfiles;

    } catch (error) {
      console.error('Error getting real profiles:', error);
      return [];
    }
  }

  // Get mixed real + decoy profiles (for unverified users)
  async getMixedProfiles(userId, options = {}) {
    const { limit = 20, offset = 0, mode } = options;

    try {
      // Get real profiles (limit to half)
      const realProfiles = await this.getRealProfiles(userId, {
        limit: Math.floor(limit / 2),
        offset: offset,
        mode
      });

      // Get decoy profiles (remaining slots)
      const decoyLimit = limit - realProfiles.length;
      const decoyProfiles = await this.getDecoyProfiles(userId, {
        limit: decoyLimit,
        offset: 0
      });

      // Rank profiles using Advanced Matching Algorithm
      const rankedProfiles = await matchingAlgorithmService.rankProfiles(userId, [...realProfiles, ...decoyProfiles]);

      // Mark real profiles as not requestable by unverified users
      return rankedProfiles.map(profile => ({
        ...profile,
        can_send_request: profile.is_decoy // Only decoys can be requested
      }));

    } catch (error) {
      console.error('Error getting mixed profiles:', error);
      return [];
    }
  }

  // Get active decoy profiles
  async getDecoyProfiles(userId, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {
      const { data, error } = await supabase
        .from('decoy_profiles')
        .select('*')
        .eq('is_active', true)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map(decoy => ({
        id: decoy.id,
        decoy_id: decoy.id,
        user_id: decoy.user_id,
        primary_photo_url: decoy.profile_photo_url,
        users: {
          id: decoy.user_id,
          full_name: decoy.name,
          age: decoy.age,
          gender: decoy.gender,
          city: decoy.city,
          bio: decoy.bio,
          is_verified: true, // Decoys appear verified
          trust_score: 95 // High trust score
        },
        is_decoy: true,
        profile_type: null,
        can_send_request: true
      }));

    } catch (error) {
      console.error('Error getting decoy profiles:', error);
      return [];
    }
  }

  // ============================================
  // DECOY CHAT MANAGEMENT
  // ============================================

  // Start a decoy chat interaction
  async startDecoyChat(userId, decoyId) {
    try {
      // Check if user already has active chat with this decoy
      const existingChat = await this.getActiveDecoyChat(userId, decoyId);
      if (existingChat) {
        return { success: false, message: 'Chat already exists' };
      }

      // Check max concurrent chats
      const activeChats = await this.getUserActiveDecoyChats(userId);
      if (activeChats.length >= this.maxActiveDecoyChats) {
        return { success: false, message: 'Maximum decoy chats reached' };
      }

      // Create interaction record
      const { data, error } = await supabase
        .from('fish_trap_interactions')
        .insert({
          user_id: userId,
          decoy_id: decoyId,
          status: 'accepted',
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      // Send initial decoy message
      await this.sendDecoyMessage(data.id, 'Hey! Thanks for reaching out. What brings you to SUYAVARAA?');

      return { success: true, interaction: data };

    } catch (error) {
      console.error('Error starting decoy chat:', error);
      return { success: false, error: error.message };
    }
  }

  // Process user message in decoy chat
  async processUserMessage(interactionId, userMessage) {
    try {
      // Get interaction details
      const interaction = await this.getInteraction(interactionId);
      if (!interaction) {
        throw new Error('Interaction not found');
      }

      // Scrub contact info from message
      const scrubbedResult = await contactInfoScrubbingService.scrubMessage(
        userMessage,
        interaction.user_id,
        {
          interactionId,
          isDecoyChat: true
        }
      );

      // Detect red flags
      const redFlagResult = detectRedFlags(scrubbedResult.scrubbedMessage);

      // Update interaction with red flags
      if (redFlagResult.flags.length > 0) {
        await this.updateInteractionFlags(interactionId, redFlagResult);
      }

      // Check if should auto-ban
      if (redFlagResult.action === 'temporary_ban' || redFlagResult.action === 'permanent_ban') {
        await this.autoBanUser(interaction.user_id, redFlagResult);
      }

      // Generate AI response
      const decoyProfile = await this.getDecoyProfile(interaction.decoy_id);
      const conversationHistory = await this.getConversationHistory(interactionId);

      const aiResponse = await aiResponderService.generateResponse(
        decoyProfile,
        conversationHistory,
        scrubbedResult.scrubbedMessage
      );

      // Save messages to database
      await this.saveMessage(interactionId, 'user', userMessage, scrubbedResult.scrubbedMessage);
      await this.saveMessage(interactionId, 'decoy', aiResponse.response, aiResponse.response);

      return {
        success: true,
        response: aiResponse.response,
        redFlags: redFlagResult,
        scrubbed: scrubbedResult.wasModified
      };

    } catch (error) {
      console.error('Error processing user message:', error);
      return {
        success: false,
        error: error.message,
        response: 'Sorry, I\'m having trouble responding right now.'
      };
    }
  }

  // Send decoy message
  async sendDecoyMessage(interactionId, message) {
    try {
      await this.saveMessage(interactionId, 'decoy', message, message);
    } catch (error) {
      console.error('Error sending decoy message:', error);
    }
  }

  // ============================================
  // AUTO REQUEST SYSTEM
  // ============================================

  // Send automatic decoy requests to unverified users
  async sendAutoDecoyRequests() {
    try {
      console.log('Starting auto decoy request job...');

      // Get all unverified users
      const { data: unverifiedUsers, error } = await supabase
        .from('users')
        .select('id')
        .eq('is_verified', false)
        .eq('is_banned', false);

      if (error) throw error;

      let requestsSent = 0;

      for (const user of unverifiedUsers) {
        const sent = await this.sendDecoyRequestToUser(user.id);
        if (sent) requestsSent++;
      }

      console.log(`Auto decoy requests job completed. Sent ${requestsSent} requests.`);
      return { success: true, requestsSent };

    } catch (error) {
      console.error('Error in auto decoy request job:', error);
      return { success: false, error: error.message };
    }
  }

  // Send decoy request to specific user
  async sendDecoyRequestToUser(userId) {
    try {
      // Check if user already has pending decoy requests
      const activeChats = await this.getUserActiveDecoyChats(userId);
      if (activeChats.length >= this.maxActiveDecoyChats) {
        return false; // Max reached
      }

      // Get random decoy that hasn't interacted with this user recently
      const availableDecoy = await this.getAvailableDecoyForUser(userId);
      if (!availableDecoy) {
        return false; // No available decoys
      }

      // Create interaction
      const { data: interaction, error } = await supabase
        .from('fish_trap_interactions')
        .insert({
          user_id: userId,
          decoy_id: availableDecoy.id,
          status: 'pending', // User needs to accept
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      // Update decoy's last request time
      await supabase
        .from('decoy_profiles')
        .update({ last_request_sent_at: new Date() })
        .eq('id', availableDecoy.id);

      // Send initial message (will be shown when user accepts)
      await this.sendDecoyMessage(
        interaction.id,
        `Hey! I noticed you on SUYAVARAA and thought you seemed interesting. What's your story?`
      );

      return true;

    } catch (error) {
      console.error('Error sending decoy request to user:', error);
      return false;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Get active decoy chat for user-decoy pair
  async getActiveDecoyChat(userId, decoyId) {
    try {
      const { data, error } = await supabase
        .from('fish_trap_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('decoy_id', decoyId)
        .in('status', ['pending', 'accepted'])
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;

    } catch (error) {
      console.error('Error getting active decoy chat:', error);
      return null;
    }
  }

  // Get all active decoy chats for user
  async getUserActiveDecoyChats(userId) {
    try {
      const { data, error } = await supabase
        .from('fish_trap_interactions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'accepted']);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting user active decoy chats:', error);
      return [];
    }
  }

  // Get available decoy for user
  async getAvailableDecoyForUser(userId) {
    try {
      // Get decoys that haven't interacted with this user recently
      const { data, error } = await supabase
        .from('decoy_profiles')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${await this.getUserInteractedDecoyIds(userId)})`);

      if (error) throw error;

      if (!data || data.length === 0) return null;

      // Return random decoy
      return data[Math.floor(Math.random() * data.length)];

    } catch (error) {
      console.error('Error getting available decoy:', error);
      return null;
    }
  }

  // Get IDs of decoys user has interacted with
  async getUserInteractedDecoyIds(userId) {
    try {
      const { data, error } = await supabase
        .from('fish_trap_interactions')
        .select('decoy_id')
        .eq('user_id', userId);

      if (error) throw error;
      return data.map(d => d.decoy_id).join(',');

    } catch (error) {
      return '';
    }
  }

  // Get interaction details
  async getInteraction(interactionId) {
    try {
      const { data, error } = await supabase
        .from('fish_trap_interactions')
        .select('*')
        .eq('id', interactionId)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error getting interaction:', error);
      return null;
    }
  }

  // Get decoy profile
  async getDecoyProfile(decoyId) {
    try {
      const { data, error } = await supabase
        .from('decoy_profiles')
        .select('*')
        .eq('id', decoyId)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error getting decoy profile:', error);
      return null;
    }
  }

  // Get conversation history
  async getConversationHistory(interactionId) {
    try {
      const { data, error } = await supabase
        .from('fish_trap_messages')
        .select('*')
        .eq('interaction_id', interactionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Save message to database
  async saveMessage(interactionId, senderType, originalContent, displayedContent) {
    try {
      const { error } = await supabase
        .from('fish_trap_messages')
        .insert({
          interaction_id: interactionId,
          sender_type: senderType,
          content: originalContent,
          displayed_content: displayedContent,
          created_at: new Date()
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  // Update interaction with red flags
  async updateInteractionFlags(interactionId, redFlagResult) {
    try {
      const { error } = await supabase
        .from('fish_trap_interactions')
        .update({
          behavior_flags: redFlagResult.flags,
          red_flag_count: redFlagResult.totalScore,
          updated_at: new Date()
        })
        .eq('id', interactionId);

      if (error) throw error;

    } catch (error) {
      console.error('Error updating interaction flags:', error);
    }
  }

  // Auto-ban user based on red flags
  async autoBanUser(userId, redFlagResult) {
    try {
      const banReason = `Automatic ban: ${redFlagResult.flags.length} red flags detected (${redFlagResult.totalScore} points)`;
      const isPermanent = redFlagResult.action === 'permanent_ban';

      await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: banReason,
          ban_expires_at: isPermanent ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updated_at: new Date()
        })
        .eq('id', userId);

      console.log(`Auto-banned user ${userId}: ${banReason}`);

    } catch (error) {
      console.error('Error auto-banning user:', error);
    }
  }

  // Utility: Shuffle array
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// Export singleton instance
module.exports = new FishTrapService();
