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
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const { supabase } = require('../../../supabase');

const { width } = Dimensions.get('window');

const SuyamvaramScreen = ({ navigation }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setLoading(true);
    // Mocking challenges as per the Product Guide examples
    const mockChallenges = [
      {
        id: '1',
        title: 'The Melodic Match',
        description: 'Sing an original 2-minute song about your life philosophy.',
        type: 'Skill Demonstration',
        creator: 'Ananya S.',
        creator_image: 'https://i.pravatar.cc/150?u=ananya',
        participants: 12,
        max_participants: 50,
        deadline: '2 days left',
        reward: 'Direct connection + Verified Badge'
      },
      {
        id: '2',
        title: 'Strength of Character',
        description: 'Complete 100 push-ups in one set and document it.',
        type: 'Fitness Achievement',
        creator: 'Vikram R.',
        creator_image: 'https://i.pravatar.cc/150?u=vikram',
        participants: 8,
        max_participants: 30,
        deadline: '5 days left',
        reward: 'Direct connection'
      },
      {
        id: '3',
        title: 'The Poet\'s Heart',
        description: 'Write a poem about what trust means in partnership.',
        type: 'Creative Expression',
        creator: 'Priya M.',
        creator_image: 'https://i.pravatar.cc/150?u=priya',
        participants: 24,
        max_participants: 50,
        deadline: '1 day left',
        reward: 'Exclusive Chat Unlock'
      }
    ];

    setTimeout(() => {
      setChallenges(mockChallenges);
      setLoading(false);
    }, 1000);
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
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply Now</Text>
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
            <Text style={styles.logoText}>BOND</Text>
            <TouchableOpacity style={styles.createBtn}>
              <Ionicons name="add" size={24} color="#D97706" />
              <Text style={styles.createBtnText}>New</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.heroTitle}>Suyamvaram</Text>
          <Text style={styles.heroSub}>Choose your partner the ancient way.</Text>
          
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>12</Text>
              <Text style={styles.heroStatLabel}>Active Challenges</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>450+</Text>
              <Text style={styles.heroStatLabel}>Applicants</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Trending Matches</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>

        <FlatList
          data={challenges}
          renderItem={({ item }) => <ChallengeCard item={item} />}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />

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
});

module.exports = SuyamvaramScreen;
