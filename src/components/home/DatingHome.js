// src/components/home/DatingHome.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} = require('react-native');
const { useState, useEffect, useCallback } = React;
const { useIsFocused } = require('@react-navigation/native');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');
const SwipeableCard = require('./SwipeableCard');
const fishTrapService = require('../../services/fishTrapService');
const { Ionicons } = require('@expo/vector-icons');

const { useMode } = require('../../../context/ModeContext');
const DatingHome = ({ navigation }) => {
  const { userMode } = useMode();
  const themeColor = '#E91E63'; // Vibrant Pink for Dating
  const isFocused = useIsFocused();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [filters, setFilters] = useState({ distance: 50, ageRange: [18, 35], gender: 'Everyone' });
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [selectedRealProfile, setSelectedRealProfile] = useState(null);
  const [isInQuarantine, setIsInQuarantine] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadUserProfile();
      loadFiltersAndProfiles();
    }
  }, [isFocused]);

  const loadUserProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) setUserProfile(JSON.parse(userData));
    } catch (error) {
      console.error('Load user profile error:', error);
    }
  };

  const loadFiltersAndProfiles = async () => {
    try {
      const saved = await AsyncStorage.getItem('filters_dating');
      if (saved) {
        setFilters(JSON.parse(saved));
      }
      loadDiscoverProfiles(saved ? JSON.parse(saved) : filters);
    } catch (e) {
      loadDiscoverProfiles(filters);
    }
  };

  const loadDiscoverProfiles = async (currentFilters) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user is in quarantine
      const inQuarantine = await fishTrapService.isUserInQuarantine(user.id);
      setIsInQuarantine(inQuarantine);

      // Get profiles using Fish Trap service (mixed real + decoy for unverified, real only for verified)
      const fishTrapProfiles = await fishTrapService.getProfilesForUser(user.id, {
        limit: 20,
        offset: 0,
        mode: 'dating'
      });

      if (fishTrapProfiles && fishTrapProfiles.length > 0) {
        // Apply additional filters if needed
        const filtered = fishTrapProfiles.filter(profile => {
          // Apply age filter if available
          if (profile.users?.date_of_birth && currentFilters.ageRange) {
            const age = Math.floor((Date.now() - new Date(profile.users.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));
            if (age < currentFilters.ageRange[0] || age > currentFilters.ageRange[1]) {
              return false;
            }
          }

          // Apply gender filter
          if (currentFilters.gender !== 'Everyone' && profile.users?.gender) {
            const genderValue = currentFilters.gender === 'Men' ? 'male' : 'female';
            if (profile.users.gender !== genderValue) {
              return false;
            }
          }

          return true;
        });

        // Map to expected format
        const mapped = filtered.map(profile => ({
          id: profile.id,
          display_name: profile.users?.full_name || profile.users?.name,
          age: profile.users?.date_of_birth ?
            Math.floor((Date.now() - new Date(profile.users.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) :
            profile.users?.age,
          city: profile.users?.city,
          profile_picture_url: profile.primary_photo_url,
          tribes: [], // Could be populated from user_tribes if needed
          is_decoy: profile.is_decoy || false,
          can_send_request: profile.can_send_request || true,
          trust_score: profile.users?.trust_score || 50,
          is_verified: profile.users?.is_verified || false
        }));

        setProfiles(mapped);
      } else {
        setProfiles([]);
      }
    } catch (error) {
      console.log('Load discover error:', error.message);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action, profile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If user is in quarantine and trying to like a real profile, show verification popup
      if (isInQuarantine && !profile.is_decoy && action === 'like') {
        setSelectedRealProfile(profile);
        setShowVerificationPopup(true);
        return; // Don't process the swipe yet
      }

      // For decoy profiles or verified users, process normally
      await processSwipeAction(action, profile, user.id);
      nextCard();

    } catch (e) {
      console.error('Swipe error:', e);
      nextCard();
    }
  };

  const processSwipeAction = async (action, profile, userId) => {
    // Record the action
    const targetId = profile.user_id || profile.id;
    await supabase.from('user_actions').insert({
      actor_user_id: userId,
      target_user_id: targetId,
      action_type: action
    });

    // Handle matches for real profiles only
    if (!profile.is_decoy && action === 'like') {
      const { data: mutual } = await supabase
        .from('user_actions')
        .select('id')
        .eq('actor_user_id', targetId)
        .eq('target_user_id', userId)
        .eq('action_type', 'like')
        .single();

      if (mutual) {
        await supabase.from('matches').insert({ user1_id: userId, user2_id: targetId });
        setMatchedProfile(profile);
        setShowMatch(true);
      }
    }

    // If liking a decoy, start the decoy chat
    if (profile.is_decoy && action === 'like') {
      const decoyId = profile.decoy_id || profile.id;
      const result = await fishTrapService.startDecoyChat(userId, decoyId);
      if (result.success) {
        Alert.alert(
          'Chat Started!',
          `You've matched with ${profile.display_name}! Start a conversation.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const nextCard = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadFiltersAndProfiles();
      setCurrentIndex(0);
    }
  };

  const handleManualAction = (action) => {
    if (profiles.length > currentIndex) {
      handleSwipe(action, profiles[currentIndex]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <TouchableOpacity testID="filters-button" style={styles.headerIcon} onPress={() => navigation.navigate('Filters')}>
          <Ionicons name="options" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.filterBar} onPress={() => navigation.navigate('Filters')}>
        <Ionicons name="location" size={16} color={themeColor} />
        <Text style={styles.filterText}>
          {filters.distance}mi • {filters.ageRange[0]}-{filters.ageRange[1]} • {filters.gender}
        </Text>
      </TouchableOpacity>

      <View style={styles.cardContainer}>
        {profiles.length > 0 ? (
          profiles.slice(currentIndex, currentIndex + 3).reverse().map((profile) => (
            <SwipeableCard key={profile.id} profile={profile} onSwipe={handleSwipe} />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No more profiles</Text>
            <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: themeColor }]} onPress={loadFiltersAndProfiles}>
              <Text style={styles.btnText}>Change Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity testID="pass-button" style={[styles.actionBtn, { borderColor: Colors.error }]} onPress={() => handleManualAction('pass')}>
          <Ionicons name="close" size={32} color={Colors.error} />
        </TouchableOpacity>
        <TouchableOpacity testID="superlike-button" style={[styles.actionBtn, styles.largeBtn, { borderColor: themeColor }]} onPress={() => handleManualAction('superlike')}>
          <Ionicons name="star" size={32} color={themeColor} />
        </TouchableOpacity>
        <TouchableOpacity testID="like-button" style={[styles.actionBtn, { borderColor: Colors.success }]} onPress={() => handleManualAction('like')}>
          <Ionicons name="heart" size={32} color={Colors.success} />
        </TouchableOpacity>
      </View>

      <Modal visible={showMatch} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <View style={styles.matchPics}>
            <Image source={{ uri: userProfile?.profile_picture_url || 'https://via.placeholder.com/100' }} style={[styles.matchPic, { borderColor: themeColor }]} />
            <Ionicons name="heart" size={40} color={themeColor} />
            <Image source={{ uri: matchedProfile?.profile_picture_url || 'https://via.placeholder.com/100' }} style={[styles.matchPic, { borderColor: themeColor }]} />
          </View>
          <TouchableOpacity style={[styles.msgBtn, { backgroundColor: themeColor }]} onPress={() => { setShowMatch(false); navigation.navigate('Chat', { conversationId: matchedProfile.id, otherUser: matchedProfile }); }}>
            <Text style={styles.msgBtnText}>Send Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setShowMatch(false)}>
            <Text style={{ color: '#fff' }}>Keep Swiping</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Verification Required Popup */}
      <Modal visible={showVerificationPopup} transparent animationType="fade">
        <View style={styles.verificationOverlay}>
          <View style={styles.verificationModal}>
            <Text style={styles.verificationTitle}>Verification Required</Text>
            <Text style={styles.verificationMessage}>
              To connect with verified users like {selectedRealProfile?.display_name}, you need to complete verification first.
            </Text>
            <Text style={styles.verificationSubMessage}>
              Verification helps ensure safety and quality matches for everyone.
            </Text>
            <View style={styles.verificationButtons}>
              <TouchableOpacity
                testID="verify-popup-button"
                style={[styles.verificationBtn, styles.verifyBtn, { backgroundColor: themeColor }]}
                onPress={() => {
                  setShowVerificationPopup(false);
                  // Navigate to verification screen
                  navigation.navigate('VideoVerification'); // Navigate to verification screen
                }}
              >
                <Text style={styles.verifyBtnText}>Get Verified</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="keep-swiping-button"
                style={[styles.verificationBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowVerificationPopup(false);
                  // Continue swiping without liking this profile
                  nextCard();
                }}
              >
                <Text style={styles.cancelBtnText}>Keep Swiping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  filterBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 20, marginBottom: 16 },
  filterText: { color: Colors.textSecondary, marginLeft: 8, fontSize: 13 },
  cardContainer: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 40, gap: 20 },
  actionBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  largeBtn: { width: 70, height: 70, borderRadius: 35 },
  empty: { alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 16, marginBottom: 20 },
  refreshBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  matchTitle: { fontSize: 36, fontWeight: 'bold', color: Colors.primary, marginBottom: 40 },
  matchPics: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 20 },
  matchPic: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.primary },
  msgBtn: { backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30 },
  msgBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  verificationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  verificationModal: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400 },
  verificationTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 16, textAlign: 'center' },
  verificationMessage: { fontSize: 16, color: Colors.text, marginBottom: 12, lineHeight: 22, textAlign: 'center' },
  verificationSubMessage: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 20, textAlign: 'center' },
  verificationButtons: { flexDirection: 'row', gap: 12 },
  verificationBtn: { flex: 1, paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  verifyBtn: { backgroundColor: Colors.primary },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.textSecondary },
  cancelBtnText: { color: Colors.text, fontSize: 16 },
});

module.exports = DatingHome;
