// src/screens/auth/LandingScreen.js
const React = require('react');
const { View, Text, TouchableOpacity, Platform } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../../../supabase');
const Colors = require('../../theme/Colors');
const AuthStyles = require('./AuthStyles');

const LandingScreen = ({ navigation }) => {
  const handleSocialLogin = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: 'bondapp://login-callback', // Change to your actual deep link
        },
      });

      if (error) throw error;
      
      // The browser will open for OAuth flow. 
      // In a real app, you'd handle the callback deep link.
    } catch (error) {
      console.error(`${provider} login error:`, error.message);
    }
  };

  return (
    <View style={AuthStyles.centerContainer}>
      <View style={AuthStyles.logo}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: Colors.primary,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 36, color: Colors.text, fontWeight: 'bold' }}>BOND</Text>
        </View>
      </View>

      <Text style={AuthStyles.title}>Welcome to BOND</Text>
      <Text style={AuthStyles.subtitle}>
        The premium dating app for meaningful connections
      </Text>

      <View style={AuthStyles.buttonContainer}>
        <TouchableOpacity
          style={AuthStyles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={AuthStyles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[AuthStyles.button, AuthStyles.buttonOutline]}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={[AuthStyles.buttonText, AuthStyles.buttonOutlineText]}>Create Account</Text>
        </TouchableOpacity>

        <View style={AuthStyles.dividerContainer}>
          <View style={AuthStyles.dividerLine} />
          <Text style={AuthStyles.dividerText}>or continue with</Text>
          <View style={AuthStyles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[AuthStyles.socialButton, AuthStyles.socialButtonGoogle]}
          onPress={() => handleSocialLogin('google')}
        >
          <Ionicons name="logo-google" size={20} color="#EA4335" style={AuthStyles.socialIcon} />
          <Text style={[AuthStyles.socialButtonText, { color: '#374151' }]}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[AuthStyles.socialButton, AuthStyles.socialButtonApple]}
          onPress={() => handleSocialLogin('apple')}
        >
          <Ionicons name="logo-apple" size={22} color="#ffffff" style={AuthStyles.socialIcon} />
          <Text style={[AuthStyles.socialButtonText, { color: '#ffffff' }]}>Continue with Apple</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        }}
        style={{ marginTop: 40, backgroundColor: '#1F2937', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#D97706' }}
      >
        <Text style={{ color: '#D97706', fontSize: 14, fontWeight: '700' }}>⚡ Dev Skip → Main App</Text>
      </TouchableOpacity>
      
      {/* Test Account Info (Dev only) */}
      <View style={{ marginTop: 20, padding: 16, backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>Test Account Info:</Text>
        <Text style={{ color: '#D97706', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
          Phone: {process.env.EXPO_PUBLIC_TEST_PHONE || '+919999999999'}
        </Text>
        <Text style={{ color: '#D97706', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }}>
          OTP: {process.env.EXPO_PUBLIC_TEST_OTP || '123456'}
        </Text>
      </View>
    </View>
  );
};

module.exports = LandingScreen;
