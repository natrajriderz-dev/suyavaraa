// src/screens/auth/LoginScreen.js
const React = require('react');
const {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} = require('react-native');
const { useState } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const { Ionicons } = require('@expo/vector-icons');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session, user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      // Handle email not confirmed error - bypass for internal/testing
      if (signInError?.message?.includes('Email not confirmed')) {
        console.warn('Email not confirmed, attempting bypass...');
        // This allows users to proceed even if email isn't confirmed
        // In production, you should send a confirmation email instead
      }

      if (signInError && !signInError?.message?.includes('Email not confirmed')) {
        throw signInError;
      }

      if (session && user) {
        await AsyncStorage.setItem('userToken', session.access_token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));

        // Check if profile is complete
        const { data: profile } = await supabase
          .from('users')
          .select('profile_complete')
          .eq('id', user.id)
          .single();

        if (profile?.profile_complete) {
          navigation.replace('Main');
        } else {
          navigation.replace('BasicInfo', { email: user.email });
        }
      } else if (!session && signInError?.message?.includes('Email not confirmed')) {
        // User exists but email not confirmed - show message with option to confirm
        setError('Please verify your email. Check your inbox for the confirmation link.');
      }
    } catch (err) {
      console.error('Login Error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      let errorMessage = 'Failed to login';
      if (err.message && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={AuthStyles.scrollContainer}>
      <Text style={AuthStyles.title}>Welcome Back</Text>
      <Text style={AuthStyles.subtitle}>Login to continue your journey</Text>

      <Text style={AuthStyles.inputLabel}>Email</Text>
      <TextInput
        testID="login-email-input"
        style={AuthStyles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        placeholderTextColor={Colors.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={AuthStyles.inputLabel}>Password</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <TextInput
          testID="login-password-input"
          style={[AuthStyles.input, { flex: 1, marginRight: 10 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.surface,
            borderRadius: 8,
          }}
        >
          <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}

      <TouchableOpacity testID="login-submit-button" style={AuthStyles.button} onPress={handleLogin} disabled={loading}>
        <Text style={AuthStyles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={[AuthStyles.linkText, { textAlign: 'center', marginTop: 24 }]}>Don't have an account? Sign up</Text>
      </TouchableOpacity>

      {loading && (
        <View style={AuthStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};

module.exports = LoginScreen;
