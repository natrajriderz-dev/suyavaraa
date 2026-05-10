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
// SECURITY: Use SecureStore instead of AsyncStorage for tokens
const SecureStore = require('expo-secure-store');
const { supabase } = require('../../../supabase');
const { Ionicons } = require('@expo/vector-icons');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');
const verificationService = require('../../services/verificationService');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigateFromAuth = (target) => {
    const parentNavigation = navigation.getParent?.();

    if (parentNavigation?.replace) {
      parentNavigation.replace(target);
      return;
    }

    if (parentNavigation?.navigate) {
      parentNavigation.navigate(target);
      return;
    }

    navigation.replace(target);
  };

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

      if (signInError) {
        throw signInError;
      }

      if (session && user) {
        if (!user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError('Please verify your email before logging in.');
          return;
        }

        await verificationService.syncEmailVerificationState(user);

        // Only store token securely. Don't store the full user object.
        await SecureStore.setItemAsync('userToken', session.access_token);

        // Check if profile is complete
        const { data: profile } = await supabase
          .from('users')
          .select('profile_complete')
          .eq('id', user.id)
          .single();

        if (profile?.profile_complete) {
          navigateFromAuth('Main');
        } else {
          navigateFromAuth('Onboarding');
        }
      }
    } catch (err) {
      // Don't log full error details in production
      let errorMessage = err.message || 'Failed to login';
      
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        errorMessage = 'Network Error: Please check your internet connection.';
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

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
        <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '600' }}>Forgot Password?</Text>
      </TouchableOpacity>

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}

      <TouchableOpacity testID="login-submit-button" style={AuthStyles.button} onPress={handleLogin} disabled={loading}>
        <Text style={AuthStyles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={[AuthStyles.linkText, { textAlign: 'center', marginTop: 24 }]}>Don't have an account? Sign up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          try {
            await verificationService.resendSignupVerificationEmail(email);
            setError('');
          } catch (err) {
            setError(err.message || 'Unable to resend verification email.');
          }
        }}
      >
        <Text style={[AuthStyles.linkText, { textAlign: 'center', marginTop: 12 }]}>Resend verification email</Text>
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
