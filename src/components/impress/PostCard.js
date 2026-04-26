// src/components/impress/PostCard.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} = require('react-native');
const { useState } = React;
const Colors = require('../../theme/Colors');

const { width } = Dimensions.get('window');

const REACTIONS = [
  { type: 'interested', icon: '🤔', color: Colors.interested, label: 'Interested' },
  { type: 'inspired', icon: '✨', color: Colors.inspired, label: 'Inspired' },
  { type: 'impressed', icon: '👏', color: Colors.impressed, label: 'Impressed' },
  { type: 'love', icon: '❤️', color: Colors.love, label: 'Love' },
];

const PostCard = ({ post, onReaction, onUserPress, onReport }) => {
  const [showFullCaption, setShowFullCaption] = useState(false);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderReactions = () => {
    return REACTIONS.map((reaction) => {
      const count = post.reaction_counts?.[reaction.type] || 0;
      const isActive = post.user_reaction?.type === reaction.type;

      return (
        <TouchableOpacity
          key={reaction.type}
          style={[styles.reactionButton, isActive && styles.reactionButtonActive]}
          onPress={() => onReaction(post.id, reaction.type)}
        >
          <Text style={styles.reactionIcon}>{reaction.icon}</Text>
          <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
            {count}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  const truncatedCaption = post.caption.length > 150 && !showFullCaption
    ? post.caption.substring(0, 150) + '... '
    : post.caption;

  return (
    <View style={styles.postCard}>
      <TouchableOpacity style={styles.postHeader} onPress={() => onUserPress(post.user_id)}>
        <Image source={{ uri: post.user?.profile_picture_url || 'https://via.placeholder.com/40' }} style={styles.postAvatar} />
        <View style={styles.postUserInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.postUserName}>{post.user?.display_name}</Text>
            {post.user?.trust_level === 'green_verified' && (
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
            )}
          </View>
          <View style={styles.postUserMeta}>
            <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{post.user?.location || 'Location not set'} • {formatTime(post.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
      {onReport ? (
        <TouchableOpacity style={styles.reportIconButton} onPress={() => onReport(post)}>
          <Text style={styles.reportIconText}>⋯</Text>
        </TouchableOpacity>
      ) : null}

      {post.media_urls && post.media_urls.length > 0 && (
        <Image source={{ uri: post.media_urls[0] }} style={styles.postImage} />
      )}

      <View style={{ padding: 12 }}>
        <Text style={styles.postCaption}>
          {truncatedCaption}
          {post.caption.length > 150 && !showFullCaption && (
            <Text style={{ color: Colors.primary }} onPress={() => setShowFullCaption(true)}>more</Text>
          )}
        </Text>
      </View>

      <View style={styles.reactionsBar}>{renderReactions()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: { backgroundColor: Colors.surface, marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  postUserInfo: { flex: 1 },
  reportIconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  reportIconText: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  postUserName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  postUserMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  verifiedBadge: { backgroundColor: Colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  verifiedText: { color: Colors.primary, fontSize: 10, fontWeight: '600' },
  postImage: { width: width, height: width, resizeMode: 'cover' },
  postCaption: { paddingHorizontal: 4, fontSize: 14, color: Colors.text, lineHeight: 20 },
  reactionsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderColor: Colors.border },
  reactionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  reactionButtonActive: { backgroundColor: Colors.primary + '20' },
  reactionIcon: { fontSize: 18, marginRight: 6 },
  reactionCount: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  reactionCountActive: { color: Colors.primary },
});

module.exports = PostCard;
