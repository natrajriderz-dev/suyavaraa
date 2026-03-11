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
const { Ionicons } = require('@expo/vector-icons');

const MatrimonyHome = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [allProfiles, setAllProfiles] = useState([]);
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sentInterests, setSentInterests] = useState({});
  const [filters, setFilters] = useState({ religion: 'All', education: 'All', ageRange: [18, 50] });

  useEffect(() => {
    if (isFocused) {
      loadFiltersAndProfiles();
    }
  }, [isFocused]);

  const loadFiltersAndProfiles = async () => {
    try {
      const saved = await AsyncStorage.getItem('filters_matrimony');
      const currentFilters = saved ? JSON.parse(saved) : filters;
      setFilters(currentFilters);
      loadProfiles(currentFilters);
    } catch (e) {
      loadProfiles(filters);
    }
  };

  const loadProfiles = async (currentFilters) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('users')
        .select(`
          id, full_name, city, date_of_birth, trust_level,
          user_profiles(
            primary_photo_url, marital_status, religion, mother_tongue,
            height_cm, family_type, education, occupation,
            annual_income, bio, interests
          )
        `)
        .eq('is_active', true)
        .eq('is_banned', false)
        .neq('id', user.id);

      // Simple implementation: Fetch 100 profiles and filter client-side for complex props
      // In production, use more sophisticated RPC or search indexing
      const { data: users, error } = await query.limit(100);

      if (error) throw error;

      if (users && users.length > 0) {
        const mapped = users.map(u => {
          const p = u.user_profiles?.[0] || {};
          return {
            id: u.id,
            display_name: u.full_name,
            age: u.date_of_birth ? Math.floor((Date.now() - new Date(u.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null,
            city: u.city,
            trust_level: u.trust_level,
            primary_photo_url: p.primary_photo_url || null,
            religion: p.religion || '',
            education: p.education || '',
            interests: p.interests || [],
            bio: p.bio || '',
            occupation: p.occupation || '',
            annual_income: p.annual_income || ''
          };
        });

        // Apply filters locally
        const filtered = mapped.filter(p => {
          const religionMatch = currentFilters.religion === 'All' || p.religion === currentFilters.religion;
          const educationMatch = currentFilters.education === 'All' || (p.education && p.education.includes(currentFilters.education));
          const ageMatch = !p.age || (p.age >= currentFilters.ageRange[0] && p.age <= currentFilters.ageRange[1]);
          return religionMatch && educationMatch && ageMatch;
        });

        setAllProfiles(filtered);
        setRecentProfiles(filtered.slice(0, 4));
      }
    } catch (err) {
      console.log('Matrimony load error:', err.message);
    } finally {
      setLoading(false);
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
    } catch (err) {
      Alert.alert('Error', 'Failed to send interest.');
    }
  };

  const HorizontalCard = ({ item }) => (
    <LinearGradient colors={['#ffffff', '#f9f9f9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hCard}>
      <TouchableOpacity onPress={() => { setSelectedProfile(item); setShowDetailModal(true); }}>
        <Image source={{ uri: item.primary_photo_url || 'https://via.placeholder.com/140' }} style={styles.hCardPhoto} />
        {item.trust_level === 'green_verified' && (
          <View style={styles.hCardBadge}><Ionicons name="checkmark-seal" size={12} color={Colors.primary} /></View>
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <MatrimonyDetailModal
        visible={showDetailModal}
        profile={selectedProfile}
        onClose={() => setShowDetailModal(false)}
        onInterest={() => sendInterest(selectedProfile?.id)}
        alreadySent={selectedProfile ? sentInterests[selectedProfile.id] : false}
      />
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

        <View style={styles.filterSummary}>
          <Text style={styles.summaryText}>
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
                onInterest={() => sendInterest(item.id)}
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
});

module.exports = MatrimonyHome;
