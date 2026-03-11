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
const { supabase } = require('../../../supabase');
const { Ionicons } = require('@expo/vector-icons');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');

const SignupScreen = ({ navigation }) => {
  const handleSocialLogin = async (provider) => {
    try {
      setLoading(true);
      setError('');
      const { data, error: socialError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: 'bondapp://login-callback',
        },
      });

      if (socialError) throw socialError;
    } catch (err) {
      setError(err.message || `Failed to signup with ${provider}`);
    } finally {
      setLoading(false);
    }
  };
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signUpError } = await supabase.auth.signInWithOtp({
        phone: `${countryCode}${phoneNumber}`,
      });

      if (signUpError) throw signUpError;

      setShowOtp(true);
      Alert.alert('OTP Sent', 'Please check your phone for the verification code');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter complete OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `${countryCode}${phoneNumber}`,
        token: otpString,
        type: 'sms'
      });

      if (verifyError) throw verifyError;

      if (session) {
        navigation.navigate('BasicInfo', {
          phone: `${countryCode}${phoneNumber}`
        });
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={AuthStyles.scrollContainer}>
      <Text style={AuthStyles.title}>Create Account</Text>
      <Text style={AuthStyles.subtitle}>Join BOND to find meaningful connections</Text>

      {!showOtp ? (
        <>
          <Text style={AuthStyles.inputLabel}>Phone Number</Text>
          <View style={AuthStyles.phoneContainer}>
            <TextInput
              style={AuthStyles.countryCode}
              value={countryCode}
              onChangeText={setCountryCode}
              placeholder="+91"
              placeholderTextColor={Colors.textSecondary}
            />
            <TextInput
              style={[AuthStyles.input, AuthStyles.phoneInput]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity style={AuthStyles.button} onPress={handleSendOtp} disabled={loading}>
            <Text style={AuthStyles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={AuthStyles.inputLabel}>Enter Verification Code</Text>
          <View style={AuthStyles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={AuthStyles.otpInput}
                value={digit}
                onChangeText={(text) => {
                  const newOtp = [...otp];
                  newOtp[index] = text;
                  setOtp(newOtp);
                }}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity style={AuthStyles.button} onPress={handleVerifyOtp} disabled={loading}>
            <Text style={AuthStyles.buttonText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowOtp(false)}>
            <Text style={AuthStyles.linkText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}

      {!showOtp && (
        <>
          <View style={AuthStyles.dividerContainer}>
            <View style={AuthStyles.dividerLine} />
            <Text style={AuthStyles.dividerText}>or continue with</Text>
            <View style={AuthStyles.dividerLine} />
          </View>

          <View style={{ gap: 4 }}>
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
        </>
      )}

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
