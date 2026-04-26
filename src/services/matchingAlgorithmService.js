const { supabase } = require('../../supabase');

class MatchingAlgorithmService {
  /**
   * Get match score between two users based on shared traits, distance, and trust.
   * Score range: 0.0 to 1.0 (weighted)
   */
  async calculateMatchScore(userA_id, userB_id) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id, city, trust_score, is_verified,
          user_profiles(interests, religion, education, occupation)
        `)
        .in('id', [userA_id, userB_id]);

      if (error || !users || users.length < 2) throw new Error('Could not find both users');

      const userA = users.find(u => u.id === userA_id);
      const userB = users.find(u => u.id === userB_id);

      if (!userA || !userB) throw new Error('Could not find both users');

      return this._computeScore(userA, userB);

    } catch (error) {
      console.error('Match calculation failed:', error);
      return 0.5; // Neutral match if error
    }
  }

  /**
   * Compute score inline from two user objects (no DB call).
   */
  _computeScore(userA, userB) {
    let score = 0;

    // 1. Interests Overlap (Weight: 40%)
    const interestsA = userA.user_profiles?.[0]?.interests || [];
    const interestsB = userB.user_profiles?.[0]?.interests || [];
    const overlap = interestsA.filter(i => interestsB.includes(i));
    const interestScore = (overlap.length / Math.max(1, Math.min(interestsA.length, interestsB.length)));
    score += interestScore * 0.4;

    // 2. City Match (Weight: 20%)
    const cityMatch = (userA.city === userB.city) ? 1.0 : 0.2;
    score += cityMatch * 0.2;

    // 3. Trust Score Compatibility (Weight: 20%)
    const trustDiff = Math.abs((userA.trust_score || 50) - (userB.trust_score || 50));
    const trustMatch = 1.0 - (trustDiff / 100);
    score += trustMatch * 0.2;

    // 4. Verification Match (Weight: 20%)
    const verA = userA.is_verified || false;
    const verB = userB.is_verified || false;
    const verMatch = (verA === verB) ? 1.0 : 0.5;
    score += verMatch * 0.2;

    return score;
  }

  /**
   * Rank a list of profiles for a specific user.
   * Fetches current user once, then computes scores inline.
   * Decoy profiles (is_decoy: true) skip the DB lookup entirely.
   */
  async rankProfiles(userId, profiles) {
    if (!profiles || profiles.length === 0) return [];

    // Fetch the current user once
    let currentUser = null;
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id, city, trust_score, is_verified,
          user_profiles(interests, religion, education, occupation)
        `)
        .eq('id', userId)
        .single();

      if (!error) currentUser = userData;
    } catch (e) {
      // If we can't get current user, just return profiles unranked
      console.warn('rankProfiles: could not fetch current user, returning unranked');
      return profiles;
    }

    if (!currentUser) return profiles;

    const scoredProfiles = profiles.map((profile) => {
      try {
        // Decoy profiles — skip DB, score based on trust
        if (profile.is_decoy) {
          const decoyUser = {
            city: profile.users?.city || '',
            trust_score: profile.users?.trust_score || 95,
            is_verified: profile.users?.is_verified ?? true,
            user_profiles: [{ interests: [] }],
          };
          return { ...profile, match_score: this._computeScore(currentUser, decoyUser) };
        }

        // Real profiles — use already-embedded user data
        const profileUser = {
          city: profile.users?.city || '',
          trust_score: profile.users?.trust_score || 50,
          is_verified: profile.users?.is_verified || false,
          user_profiles: [{ interests: profile.interests || [] }],
        };
        return { ...profile, match_score: this._computeScore(currentUser, profileUser) };

      } catch (error) {
        return { ...profile, match_score: 0 };
      }
    });

    // Sort descending by score
    return scoredProfiles.sort((a, b) => b.match_score - a.match_score);
  }
}

module.exports = new MatchingAlgorithmService();
