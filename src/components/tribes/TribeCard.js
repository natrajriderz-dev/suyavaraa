// src/components/tribes/TribeCard.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');

const TribeCard = ({ item, isLocked, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.tribeCard,
        isLocked && styles.tribeCardLocked
      ]}
      onPress={() => onPress(item)}
    >
      <View style={styles.tribeIcon}>
        <Text style={{ fontSize: 30 }}>{item.icon}</Text>
      </View>
      <Text style={styles.tribeName}>{item.name}</Text>
      <Text style={styles.tribeMemberCount}>{item.member_count} members</Text>
      <Text style={styles.tribeDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {isLocked && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={16} color={Colors.locked || '#9CA3AF'} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tribeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    margin: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 180,
  },
  tribeCardLocked: {
    opacity: 0.8,
  },
  tribeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tribeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  tribeMemberCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  tribeDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  lockOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

module.exports = TribeCard;
