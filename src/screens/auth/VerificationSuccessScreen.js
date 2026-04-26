// src/screens/auth/VerificationSuccessScreen.js
const React = require('react');
const { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');

const { supabase } = require('../../../supabase');

const VerificationSuccessScreen = ({ navigation }) => {
  const handleContinue = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({
            onboarding_step: 'ModeSelect',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Failed to update onboarding step:', error);
    }

    navigation.replace('ModeSelect');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-done-circle" size={100} color={Colors.success} />
        </View>
        <Text style={styles.title}>Submission Received!</Text>
        <Text style={styles.desc}>
          Thank you for verifying. Our admin team will review your video within 24 hours. 
          You can continue exploring the community in the meantime.
        </Text>
        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={handleContinue}
        >
          <Text style={styles.primaryBtnText}>Continue to App</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { 
    width: 160, 
    height: 160, 
    borderRadius: 80, 
    backgroundColor: Colors.surface, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  primaryBtn: { 
    backgroundColor: Colors.primary, 
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 18, 
    alignItems: 'center',
    elevation: 4,
    boxShadow: '0px 4px 8px rgba(217,119,6,0.2)',
  },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

module.exports = VerificationSuccessScreen;
