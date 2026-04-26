const React = require('react');
const {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} = require('react-native');
const { useEffect, useState } = React;
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');

const MemberProfileScreen = ({ route, navigation }) => {
  const { userId, fallbackMember } = route.params || {};
  const [member, setMember] = useState(fallbackMember || null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('none'); // 'none', 'liked', 'received', 'matched'
  const [matchId, setMatchId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const handleReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !member?.id) throw new Error('Unable to identify the current member');

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_id: member.id,
        content_type: 'user_account',
        reason: 'Profile reported by member',
        category: 'general',
        severity: 'medium',
        status: 'pending',
      });

      if (error) throw error;
      Alert.alert('Report submitted', 'Thanks. Our moderation team will review this profile.');
    } catch (error) {
      Alert.alert('Unable to report', error.message || 'Please try again.');
    }
  };

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_actions').insert({
        actor_user_id: user.id,
        target_user_id: member.id,
        action_type: 'like'
      });

      if (error) throw error;

      // Check if match was created (mutual like)
      if (connectionStatus === 'received') {
        const { data: match } = await supabase
          .from('matches')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${member.id}),and(user1_id.eq.${member.id},user2_id.eq.${user.id})`)
          .single();
        
        if (match) {
          setMatchId(match.id);
          setConnectionStatus('matched');
          Alert.alert("It's a Match!", `You and ${member.name} can now chat.`);
        } else {
          setConnectionStatus('liked');
        }
      } else {
        setConnectionStatus('liked');
        Alert.alert("Interest Sent", `Your interest has been shared with ${member.name}.`);
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Error', 'Unable to send interest. Please try again.');
    }
  };

  const handleBlock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !member?.id) throw new Error('Unable to identify the current member');

      const { error } = await supabase.from('user_blocks').upsert({
        blocker_id: user.id,
        blocked_id: member.id,
        reason: 'Blocked from member profile',
      }, { onConflict: 'blocker_id,blocked_id' });

      if (error) throw error;
      Alert.alert('Member blocked', 'You will no longer interact with this member from your account.');
    } catch (error) {
      Alert.alert('Unable to block', error.message || 'Please try again.');
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load member data
      if (userId) {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, city, bio, trust_score, user_profiles(primary_photo_url)')
          .eq('id', userId)
          .single();

        if (error) throw error;

        setMember({
          id: data.id,
          name: data.full_name,
          city: data.city,
          bio: data.bio,
          trust_score: data.trust_score,
          photo: data.user_profiles?.[0]?.primary_photo_url || null,
        });

        // Check connection status
        await checkConnection(user.id, userId);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async (myId, otherId) => {
    try {
      // 1. Check for match
      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${myId},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${myId})`)
        .maybeSingle();

      if (match) {
        setConnectionStatus('matched');
        setMatchId(match.id);
        return;
      }

      // 2. Check for my like
      const { data: myLike } = await supabase
        .from('user_actions')
        .select('id')
        .eq('actor_user_id', myId)
        .eq('target_user_id', otherId)
        .eq('action_type', 'like')
        .maybeSingle();

      if (myLike) {
        setConnectionStatus('liked');
        return;
      }

      // 3. Check for their like
      const { data: theirLike } = await supabase
        .from('user_actions')
        .select('id')
        .eq('actor_user_id', otherId)
        .eq('target_user_id', myId)
        .eq('action_type', 'like')
        .maybeSingle();

      if (theirLike) {
        setConnectionStatus('received');
      }
    } catch (error) {
      console.error('Check connection error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Image
            source={{ uri: member?.photo || 'https://via.placeholder.com/160' }}
            style={styles.photo}
          />
          <Text style={styles.name}>{member?.name || 'Community Member'}</Text>
          <Text style={styles.city}>{member?.city || 'Location not available'}</Text>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
            <Text style={styles.badgeText}>
              Trust Score {member?.trust_score ?? 'N/A'}
            </Text>
          </View>
          <Text style={styles.bio}>
            {member?.bio || 'This member has not added a bio yet.'}
          </Text>
          {member?.id ? (
            <View style={styles.connectionActions}>
              {connectionStatus === 'matched' ? (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.chatButton]} 
                  onPress={() => navigation.navigate('Chat', { 
                    conversationId: matchId, 
                    otherUser: { id: member.id, display_name: member.name, profile_picture_url: member.photo } 
                  })}
                >
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                  <Text style={styles.actionButtonTextPrimary}>Message</Text>
                </TouchableOpacity>
              ) : connectionStatus === 'liked' ? (
                <View style={[styles.actionButton, styles.disabledButton]}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.textSecondary} />
                  <Text style={styles.actionButtonText}>Interest Sent</Text>
                </View>
              ) : connectionStatus === 'received' ? (
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleLike}>
                  <Ionicons name="heart" size={20} color="#fff" />
                  <Text style={styles.actionButtonTextPrimary}>Accept Interest</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleLike}>
                  <Ionicons name="heart-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonTextPrimary}>Send Interest</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {member?.id ? (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                <Ionicons name="flag-outline" size={18} color={Colors.text} />
                <Text style={styles.reportButtonText}>Report Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blockButton} onPress={handleBlock}>
                <Ionicons name="hand-left-outline" size={18} color="#fff" />
                <Text style={styles.blockButtonText}>Block Member</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', padding: 24, paddingBottom: 40 },
  photo: { width: 160, height: 160, borderRadius: 80, marginBottom: 20, backgroundColor: Colors.surface },
  name: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  city: { fontSize: 15, color: Colors.textSecondary, marginBottom: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  badgeText: { color: Colors.primary, fontWeight: '700', marginLeft: 8 },
  bio: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 30 },
  connectionActions: { width: '100%', marginBottom: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  primaryButton: { backgroundColor: Colors.primary },
  chatButton: { backgroundColor: Colors.success },
  disabledButton: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionButtonText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 16 },
  actionButtonTextPrimary: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actions: { width: '100%', gap: 12 },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportButtonText: { marginLeft: 8, color: Colors.text, fontWeight: '600' },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EF4444',
  },
  blockButtonText: { marginLeft: 8, color: '#fff', fontWeight: '600' },
});

module.exports = MemberProfileScreen;
