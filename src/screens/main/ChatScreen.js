// src/screens/main/ChatScreen.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Image,
  Modal,
  Alert,
} = require('react-native');
const { useState, useEffect, useRef } = React;
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');
const MessageBubble = require('../../components/chat/MessageBubble');
const ChatInput = require('../../components/chat/ChatInput');

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, otherUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    setupChat();
    
    // Subscribe to new messages
    const messageSub = supabase
      .channel(`chat_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${conversationId}`
      }, (payload) => {
        const newMessage = {
          id: payload.new.id,
          sender_id: payload.new.sender_id,
          message_text: payload.new.content,
          message_type: payload.new.message_type || 'text',
          created_at: payload.new.created_at,
          read_at: payload.new.read_at,
        };
        setMessages(prev => {
          // Prevent duplicates if already added optimistically
          if (prev.find(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      })
      .subscribe();

    // Subscribe to typing indicators using Presence
    const typingSub = supabase.channel(`typing_${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingSub.presenceState();
        const typingUsers = Object.values(state).flat().filter(p => p.isTyping && p.userId !== currentUserId);
        setOtherUserTyping(typingUsers.length > 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
      supabase.removeChannel(typingSub);
    };
  }, [conversationId, currentUserId]);

  const setupChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      loadMessages(user.id);
      markAsRead(user.id);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', conversationId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          message_text: m.content,
          message_type: m.message_type || 'text',
          created_at: m.created_at,
          read_at: m.read_at
        })));
      }
    } catch (e) {
      console.log('Load error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (userId) => {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('match_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);
    stopTyping();

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: conversationId,
          sender_id: currentUserId,
          content: text,
          message_type: 'text'
        })
        .select()
        .single();

      if (data) {
        // Optimistic update
        setMessages(prev => [...prev, {
          id: data.id,
          sender_id: currentUserId,
          message_text: text,
          message_type: 'text',
          created_at: data.created_at
        }]);
      }
    } catch (e) {
      Alert.alert('Error', 'Message failed to send');
      setInputText(text); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setInputText(text);
    if (!isTyping) {
      setIsTyping(true);
      const typingSub = supabase.channel(`typing_${conversationId}`);
      typingSub.track({ userId: currentUserId, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    const typingSub = supabase.channel(`typing_${conversationId}`);
    typingSub.track({ userId: currentUserId, isTyping: false });
  };

  const formatMessageTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatus = (msg) => {
    if (msg.read_at) return { icon: '✓✓', color: Colors.read };
    return { icon: '✓', color: Colors.textMuted };
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          <Image source={{ uri: otherUser.profile_picture_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
          <View>
            <Text style={styles.userName}>{otherUser.display_name}</Text>
            {otherUserTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              <Text style={styles.statusText}>Online</Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => Alert.alert('Report', 'Report user?')}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            isMine={item.sender_id === currentUserId}
            otherUser={otherUser}
            formatTime={formatMessageTime}
            getStatus={getStatus}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <ChatInput
        value={inputText}
        onChangeText={handleTyping}
        onSend={sendMessage}
        onAttach={() => Alert.alert('Add', 'Coming soon')}
        sending={sending}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  userName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusText: { fontSize: 12, color: Colors.success },
  typingText: { fontSize: 12, color: Colors.primary, fontStyle: 'italic' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});

module.exports = ChatScreen;
