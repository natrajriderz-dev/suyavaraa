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
const { useMode } = require('../../context/ModeContext');
const Colors = require('../../theme/Colors');
const { tribesData } = require('../../utils/constants');
const TribeCard = require('../../components/tribes/TribeCard');
const MyTribeCard = require('../../components/tribes/MyTribeCard');

const TribesScreen = ({ navigation }) => {
  const { userMode } = useMode();
  const [isPremium, setIsPremium] = useState(false);
  const [userTribes, setUserTribes] = useState([]);
  const [allTribes, setAllTribes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState(null);

  useEffect(() => {
    loadUserData();
    loadTribes();
  }, [userMode]);

  const loadUserData = async () => {
    try {
      const premium = await AsyncStorage.getItem('isPremium') === 'true';
      setIsPremium(premium);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      const mappedTribes = tribesData.map(tribe => {
        const modeData = userMode === 'dating' ? tribe.dating : tribe.matrimony;
        return {
          id: tribe.id,
          ...modeData,
          icon: tribe.icon,
          member_count: Math.floor(Math.random() * 100) + 20,
        };
      });
      setAllTribes(mappedTribes);
    } finally {
      setLoading(false);
    }
  };

  const handleTribePress = (tribe) => {
    const isUserTribe = userTribes.some(t => t.tribe.id === tribe.id);
    if (isUserTribe || isPremium) {
      navigation.navigate('TribeInner', { tribe, userMode });
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

  const itemType = userMode === 'dating' ? 'Tribes' : 'Zones';

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 24, padding: 30, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  modalText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtn: { backgroundColor: Colors.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: Colors.text, fontWeight: 'bold', fontSize: 16 },
});

module.exports = TribesScreen;
