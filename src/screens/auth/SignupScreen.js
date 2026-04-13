// src/screens/auth/SignupScreen.js
const React = require('react');
const {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} = require('react-native');
const { useState } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const { Ionicons } = require('@expo/vector-icons');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sign up with email and password
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: 'suyavaraa://login-callback',
          data: {
            email_confirmed: true // Auto-confirm email
          }
        }
      });

      if (signUpError) throw signUpError;

      if (user) {
        // Auto-log user in after signup
        const { data: { session }, error: autoLoginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });

        if (autoLoginError) throw autoLoginError;

        if (session) {
          await AsyncStorage.setItem('userToken', session.access_token);
          await AsyncStorage.setItem('userData', JSON.stringify(user));
          navigation.navigate('BasicInfo', { email: user.email });
        }
      }
    } catch (err) {
      console.error('Signup Error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={AuthStyles.scrollContainer}>
      <Text style={AuthStyles.title}>Create Account</Text>
      <Text style={AuthStyles.subtitle}>Join Suyavaraa to find meaningful connections</Text>

      <Text style={AuthStyles.inputLabel}>Email</Text>
      <TextInput
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
          style={[AuthStyles.input, { flex: 1, marginRight: 10 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password (min 6 characters)"
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

      <Text style={AuthStyles.inputLabel}>Confirm Password</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <TextInput
          style={[AuthStyles.input, { flex: 1, marginRight: 10 }]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={{
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors.surface,
            borderRadius: 8,
          }}
        >
          <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={AuthStyles.button} onPress={handleSignup} disabled={loading}>
        <Text style={AuthStyles.buttonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[AuthStyles.linkText, { textAlign: 'center', marginTop: 24 }]}>Already have an account? Login</Text>
      </TouchableOpacity>

      {loading && (
        <View style={AuthStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};

module.exports = SignupScreen;
