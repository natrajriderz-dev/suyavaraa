// src/components/tribes/MyTribeCard.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} = require('react-native');
const Colors = require('../../theme/Colors');

const MyTribeCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.myTribeCard, item.is_primary && styles.myTribePrimary]}
    onPress={() => onPress(item.tribe)}
  >
    <View style={styles.myTribeIcon}>
      <Text style={{ fontSize: 24 }}>{item.tribe.icon}</Text>
    </View>
    <Text style={styles.myTribeName} numberOfLines={1}>{item.tribe.name}</Text>
    <Text style={styles.myTribeMemberCount}>{item.tribe.member_count} members</Text>
    {item.is_primary && (
      <View style={styles.myTribeBadge}>
        <Text>⭐</Text>
        <Text style={styles.myTribeBadgeText}>Primary</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  myTribeCard: {
    width: 140,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  myTribePrimary: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  myTribeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  myTribeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  myTribeMemberCount: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  myTribeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  myTribeBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
});

module.exports = MyTribeCard;
