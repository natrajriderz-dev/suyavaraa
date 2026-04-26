// src/screens/main/NotificationsScreen.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../../../supabase');
const notificationService = require('../../services/notificationService');
const Colors = require('../../theme/Colors');

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      loadNotifications(user.id);
    }
  };

  const loadNotifications = async (uid = userId) => {
    if (!uid) return;
    try {
      const data = await notificationService.getNotifications(uid);
      setNotifications(data);
      // Mark all as read when opening the screen
      await notificationService.markAllAsRead(uid);
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNotificationPress = (item) => {
    if (item.type === 'interest') {
      navigation.navigate('Connections', { screen: 'MatchesList', params: { activeTab: 'requests' } });
    } else if (item.type === 'match') {
      navigation.navigate('Chat', { 
        conversationId: item.data?.match_id, 
        otherUser: { id: item.actor_id } 
      });
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.item, !item.read_at && styles.unreadItem]} 
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={
            item.type === 'interest' ? 'heart' : 
            item.type === 'match' ? 'people' : 
            item.type === 'message' ? 'chatbubble' : 'notifications'
          } 
          size={24} 
          color={item.type === 'match' ? Colors.success : Colors.primary} 
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.content}</Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      {!item.read_at && <View style={styles.unreadDot} />}
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications()} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
  unreadItem: { backgroundColor: Colors.primary + '05' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  body: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  time: { fontSize: 12, color: Colors.border },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, alignSelf: 'center', marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});

module.exports = NotificationsScreen;
