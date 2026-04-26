const React = require('react');
const { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } = require('react-native');
const { useEffect, useState } = React;
const { supabase } = require('../../supabase');
const familyAccountService = require('../../src/services/familyAccountService');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../src/theme/Colors');

const FamilyAccountScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState([]);
  const [preferredMode, setPreferredMode] = useState(null);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const mode = await familyAccountService.getPreferredMode(user.id);
      setPreferredMode(mode);
      if (mode !== 'community') {
        setRestricted(true);
        setLoading(false);
        return;
      }

      const members = await familyAccountService.getFamilyMembers(user.id);
      setFamily(members || []);
    } catch (err) {
      if (!restricted) {
        console.warn('Family account load error:', err.message);
      }
      setFamily([]);
    } finally {
      if (!restricted) {
        setLoading(false);
      }
    }
  };

  const handleAddFamily = () => {
    Alert.alert('Family Accounts', 'Family account linking will be available soon.');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (restricted) {
    return (
      <View style={styles.center}>
        <Text style={styles.restrictedTitle}>Family Accounts are only available for Matrimony Community users.</Text>
        <Text style={styles.restrictedText}>
          Switch to Community mode from the Matrimony home screen to unlock Family Account support.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Family Account</Text>
      <Text style={styles.subtitle}>
        Link a parent or guardian to help you review proposals, send messages, or manage your matrimony account.
      </Text>
      <View style={styles.card}>
        {family.length > 0 ? family.map((member) => (
          <View key={member.member_user_id} style={styles.familyRow}>
            <View>
              <Text style={styles.familyName}>{member.member_user_id}</Text>
              <Text style={styles.familyMeta}>{member.role} • {member.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
            <Ionicons name="person-circle" size={32} color={Colors.primary} />
          </View>
        )) : (
          <Text style={styles.emptyText}>No family accounts linked yet.</Text>
        )}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleAddFamily}>
        <Text style={styles.buttonText}>Link Family Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },
  familyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  familyName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  familyMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  restrictedText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

module.exports = FamilyAccountScreen;
