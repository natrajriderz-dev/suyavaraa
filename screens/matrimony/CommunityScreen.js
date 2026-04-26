const React = require('react');
const { View, Text, StyleSheet, TouchableOpacity, ScrollView } = require('react-native');
const { useMode } = require('../../context/ModeContext');
const Colors = require('../../src/theme/Colors');

const CommunityScreen = ({ navigation }) => {
  const { activeMode } = useMode();
  const modeLabel = activeMode === 'matrimony' ? 'Community Channels' : 'Communities';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>{modeLabel}</Text>
        <Text style={styles.subtitle}>Browse community spaces, parent groups, and regional channels.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming Soon</Text>
        <Text style={styles.cardText}>
          We are building a dedicated community channel experience for matrimony users.
          You will be able to join channels, chat with members, and connect with moderators.
        </Text>
      </View>
      <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Premium')}>
        <Text style={styles.actionText}>Unlock Community Access</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 40,
  },
  hero: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    boxShadow: '0px 6px 18px rgba(0,0,0,0.08)',
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  cardText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

module.exports = CommunityScreen;
