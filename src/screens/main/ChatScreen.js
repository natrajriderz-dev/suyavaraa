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
const { pickMedia, uploadMedia } = require('../../utils/mediaUtils');
const fishTrapService = require('../../services/fishTrapService');
const moderationService = require('../../services/moderationService');
const notificationService = require('../../services/notificationService');

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, otherUser } = route.params;
  const otherMember = otherUser || { profile_picture_url: null, display_name: 'Member' };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isDecoyChat, setIsDecoyChat] = useState(false);
  const [decoyInteraction, setDecoyInteraction] = useState(null);
  
  const flatListRef = useRef(null);
  const messageChannelRef = useRef(null);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    setupChat();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

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

        // Send notification for incoming messages (not from current user)
        if (payload.new.sender_id !== currentUserId) {
          notificationService.notifyMessage(otherMember, payload.new.content);
        }
      })
      .subscribe();

    messageChannelRef.current = messageSub;

    const typingSub = supabase.channel(`typing_${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingSub.presenceState();
        const typingUsers = Object.values(state).flat().filter(p => p.isTyping && p.userId !== currentUserId);
        setOtherUserTyping(typingUsers.length > 0);
      })
      .subscribe();

    typingChannelRef.current = typingSub;

    return () => {
      if (messageChannelRef.current) supabase.removeChannel(messageChannelRef.current);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
    };
  }, [conversationId, currentUserId]);

  const setupChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Check if this is a decoy chat
      const interaction = await checkIfDecoyChat(user.id, conversationId);
      if (interaction) {
        setIsDecoyChat(true);
        setDecoyInteraction(interaction);
        loadDecoyMessages(interaction.id);
      } else {
        setIsDecoyChat(false);
        await loadMessages(user.id);
        await markAsRead(user.id);
      }
    } catch (error) {
      console.error('Chat setup error:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, content, message_type, created_at, read_at')
        .eq('match_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []).map((message) => ({
        id: message.id,
        sender_id: message.sender_id,
        message_text: message.content,
        message_type: message.message_type || 'text',
        created_at: message.created_at,
        read_at: message.read_at,
      })));
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Unable to load chat', 'Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async () => {
    if (sending || !currentUserId) return;
    setSending(true);

    try {
      const picked = await pickMedia('library', true, 'image');
      if (!picked || !picked.uri) return;

      const fileName = picked.name || picked.uri.split('/').pop() || `photo-${Date.now()}.jpg`;
      const extension = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
      const filePath = `chat/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const uploadedUrl = await uploadMedia(picked.uri, 'avatars', filePath);
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: conversationId,
          sender_id: currentUserId,
          content: uploadedUrl,
          message_type: 'image',
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, {
        id: data.id,
        sender_id: currentUserId,
        message_text: uploadedUrl,
        message_type: 'image',
        created_at: data.created_at,
      }] );
    } catch (error) {
      console.error('Chat attachment error:', error);
      Alert.alert('Attachment failed', error.message || 'Unable to send image');
    } finally {
      setSending(false);
    }
  };

  const checkIfDecoyChat = async (userId, conversationId) => {
    try {
      // Try to find a decoy interaction with this conversation ID
      const { data, error } = await supabase
        .from('fish_trap_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('id', conversationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;
    } catch (error) {
      console.error('Error checking decoy chat:', error);
      return null;
    }
  };

  const loadDecoyMessages = async (interactionId) => {
    try {
      const history = await fishTrapService.getConversationHistory(interactionId);
      const formattedMessages = history.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_type === 'user' ? currentUserId : 'decoy',
        message_text: msg.displayed_content,
        message_type: 'text',
        created_at: msg.created_at
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading decoy messages:', error);
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

    // Profanity scrubbing
    const scrubbedText = moderationService.scrubText(text);

    try {
      if (isDecoyChat && decoyInteraction) {
        // Handle decoy chat through Fish Trap service
        const result = await fishTrapService.processUserMessage(decoyInteraction.id, text);

        if (result.success) {
          // Add user message optimistically
          const userMessage = {
            id: Date.now().toString(),
            sender_id: currentUserId,
            message_text: result.scrubbed ? result.response : text, // Show scrubbed version if modified
            message_type: 'text',
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, userMessage]);

          // Add decoy response after a short delay
          setTimeout(() => {
            const decoyMessage = {
              id: (Date.now() + 1).toString(),
              sender_id: 'decoy',
              message_text: result.response,
              message_type: 'text',
              created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, decoyMessage]);
          }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds

        } else {
          Alert.alert('Error', result.error || 'Failed to send message');
        }

      } else {
        // Handle regular chat
        const { data, error } = await supabase
          .from('messages')
          .insert({
            match_id: conversationId,
            sender_id: currentUserId,
            content: scrubbedText,
            message_type: 'text'
          })
          .select()
          .single();

        if (data) {
          // Optimistic update
          setMessages(prev => [...prev, {
            id: data.id,
            sender_id: currentUserId,
            message_text: scrubbedText,
            message_type: 'text',
            created_at: data.created_at
          }]);
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Message failed to send');
      setInputText(text); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setInputText(text);

    if (!typingChannelRef.current && currentUserId && conversationId) {
      const typingSub = supabase.channel(`typing_${conversationId}`);
      typingSub.subscribe();
      typingChannelRef.current = typingSub;
    }

    if (!isTyping) {
      setIsTyping(true);
      typingChannelRef.current?.track?.({ userId: currentUserId, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    typingChannelRef.current?.track?.({ userId: currentUserId, isTyping: false });
  };

  const formatMessageTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatus = (msg) => {
    if (msg.read_at) return { icon: '✓✓', color: Colors.read };
    return { icon: '✓', color: Colors.textMuted };
  };

  const reportOtherUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !otherUser?.id) throw new Error('Unable to identify the member');

      const result = await moderationService.reportContent(
        user.id,
        otherUser.id,
        'chat',
        conversationId,
        'Chat participant reported by member'
      );

      if (!result.success) throw new Error(result.error || 'Could not submit report');
      Alert.alert('Report submitted', 'Our moderation team will review this conversation.');
    } catch (error) {
      Alert.alert('Unable to report', error.message || 'Please try again.');
    }
  };

  const blockOtherUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !otherUser?.id) throw new Error('Unable to identify the member');

      const { error } = await supabase.from('user_blocks').upsert({
        blocker_id: user.id,
        blocked_id: otherUser.id,
        reason: 'Blocked from chat safety actions',
      }, { onConflict: 'blocker_id,blocked_id' });

      if (error) throw error;
      Alert.alert('Member blocked', 'You can leave this chat. Future interactions from this member should be restricted.');
    } catch (error) {
      Alert.alert('Unable to block', error.message || 'Please try again.');
    }
  };

  const openSafetyActions = () => {
    Alert.alert(
      'Chat Safety',
      'Choose an action for this member.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Profile', onPress: () => navigation.navigate('MemberProfile', { userId: otherUser?.id, fallbackMember: {
          id: otherUser?.id,
          name: otherUser?.display_name,
          photo: otherUser?.profile_picture_url || null,
        } }) },
        { text: 'Report User', onPress: reportOtherUser },
        { text: 'Block User', style: 'destructive', onPress: blockOtherUser },
      ]
    );
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
          <Image source={{ uri: otherMember.profile_picture_url || 'https://via.placeholder.com/40' }} style={styles.avatar} />
          <View>
            <Text style={styles.userName}>{otherMember.display_name}</Text>
            {otherUserTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              <Text style={styles.statusText}>Online</Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={openSafetyActions}>
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
        onAttach={handleAttach}
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
