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
} = require('react-native');
const { useState, useEffect, useCallback } = React;
const { useIsFocused } = require('@react-navigation/native');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');
const SwipeableCard = require('./SwipeableCard');

const DatingHome = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [filters, setFilters] = useState({ distance: 50, ageRange: [18, 35], gender: 'Everyone' });

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

      let query = supabase
        .from('users')
        .select(`
          id, full_name, city, date_of_birth, gender,
          user_profiles(primary_photo_url),
          user_tribes(tribes(name))
        `)
        .eq('is_verified', true)
        .eq('is_active', true)
        .neq('id', user.id);

      // Apply Filter: Gender
      if (currentFilters.gender !== 'Everyone') {
        const genderValue = currentFilters.gender === 'Men' ? 'male' : 'female';
        query = query.eq('gender', genderValue);
      }

      // Filter: Verified Only (if in filters)
      if (currentFilters.showVerifiedOnly) {
        query = query.eq('trust_level', 'green_verified');
      }

      const { data: users, error } = await query.limit(20);

      if (error) throw error;

      if (users && users.length > 0) {
        const mapped = users.map(u => ({
          id: u.id,
          display_name: u.full_name,
          age: u.date_of_birth ? Math.floor((Date.now() - new Date(u.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null,
          city: u.city,
          profile_picture_url: u.user_profiles?.[0]?.primary_photo_url || null,
          tribes: u.user_tribes?.map(ut => ut.tribes) || []
        }));
        
        // Manual Filter: Age range
        const filtered = mapped.filter(p => {
          if (!p.age) return true;
          return p.age >= currentFilters.ageRange[0] && p.age <= currentFilters.ageRange[1];
        });

        setProfiles(filtered);
      } else {
        setProfiles([]);
      }
    } catch (error) {
      console.log('Load discover error:', error.message);
      // Fallback to mock for demo stability
      const mockProfiles = [
        { id: '1', display_name: 'Priya', age: 26, city: 'Mumbai', profile_picture_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=60', tribes: [{ name: 'Foodie' }] },
        { id: '2', display_name: 'Ananya', age: 24, city: 'Bangalore', profile_picture_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=60', tribes: [{ name: 'Adventurer' }] }
      ];
      setProfiles(mockProfiles);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action, profile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_actions').insert({
        actor_user_id: user.id,
        target_user_id: profile.id,
        action_type: action
      });

      if (action === 'like') {
        const { data: mutual } = await supabase
          .from('user_actions')
          .select('id')
          .eq('actor_user_id', profile.id)
          .eq('target_user_id', user.id)
          .eq('action_type', 'like')
          .single();

        if (mutual) {
          await supabase.from('matches').insert({ user1_id: user.id, user2_id: profile.id });
          setMatchedProfile(profile);
          setShowMatch(true);
        }
      }
      nextCard();
    } catch (e) {
      nextCard();
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Filters')}>
          <Ionicons name="options" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.filterBar} onPress={() => navigation.navigate('Filters')}>
        <Ionicons name="location" size={16} color={Colors.primary} />
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
            <TouchableOpacity style={styles.refreshBtn} onPress={loadFiltersAndProfiles}>
              <Text style={styles.btnText}>Change Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.error }]} onPress={() => handleManualAction('pass')}>
          <Ionicons name="close" size={32} color={Colors.error} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.largeBtn, { borderColor: Colors.primary }]} onPress={() => handleManualAction('superlike')}>
          <Ionicons name="star" size={32} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.success }]} onPress={() => handleManualAction('like')}>
          <Ionicons name="heart" size={32} color={Colors.success} />
        </TouchableOpacity>
      </View>

      <Modal visible={showMatch} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <View style={styles.matchPics}>
            <Image source={{ uri: userProfile?.profile_picture_url || 'https://via.placeholder.com/100' }} style={styles.matchPic} />
            <Ionicons name="heart" size={40} color={Colors.primary} />
            <Image source={{ uri: matchedProfile?.profile_picture_url || 'https://via.placeholder.com/100' }} style={styles.matchPic} />
          </View>
          <TouchableOpacity style={styles.msgBtn} onPress={() => { setShowMatch(false); navigation.navigate('Chat', { conversationId: matchedProfile.id, otherUser: matchedProfile }); }}>
            <Text style={styles.msgBtnText}>Send Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setShowMatch(false)}>
            <Text style={{ color: '#fff' }}>Keep Swiping</Text>
          </TouchableOpacity>
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
});

module.exports = DatingHome;
