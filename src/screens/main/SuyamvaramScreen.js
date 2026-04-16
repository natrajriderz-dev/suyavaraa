// src/screens/main/SuyamvaramScreen.js
const React = require('react');
const {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const { supabase } = require('../../../supabase');

const { width } = Dimensions.get('window');

const SuyamvaramScreen = ({ navigation }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    loadChallenges();
    
    // Refresh listener when returning from CreateSuyamvaram
    const unsubscribe = navigation.addListener('focus', () => {
      loadChallenges();
    });
    return unsubscribe;
  }, [navigation]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suyamvaram_challenges')
        .select(`
          *,
          participant_count,
          auth_users:creator_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const formattedData = data.map(challenge => {
          const creatorData = challenge.auth_users?.raw_user_meta_data || {};
          const creatorName = creatorData.full_name || challenge.auth_users?.email?.split('@')[0] || 'Anonymous';
          const profileImage = creatorData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&background=random`;

          // Format deadline
          const deadlineDate = new Date(challenge.deadline);
          const today = new Date();
          const diffTime = Math.abs(deadlineDate - today);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const deadlineStr = deadlineDate < today ? 'Expired' : `${diffDays} days left`;
          
          return {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            type: challenge.challenge_type,
            creator: creatorName,
            creator_image: profileImage,
            creator_id: challenge.creator_id,
            participants: challenge.participant_count || 0,
            max_participants: challenge.max_participants,
            deadline: deadlineStr,
            reward: challenge.reward,
            isExpired: deadlineDate < today
          };
        });

        // Filter out expired challenges from display
        setChallenges(formattedData.filter(c => !c.isExpired));
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
      // Fallback or error state
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (challenge) => {
    try {
      setApplying(challenge.id);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to apply');
        return;
      }

      // Check if trying to apply to own challenge
      if (user.id === challenge.creator_id) {
        Alert.alert('Notice', 'This is your own challenge!');
        return;
      }

      const { data, error } = await supabase
        .from('suyamvaram_applications')
        .insert({
          challenge_id: challenge.id,
          applicant_id: user.id,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation Code
           Alert.alert('Notice', 'You have already applied to this challenge!');
           return;
        }
        throw error;
      }

      Alert.alert('Success', 'Application sent successfully! The creator will review your profile.');
      
      // Update local state slightly to show participant count increase if needed, or re-fetch
      loadChallenges();
      
    } catch (error) {
      console.error('Apply error:', error);
      Alert.alert('Error', 'Failed to apply. Please try again later.');
    } finally {
      setApplying(null);
    }
  };

  const ChallengeCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => {}}>
      <LinearGradient
        colors={['#ffffff', '#fff9f0']}
        style={styles.cardInner}
      >
        <View style={styles.cardHeader}>
          <Image source={{ uri: item.creator_image }} style={styles.creatorImage} />
          <View style={styles.headerText}>
            <Text style={styles.creatorName}>{item.creator}</Text>
            <Text style={styles.challengeType}>{item.type}</Text>
          </View>
          <View style={styles.deadlineBadge}>
            <Text style={styles.deadlineText}>{item.deadline}</Text>
          </View>
        </View>

        <Text style={styles.challengeTitle}>{item.title}</Text>
        <Text style={styles.challengeDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerStat}>
            <Ionicons name="people" size={16} color="#D97706" />
            <Text style={styles.footerStatText}>{item.participants}/{item.max_participants}</Text>
          </View>
          <TouchableOpacity 
            style={styles.applyBtn}
            onPress={() => handleApply(item)}
            disabled={applying === item.id}
          >
            {applying === item.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.applyBtnText}>Apply Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={['#D97706', '#F59E0B']}
          style={styles.hero}
        >
          <View style={styles.appHeader}>
            <Text style={styles.logoText}>Suyavaraa</Text>
            <TouchableOpacity 
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateSuyamvaram')}
            >
              <Ionicons name="add" size={24} color="#D97706" />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.heroTitle}>Suyamvaram</Text>
          <Text style={styles.heroSub}>Choose your partner the ancient way.</Text>
          
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{challenges.length}</Text>
              <Text style={styles.heroStatLabel}>Active Challenges</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>--</Text>
              <Text style={styles.heroStatLabel}>Applicants</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Trending Matches</Text>
          {challenges.length > 0 && <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>}
        </View>

        {challenges.length > 0 ? (
          <FlatList
            data={challenges}
            renderItem={({ item }) => <ChallengeCard item={item} />}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active challenges found.</Text>
            <Text style={styles.emptySubText}>Be the first to create one!</Text>
          </View>
        )}

        <View style={styles.infoBanner}>
          <Text style={styles.infoTitle}>What is Suyamvaram?</Text>
          <Text style={styles.infoText}>
            Inspired by ancient tradition, Suyamvaram empowers independent adults to choose partners through skill and character contests. No relatives, no bias—just real connection.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  logoText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  createBtnText: { color: '#D97706', fontWeight: 'bold', marginLeft: 4 },
  heroTitle: { color: '#ffffff', fontSize: 40, fontWeight: 'bold' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 4 },
  heroStats: { flexDirection: 'row', marginTop: 24, gap: 20 },
  heroStat: { alignItems: 'flex-start' },
  heroStatVal: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' },
  seeAll: { color: '#D97706', fontWeight: '600' },
  card: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardInner: { padding: 20, borderTopWidth: 1, borderTopColor: '#fff' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  creatorImage: { width: 44, height: 44, borderRadius: 22 },
  headerText: { flex: 1, marginLeft: 12 },
  creatorName: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1E' },
  challengeType: { fontSize: 12, color: '#6B7280' },
  deadlineBadge: { backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  deadlineText: { color: '#D97706', fontSize: 11, fontWeight: 'bold' },
  challengeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 },
  challengeDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f1f1', paddingTop: 16 },
  footerStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatText: { color: '#6B7280', fontSize: 13 },
  applyBtn: { backgroundColor: '#D97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  applyBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  infoBanner: { margin: 24, padding: 24, backgroundColor: '#F9FAFB', borderRadius: 20, borderLeftWidth: 4, borderLeftColor: '#D97706' },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#1C1C1E', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});

module.exports = SuyamvaramScreen;
