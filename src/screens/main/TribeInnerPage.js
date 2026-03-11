// src/screens/main/TribeInnerPage.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');

const TribeInnerPage = ({ route, navigation }) => {
  const { tribe, userMode } = route.params;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    checkMembership();
    loadMembers();
  }, [tribe.id]);

  const checkMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_tribes')
        .select('*')
        .eq('user_id', user.id)
        .eq('tribe_id', tribe.id)
        .single();

      setIsMember(!!data);
    } catch (e) {
      console.log('Check membership error:', e.message);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tribes')
        .select('user_id, users(full_name, city, user_profiles(primary_photo_url))')
        .eq('tribe_id', tribe.id)
        .limit(20);

      if (data) {
        setMembers(data.map(m => ({
          id: m.user_id,
          name: m.users.full_name,
          city: m.users.city,
          photo: m.users.user_profiles?.[0]?.primary_photo_url
        })));
      }
    } catch (e) {
      console.log('Load members error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_tribes').insert({
        user_id: user.id,
        tribe_id: tribe.id
      });
      setIsMember(true);
      loadMembers();
    } catch (e) {
      console.log('Join error:', e.message);
    }
  };

  const handleLeave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_tribes').delete().eq('user_id', user.id).eq('tribe_id', tribe.id);
      setIsMember(false);
      loadMembers();
    } catch (e) {
      console.log('Leave error:', e.message);
    }
  };

  const renderMember = ({ item }) => (
    <TouchableOpacity style={styles.memberItem} onPress={() => navigation.navigate('Profile', { userId: item.id })}>
      <Image source={{ uri: item.photo || 'https://via.placeholder.com/40' }} style={styles.memberAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberCity}>{item.city}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tribe.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.tribeHero}>
          <Text style={styles.heroEmoji}>{tribe.icon}</Text>
          <Text style={styles.heroName}>{tribe.name}</Text>
          <Text style={styles.heroDesc}>{tribe.description}</Text>

          {isMember ? (
            <TouchableOpacity style={[styles.actionBtn, styles.leaveBtn]} onPress={handleLeave}>
              <Text style={styles.actionBtnText}>Leave Tribe</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={handleJoin}>
              <Text style={styles.actionBtnText}>Join Tribe</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{members.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>🏷️</Text>
            <Text style={styles.statLabel}>{userMode === 'dating' ? 'Tribe' : 'Zone'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No members yet.</Text>}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  tribeHero: { alignItems: 'center', padding: 30, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  heroEmoji: { fontSize: 64, marginBottom: 16 },
  heroName: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  actionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 25 },
  leaveBtn: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { color: Colors.text, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', padding: 20, gap: 12 },
  statBox: { flex: 1, backgroundColor: Colors.surface, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  memberCity: { fontSize: 12, color: Colors.textMuted },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 20 },
});

module.exports = TribeInnerPage;
