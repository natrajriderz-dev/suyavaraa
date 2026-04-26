// src/components/home/MatrimonyHome.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} = require('react-native');
const { useState, useEffect } = React;
const { useIsFocused } = require('@react-navigation/native');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { LinearGradient } = require('expo-linear-gradient');
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');
const MatrimonyProfileCard = require('./MatrimonyProfileCard');
const MatrimonyDetailModal = require('../modals/MatrimonyDetailModal');
const SuccessModal = require('../modals/SuccessModal');
const fishTrapService = require('../../services/fishTrapService');
const { Ionicons } = require('@expo/vector-icons');
const notificationService = require('../../services/notificationService');

const { useMode } = require('../../../context/ModeContext');
const MatrimonyHome = ({ navigation }) => {
  const { userMode } = useMode();
  const themeColor = '#D4A017'; // Gold for Matrimony
  const isFocused = useIsFocused();
  const [allProfiles, setAllProfiles] = useState([]);
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sentInterests, setSentInterests] = useState({});
  const [filters, setFilters] = useState({ religion: 'All', education: 'All', ageRange: [18, 50] });
  const [preferenceMode, setPreferenceMode] = useState('zone');
  const [isInQuarantine, setIsInQuarantine] = useState(false);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadFiltersAndProfiles();
    }
  }, [isFocused]);

  const loadFiltersAndProfiles = async () => {
    try {
      const [savedFilters, savedMode] = await Promise.all([
        AsyncStorage.getItem('filters_matrimony'),
        AsyncStorage.getItem('matrimony_preference_mode'),
      ]);
      const currentFilters = savedFilters ? JSON.parse(savedFilters) : filters;
      const currentMode = savedMode || 'zone';
      setFilters(currentFilters);
      setPreferenceMode(currentMode);
      loadProfiles(currentFilters, currentMode);
    } catch (e) {
      loadProfiles(filters, preferenceMode);
    }
  };

  const loadProfiles = async (currentFilters, mode = preferenceMode) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check quarantine status
      const inQuarantine = await fishTrapService.isUserInQuarantine(user.id);
      setIsInQuarantine(inQuarantine);

      // Get profiles via Fish Trap service
      const fishTrapProfiles = await fishTrapService.getProfilesForUser(user.id, {
        limit: 50,
        offset: 0,
        mode: 'matrimony'
      });

      if (fishTrapProfiles && fishTrapProfiles.length > 0) {
        // Map to expected format
        const mapped = fishTrapProfiles.map(profile => {
          const u = profile.users || {};

          return {
            id: profile.user_id || profile.id, // real profiles use user_id, decoys use decoy id
            decoy_id: profile.decoy_id,
            user_id: profile.user_id || profile.id,
            display_name: u.full_name || u.name,
            age: u.age || (u.date_of_birth ? Math.floor((Date.now() - new Date(u.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null),
            city: u.city,
            trust_level: u.trust_score >= 80 ? 'green_verified' : 'unverified',
            primary_photo_url: profile.primary_photo_url,
            religion: profile.religion || '',
            education: profile.education || '',
            interests: profile.interests || [],
            bio: profile.about || profile.bio || '',
            occupation: profile.occupation || '',
            annual_income: profile.annual_income || '',
            is_decoy: profile.is_decoy || false,
            can_send_request: profile.can_send_request !== false
          };
        });

        // Apply filters locally
        const filtered = mapped.filter(p => {
          const religionMatch = currentFilters.religion === 'All' || p.religion === currentFilters.religion;
          const educationMatch = currentFilters.education === 'All' || (p.education && p.education.includes(currentFilters.education));
          const ageMatch = !p.age || (p.age >= currentFilters.ageRange[0] && p.age <= currentFilters.ageRange[1]);
          return religionMatch && educationMatch && ageMatch;
        });
      if (mode === 'community') {
        // Community mode may use a different ordering or feature set in future.
        filtered.sort((a, b) => (a.trust_level === 'green_verified' && b.trust_level !== 'green_verified' ? -1 : 1));
      }

        setAllProfiles(filtered);
        setRecentProfiles(filtered.slice(0, 4));
      } else {
        setAllProfiles([]);
        setRecentProfiles([]);
      }
    } catch (err) {
      console.log('Matrimony load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceModeChange = async (mode) => {
    if (!['zone', 'community'].includes(mode)) return;
    setPreferenceMode(mode);
    await AsyncStorage.setItem('matrimony_preference_mode', mode);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ preferred_mode: mode }).eq('id', user.id);
      }
    } catch (err) {
      // ignore if this field/table is unavailable
    }

    loadProfiles(filters, mode);
  };

  const handleSendInterest = async (profile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check quarantine logic
      if (isInQuarantine && !profile.is_decoy) {
        setSelectedProfile(profile);
        setShowDetailModal(false);
        setShowVerificationPopup(true);
        return;
      }

      // If decoy, start decoy chat
      if (profile.is_decoy) {
        const decoyId = profile.decoy_id || profile.id;
        const result = await fishTrapService.startDecoyChat(user.id, decoyId);
        if (result.success) {
          setSentInterests(prev => ({ ...prev, [profile.id]: true }));
          setShowDetailModal(false);
          setShowSuccessModal(true);
        } else {
          Alert.alert('Error', result.message || 'Failed to start conversation.');
        }
        return;
      }

      // If real profile and verified
      await sendInterest(profile.user_id || profile.id);

    } catch (error) {
      console.error('Interest error:', error);
    }
  };

  const sendInterest = async (profileId) => {
    if (sentInterests[profileId]) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_actions').insert({
        actor_user_id: user.id,
        target_user_id: profileId,
        action_type: 'like',
      });

      setSentInterests(prev => ({ ...prev, [profileId]: true }));
      setShowDetailModal(false);
      setShowSuccessModal(true);

      // Send local notification for interest sent
      notificationService.sendLocalNotification(
        'Interest Sent! 💌',
        `Your interest has been sent to ${selectedProfile?.display_name || 'the user'}`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to send interest.');
    }
  };

  const HorizontalCard = ({ item }) => (
    <LinearGradient colors={['#ffffff', '#f9f9f9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hCard}>
      <TouchableOpacity onPress={() => { setSelectedProfile(item); setShowDetailModal(true); }}>
        <Image source={{ uri: item.primary_photo_url || 'https://via.placeholder.com/140' }} style={styles.hCardPhoto} />
        {item.trust_level === 'green_verified' && (
          <View style={styles.hCardBadge}><Ionicons name="checkmark-circle" size={12} color={themeColor} /></View>
        )}
        <View style={styles.hCardInfo}>
          <Text style={styles.hCardName} numberOfLines={1}>{item.display_name}</Text>
          <Text style={styles.hCardMeta}>{item.age} • {item.city}</Text>
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <MatrimonyDetailModal
        visible={showDetailModal}
        profile={selectedProfile}
        onClose={() => setShowDetailModal(false)}
        onInterest={() => handleSendInterest(selectedProfile)}
        alreadySent={selectedProfile ? sentInterests[selectedProfile.id] : false}
      />
      
      {/* Verification Required Popup */}
      <Modal visible={showVerificationPopup} transparent animationType="fade">
        <View style={styles.vOverlay}>
          <View style={styles.vModal}>
            <Text style={styles.vTitle}>Verification Required</Text>
            <Text style={styles.vText}>
              To connect with verified users like {selectedProfile?.display_name}, you need to complete verification first.
            </Text>
            <TouchableOpacity 
              style={[styles.vBtn, { backgroundColor: themeColor }]}
              onPress={() => { setShowVerificationPopup(false); navigation.navigate('VideoVerification'); }}
            >
              <Text style={styles.vBtnText}>Verify Now</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.vBtn, { backgroundColor: 'transparent' }]}
              onPress={() => setShowVerificationPopup(false)}
            >
              <Text style={{ color: Colors.textSecondary }}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Interest Sent!"
        message="They will be notified. Once confirmed, you can chat."
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>💍 Matrimony</Text>
            <Text style={styles.headerSub}>{allProfiles.length} active profiles</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Filters')}>
            <Ionicons name="options" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeButton, preferenceMode === 'zone' ? styles.modeButtonActive : null]}
            onPress={() => handlePreferenceModeChange('zone')}
          >
            <Text style={[styles.modeButtonText, preferenceMode === 'zone' ? styles.modeButtonTextActive : null]}>Zone</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, preferenceMode === 'community' ? styles.modeButtonActive : null]}
            onPress={() => handlePreferenceModeChange('community')}
          >
            <Text style={[styles.modeButtonText, preferenceMode === 'community' ? styles.modeButtonTextActive : null]}>Community</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSummary}>
          <Text style={[styles.summaryText, { color: themeColor }]}>
            {filters.religion} • {filters.ageRange[0]}-{filters.ageRange[1]} • {filters.education}
          </Text>
        </View>

        {recentProfiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Recently Added</Text>
            <FlatList
              horizontal
              data={recentProfiles}
              renderItem={({ item }) => <HorizontalCard item={item} />}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            />
          </View>
        )}

        <TouchableOpacity 
          style={styles.suyamvaramBanner}
          onPress={() => navigation.navigate('Suyamvaram')}
        >
          <LinearGradient
            colors={['#D97706', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.suyamvaramGradient}
          >
            <View style={styles.suyamvaramTextContainer}>
              <Text style={styles.suyamvaramTitle}>Daily Suyamvaram</Text>
              <Text style={styles.suyamvaramDesc}>Handpicked high-trust profiles for you</Text>
            </View>
            <View style={styles.suyamvaramBadge}>
              <Text style={styles.badgeText}>GO</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Matching Profiles</Text>
          <FlatList
            data={allProfiles}
            renderItem={({ item }) => (
              <MatrimonyProfileCard
                item={item}
                onSelect={() => { setSelectedProfile(item); setShowDetailModal(true); }}
                onInterest={() => handleSendInterest(item)}
                alreadySent={sentInterests[item.id]}
              />
            )}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: 12 }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: Colors.text },
  modeSwitcher: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.surface, marginHorizontal: 6, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#FACC15', borderColor: '#F59E0B' },
  modeButtonText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  modeButtonTextActive: { color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  filterSummary: { marginHorizontal: 20, marginBottom: 16, backgroundColor: Colors.surface, padding: 8, borderRadius: 12, alignItems: 'center' },
  summaryText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, paddingHorizontal: 20, marginBottom: 16 },
  grid: { paddingHorizontal: 16 },
  hCard: { width: 130, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  hCardPhoto: { width: 130, height: 160, resizeMode: 'cover' },
  hCardBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
  hCardInfo: { padding: 8 },
  hCardName: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  hCardMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  suyamvaramBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    boxShadow: '0px 4px 8px rgba(217,119,6,0.2)',
  },
  suyamvaramGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'space-between',
  },
  suyamvaramTextContainer: {
    flex: 1,
  },
  suyamvaramTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  suyamvaramDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  suyamvaramBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  vOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  vModal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center' },
  vTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  vText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  vBtn: { backgroundColor: Colors.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  vBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

module.exports = MatrimonyHome;
