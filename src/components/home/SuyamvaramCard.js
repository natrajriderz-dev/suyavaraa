// src/components/home/SuyamvaramCard.js
const React = require('react');
const {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const Colors = require('../../theme/Colors');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;

const SuyamvaramCard = ({ profile, onLike, onPass, onDetail }) => {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: profile.primary_photo_url || 'https://via.placeholder.com/400' }}
        style={styles.image}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      />
      
      <View style={styles.info}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.display_name}, {profile.age}</Text>
          {profile.trust_level === 'green_verified' && (
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          )}
        </View>
        
        <Text style={styles.meta}>{profile.occupation} • {profile.city}</Text>
        <Text style={styles.meta}>{profile.religion} • {profile.education}</Text>
        
        <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
        
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={() => onPass(profile.id)}>
            <Ionicons name="close" size={30} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.detailBtn} onPress={() => onDetail(profile)}>
            <Text style={styles.detailText}>View Full Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => onLike(profile.id)}>
            <Ionicons name="heart" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 40,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignSelf: 'center',
    elevation: 10,
    boxShadow: '0px 5px 10px rgba(0,0,0,0.3)',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  meta: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  passBtn: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  likeBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  detailBtn: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  detailText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

module.exports = SuyamvaramCard;
