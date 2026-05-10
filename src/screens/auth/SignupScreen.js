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
  Switch,
} = require('react-native');
const { useState } = React;
// SECURITY: Use SecureStore instead of AsyncStorage for tokens
const SecureStore = require('expo-secure-store');
const { supabase } = require('../../../supabase');
const { Ionicons } = require('@expo/vector-icons');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');
const verificationService = require('../../services/verificationService');

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [referralCode, setReferralCode] = useState('');

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

  const validatePassword = (pass) => {
    const minLength = 8;
    const hasNumber = /\d/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    return pass.length >= minLength && hasNumber && hasUpper && hasLower && hasSpecial;
  };

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

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!acceptedPolicies) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    // Basic sanitization for referral code
    const cleanReferralCode = referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    setLoading(true);
    setError('');

    try {
      // Sign up with email and password
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: verificationService.EMAIL_REDIRECT_URL,
          data: {
            email_confirmed: false, // Force email confirmation for security
            accepted_terms_at: new Date().toISOString(),
            accepted_privacy_at: new Date().toISOString(),
          }
        }
      });

      if (signUpError) throw signUpError;

      // Don't auto-login if email confirmation is required.
      // The user should check their email.
      if (user && user.identities && user.identities.length === 0) {
        setError('An account with this email already exists.');
        setLoading(false);
        return;
      }

      Alert.alert(
        "Verification Email Sent",
        "Please check your email to verify your account before logging in.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );

      // If we somehow still auto-logged in (e.g. email confirmation disabled in Supabase),
      // handle the token storage securely.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
          await SecureStore.setItemAsync('userToken', sessionData.session.access_token);
          
          // Apply referral code if provided
          if (cleanReferralCode.length > 0) {
            const { error: referralError } = await supabase.rpc('apply_referral_code', {
              p_user_id: user.id,
              p_referral_code: cleanReferralCode
            });
            if (referralError) {
               // Silently fail for the user, log securely if needed
               console.debug('Referral application skipped');
            }
          }
          navigateFromAuth('Onboarding');
      }

    } catch (err) {
      // Don't log full error objects in production
      let errorMessage = err.message || 'Failed to create account';
      
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

      <Text style={AuthStyles.inputLabel}>Referral Code (Optional)</Text>
      <TextInput
        style={[AuthStyles.input, { marginBottom: 16 }]}
        value={referralCode}
        onChangeText={setReferralCode}
        placeholder="Enter a friend's code for free Premium"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="characters"
      />

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
        <Switch
          value={acceptedPolicies}
          onValueChange={setAcceptedPolicies}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.surface}
          style={{ marginRight: 10, marginTop: -2 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text, fontSize: 14, lineHeight: 20 }}>
            I agree to the Terms of Service and Privacy Policy.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            <TouchableOpacity onPress={() => navigation.navigate('LegalDocument', { documentKey: 'terms' })}>
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>View Terms</Text>
            </TouchableOpacity>
            <Text style={{ color: Colors.textSecondary }}>  •  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LegalDocument', { documentKey: 'privacy' })}>
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>View Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={AuthStyles.button} onPress={handleSignup} disabled={loading}>
        <Text style={AuthStyles.buttonText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[AuthStyles.linkText, { textAlign: 'center', marginTop: 24 }]}>Already have an account? Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          try {
            await verificationService.resendSignupVerificationEmail(email);
            setError('');
            Alert.alert('Verification Email Sent', 'We sent a fresh verification email to your inbox.');
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

module.exports = SignupScreen;
