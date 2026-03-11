// src/components/chat/MessageBubble.js
const React = require('react');
const { View, Text, StyleSheet, Image, TouchableOpacity } = require('react-native');
const Colors = require('../../theme/Colors');

const MessageBubble = ({ item, isMine, otherUser, formatTime, getStatus }) => {
  const status = isMine ? getStatus(item) : null;

  const renderContent = () => {
    switch (item.message_type) {
      case 'image':
        return (
          <TouchableOpacity style={styles.mediaMessage}>
            <Image source={{ uri: item.message_text }} style={styles.imageMessage} />
          </TouchableOpacity>
        );
      case 'voice':
        return (
          <View style={styles.voiceMessage}>
            <Text>🎤</Text>
            <View style={styles.voiceWave} />
            <Text style={[styles.messageTime, { marginTop: 0 }]}>0:30</Text>
          </View>
        );
      default:
        return <Text style={styles.messageText}>{item.message_text}</Text>;
    }
  };

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
      <View style={styles.row}>
        {!isMine && (
          <Image
            source={{ uri: otherUser.profile_picture_url || 'https://via.placeholder.com/30' }}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs
        ]}>
          {renderContent()}
          <View style={[styles.footer, isMine ? { justifyContent: 'flex-end' } : {}]}>
            <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
            {status && (
              <Text style={[styles.statusIcon, { color: status.color }]}>
                {status.icon}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16, maxWidth: '85%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '100%' },
  bubbleMine: { backgroundColor: Colors.messageMine, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.messageTheirs, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  messageTime: { fontSize: 10, color: Colors.textSecondary },
  statusIcon: { marginLeft: 4, fontSize: 10 },
  mediaMessage: { borderRadius: 12, overflow: 'hidden' },
  imageMessage: { width: 220, height: 160, borderRadius: 12 },
  voiceMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, padding: 10, borderRadius: 15, minWidth: 150 },
  voiceWave: { flex: 1, height: 2, backgroundColor: Colors.primary + '40', marginHorizontal: 8 },
});

module.exports = MessageBubble;
