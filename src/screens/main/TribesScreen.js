// src/screens/main/TribesScreen.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  StyleSheet,
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const { useMode } = require('../../../context/ModeContext');
const { checkIsAdmin } = require('../../config/privilegedAccess');
const Colors = require('../../theme/Colors');
const TribeCard = require('../../components/tribes/TribeCard');
const MyTribeCard = require('../../components/tribes/MyTribeCard');

const TribesScreen = ({ navigation }) => {
  const { userMode, activeMode, isPremium } = useMode();
  const [userTribes, setUserTribes] = useState([]);
  const [allTribes, setAllTribes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState(null);

  useEffect(() => {
    loadUserData();
    loadTribes();
  }, [activeMode]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (await checkIsAdmin(user.id)) {
        await AsyncStorage.setItem('isPremium', 'true');
      }

      const { data: rows, error } = await supabase
        .from('user_tribes')
        .select(`is_primary, tribes(id, name, description, icon, category)`)
        .eq('user_id', user.id);

      if (rows) {
        setUserTribes(rows.map(r => ({
          is_primary: r.is_primary,
          tribe: {
            id: r.tribes.id,
            name: r.tribes.name,
            description: r.tribes.description,
            icon: r.tribes.icon,
            member_count: Math.floor(Math.random() * 100) + 20,
          }
        })));
      }
    } catch (error) {
      console.log('Load user data error:', error.message);
    }
  };

  const loadTribes = async () => {
    try {
      const { data, error } = await supabase
        .from('tribes')
        .select('id, slug, name, description, icon, category, member_count')
        .eq('category', activeMode)
        .order('name', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setAllTribes([]);
        return;
      }

      setAllTribes(data.map((tribe) => ({
        id: tribe.id,
        slug: tribe.slug,
        name: tribe.name,
        description: tribe.description,
        icon: tribe.icon || '✨',
        member_count: tribe.member_count || 0,
        category: tribe.category,
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleTribePress = (tribe) => {
    const isUserTribe = userTribes.some(t => t.tribe.id === tribe.id);
    if (isUserTribe || isPremium) {
      navigation.navigate('TribeInner', { tribe, userMode: activeMode });
    } else {
      setSelectedTribe(tribe);
      setShowPremiumModal(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const itemType = activeMode === 'dating' ? 'Tribes' : 'Zones';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{itemType}</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {!isPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={() => setShowPremiumModal(true)}>
            <View style={styles.premiumIcon}><Text>⭐</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.premiumTitle}>Unlock All {itemType}</Text>
              <Text style={styles.premiumDesc}>Go Premium to join and explore any {itemType.toLowerCase()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {userTribes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My {itemType}</Text>
              <Text style={styles.sectionCount}>{userTribes.length}/3</Text>
            </View>
            <FlatList
              horizontal
              data={userTribes}
              renderItem={({ item }) => <MyTribeCard item={item} onPress={() => handleTribePress(item.tribe)} />}
              keyExtractor={item => item.tribe.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All {itemType}</Text>
            <Text style={styles.sectionCount}>{allTribes.length}</Text>
          </View>
          {allTribes.length > 0 ? (
            <FlatList
              data={allTribes}
              renderItem={({ item }) => (
                <TribeCard
                  item={item}
                  isLocked={!isPremium && !userTribes.some(t => t.tribe.id === item.id)}
                  onPress={handleTribePress}
                />
              )}
              keyExtractor={item => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 14 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No {itemType} Available</Text>
              <Text style={styles.emptyStateDesc}>Check back later or try a different mode.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showPremiumModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPremiumModal(false)}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>⭐</Text>
            <Text style={styles.modalTitle}>Unlock Premium</Text>
            <Text style={styles.modalText}>
              Join "{selectedTribe?.name}" and explore all {itemType.toLowerCase()} with Premium membership.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowPremiumModal(false); navigation.navigate('Premium'); }}>
              <Text style={styles.modalBtnText}>View Premium Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPremiumModal(false)} style={{ marginTop: 16 }}>
              <Text style={{ color: Colors.textSecondary }}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingBottom: 30 },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.primary + '40' },
  premiumIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  premiumTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  premiumDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  sectionCount: { fontSize: 14, color: Colors.textSecondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', padding: 40, marginTop: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 16 },
  emptyStateDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 24, padding: 30, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  modalText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtn: { backgroundColor: Colors.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: Colors.text, fontWeight: 'bold', fontSize: 16 },
});

module.exports = TribesScreen;
