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

const MatchesListScreen = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    init();
    const subscription = supabase
      .channel('matches_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadMatches(); // Reload list on any new message
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
      loadMatches(user.id);
    }
  };

  const loadMatches = async (userId = currentUserId) => {
    if (!userId) return;
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
        
        // Get last message
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
            display_name: otherUser?.full_name || 'BOND User',
            profile_picture_url: otherUser?.user_profiles?.[0]?.primary_photo_url || null,
          },
          last_message: lastMsg ? {
            text: lastMsg.content,
            time: lastMsg.created_at,
            is_mine: lastMsg.sender_id === userId
          } : null
        };
      }));

      // Sort by last message time
      enriched.sort((a, b) => {
        const timeA = a.last_message?.time || 0;
        const timeB = b.last_message?.time || 0;
        return new Date(timeB) - new Date(timeA);
      });

      setMatches(enriched);
    } catch (e) {
      console.log('Load matches error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const renderItem = ({ item }) => (
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={matches}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMatches()} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySub}>Start swiping to find your matches!</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  photo: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  info: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  time: { fontSize: 12, color: Colors.textSecondary },
  lastMsg: { fontSize: 14, color: Colors.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});

module.exports = MatchesListScreen;
