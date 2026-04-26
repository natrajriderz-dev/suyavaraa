// src/screens/main/MatchesListScreen.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} = require('react-native');
const { useState, useEffect } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');

const { Ionicons } = require('@expo/vector-icons');

const MatchesListScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('messages');
  const [matches, setMatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    init();
    const subscription = supabase
      .channel('matches_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadData(); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_actions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      loadData(user.id);
    }
  };

  const loadData = async (userId = currentUserId) => {
    if (!userId) return;
    setRefreshing(true);
    await Promise.all([
      loadMatches(userId),
      loadRequests(userId)
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const loadMatches = async (userId) => {
    try {
      const { data: matchRows, error } = await supabase
        .from('matches')
        .select(`
          id, created_at, user1_id, user2_id,
          user1:user1_id(id, full_name, user_profiles(primary_photo_url)),
          user2:user2_id(id, full_name, user_profiles(primary_photo_url))
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(matchRows.map(async (match) => {
        const otherUser = match.user1_id === userId ? match.user2 : match.user1;
        
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, message_type')
          .eq('match_id', match.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: match.id,
          other_user: {
            id: otherUser?.id,
            display_name: otherUser?.full_name || 'Suyavaraa User',
            profile_picture_url: otherUser?.user_profiles?.[0]?.primary_photo_url || null,
          },
          last_message: lastMsg ? {
            text: lastMsg.content,
            time: lastMsg.created_at,
            is_mine: lastMsg.sender_id === userId
          } : null
        };
      }));

      enriched.sort((a, b) => {
        const timeA = a.last_message?.time || 0;
        const timeB = b.last_message?.time || 0;
        return new Date(timeB) - new Date(timeA);
      });

      setMatches(enriched);
    } catch (e) {
      console.log('Load matches error:', e.message);
    }
  };

  const loadRequests = async (userId) => {
    try {
      // Find users who liked me
      const { data: incoming, error } = await supabase
        .from('user_actions')
        .select(`
          id, created_at, actor_user_id,
          actor:actor_user_id(id, full_name, city, user_profiles(primary_photo_url))
        `)
        .eq('target_user_id', userId)
        .eq('action_type', 'like');

      if (error) throw error;

      // Filter out those I already liked (which would be matches)
      const { data: myActions } = await supabase
        .from('user_actions')
        .select('target_user_id')
        .eq('actor_user_id', userId);
      
      const myLikedIds = new Set((myActions || []).map(a => a.target_user_id));
      
      const filtered = incoming
        .filter(req => !myLikedIds.has(req.actor_user_id))
        .map(req => ({
          id: req.id,
          user: {
            id: req.actor.id,
            display_name: req.actor.full_name,
            city: req.actor.city,
            profile_picture_url: req.actor.user_profiles?.[0]?.primary_photo_url || null,
          },
          created_at: req.created_at
        }));

      setRequests(filtered);
    } catch (e) {
      console.log('Load requests error:', e.message);
    }
  };

  const handleAccept = async (request) => {
    try {
      // Like back to create a match (trigger will handle match creation)
      const { error } = await supabase.from('user_actions').insert({
        actor_user_id: currentUserId,
        target_user_id: request.user.id,
        action_type: 'like'
      });

      if (error) throw error;

      // Manually create match if trigger is not ready or to be safe
      const { data: matchExists } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${request.user.id}),and(user1_id.eq.${request.user.id},user2_id.eq.${currentUserId})`)
        .single();
      
      if (!matchExists) {
        await supabase.from('matches').insert({
          user1_id: request.user.id,
          user2_id: currentUserId
        });
      }

      // Success! Reload data and switch to messages
      loadData();
      setActiveTab('messages');
    } catch (e) {
      console.error('Accept error:', e);
    }
  };

  const handleIgnore = async (request) => {
    try {
      // Just record a 'pass' action to hide it
      await supabase.from('user_actions').insert({
        actor_user_id: currentUserId,
        target_user_id: request.user.id,
        action_type: 'pass'
      });
      loadData();
    } catch (e) {
      console.error('Ignore error:', e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderMatchItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Chat', {
        conversationId: item.id,
        otherUser: item.other_user
      })}
    >
      <Image
        source={{ uri: item.other_user.profile_picture_url || 'https://via.placeholder.com/60' }}
        style={styles.photo}
      />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name}>{item.other_user.display_name}</Text>
          <Text style={styles.time}>{formatTime(item.last_message?.time)}</Text>
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.last_message ? (
            `${item.last_message.is_mine ? 'You: ' : ''}${item.last_message.text}`
          ) : (
            'Match created! Say hello 👋'
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
        onPress={() => navigation.navigate('MemberProfile', { userId: item.user.id })}
      >
        <Image
          source={{ uri: item.user.profile_picture_url || 'https://via.placeholder.com/60' }}
          style={styles.photo}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{item.user.display_name}</Text>
          <Text style={styles.city}>{item.user.city}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.ignoreBtn} onPress={() => handleIgnore(item)}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}>
          <Ionicons name="heart" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connections</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages {matches.length > 0 ? `(${matches.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Interests {requests.length > 0 ? `(${requests.length})` : ''}
          </Text>
          {requests.length > 0 && <View style={styles.dot} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'messages' ? matches : requests}
        renderItem={activeTab === 'messages' ? renderMatchItem : renderRequestItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData()} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === 'messages' ? 'No conversations yet' : 'No interest requests yet'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'messages' ? 'Start swiping to find your matches!' : 'Share your profile or keep swiping!'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, marginHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: Colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  photo: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  info: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  city: { fontSize: 13, color: Colors.textSecondary },
  time: { fontSize: 12, color: Colors.textSecondary },
  lastMsg: { fontSize: 14, color: Colors.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  dot: { position: 'absolute', top: 12, right: 20, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  requestActions: { flexDirection: 'row', gap: 10 },
  ignoreBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
});

module.exports = MatchesListScreen;
