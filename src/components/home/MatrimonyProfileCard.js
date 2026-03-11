// src/components/home/MatrimonyProfileCard.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} = require('react-native');
const { LinearGradient } = require('expo-linear-gradient');
const Colors = require('../../theme/Colors');

const MatrimonyProfileCard = ({ item, onSelect, onInterest, alreadySent }) => {
  return (
    <LinearGradient
      colors={['#ffffff', '#f9f9f9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <TouchableOpacity onPress={onSelect}>
        <Image
          source={{ uri: item.primary_photo_url || 'https://via.placeholder.com/300' }}
          style={styles.cardPhoto}
        />
        {item.trust_level === 'green_verified' && (
          <View style={styles.cardVerifiedBadge}>
            <Text style={{ fontSize: 10 }}>✅</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.display_name}</Text>
          <Text style={styles.cardAge}>, {item.age}</Text>
        </View>

        {item.religion || item.mother_tongue ? (
          <Text style={styles.cardReligion} numberOfLines={1}>
            {[item.religion, item.mother_tongue].filter(Boolean).join(' • ')}
          </Text>
        ) : null}

        {item.occupation ? (
          <Text style={styles.cardOccupation} numberOfLines={1}>
            💼 {item.occupation}
          </Text>
        ) : null}

        {item.education ? (
          <Text style={styles.cardEducation} numberOfLines={1}>
            🎓 {item.education}
          </Text>
        ) : null}

        <Text style={styles.cardCity} numberOfLines={1}>
          📍 {item.city || 'Location not set'}
        </Text>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={onSelect}
            activeOpacity={0.7}
          >
            <Text style={styles.viewBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.interestBtn,
              alreadySent && { backgroundColor: Colors.success }
            ]}
            onPress={onInterest}
            disabled={alreadySent}
            activeOpacity={0.8}
          >
            <Text style={styles.interestBtnText}>
              {alreadySent ? '✓' : '💛'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardPhoto: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  cardVerifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  cardBody: {
    padding: 12,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    letterSpacing: 0.3,
  },
  cardAge: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cardReligion: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardOccupation: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  cardEducation: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  cardCity: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 10,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  viewBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  interestBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  interestBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

module.exports = MatrimonyProfileCard;
