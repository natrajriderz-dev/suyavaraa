const React = require('react');
const {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} = require('react-native');
const { useEffect, useState } = React;
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');
const verificationService = require('../../services/verificationService');

const MobileOtpVerificationScreen = ({ navigation }) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadExistingPhone = async () => {
      try {
        const overview = await verificationService.getVerificationOverview();
        const existingPhone = overview?.profile?.phone_number || '';
        const verificationStatus = overview?.profile?.phone_verification_status || 'unverified';

        if (!mounted) return;

        if (existingPhone.startsWith('+91') && existingPhone.length > 3) {
          setCountryCode('+91');
          setPhoneNumber(existingPhone.slice(3));
        } else if (existingPhone.startsWith('+')) {
          const match = existingPhone.match(/^(\+\d{1,3})(\d+)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhoneNumber(match[2]);
          }
        }

        if (verificationStatus === 'pending') {
          setOtpSent(true);
        }
      } catch (loadError) {
        console.warn('Failed to load phone verification state:', loadError.message);
      }
    };

    loadExistingPhone();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setError('');

    try {
      await verificationService.startPhoneVerification(countryCode, phoneNumber);
      setOtpSent(true);
      Alert.alert('OTP Sent', 'We sent a verification code to your mobile number.');
    } catch (err) {
      setError(err.message || 'Unable to send OTP right now.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const fullPhoneNumber = verificationService.normalizePhoneNumber(countryCode, phoneNumber);
      await verificationService.verifyPhoneOtp(fullPhoneNumber, otpCode);
      navigation.replace('VideoVerification');
    } catch (err) {
      setError(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={AuthStyles.scrollContainer}>
      <Text style={AuthStyles.title}>Verify Mobile Number</Text>
      <Text style={AuthStyles.subtitle}>
        Add a working mobile number so we can protect the account with OTP-based verification.
      </Text>

      <Text style={AuthStyles.inputLabel}>Mobile Number</Text>
      <View style={AuthStyles.phoneContainer}>
        <TextInput
          style={AuthStyles.countryCode}
          value={countryCode}
          onChangeText={setCountryCode}
          keyboardType="phone-pad"
          placeholder="+91"
          placeholderTextColor={Colors.textSecondary}
        />
        <TextInput
          style={[AuthStyles.input, AuthStyles.phoneInput]}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder="Enter mobile number"
          placeholderTextColor={Colors.textSecondary}
        />
      </View>

      <TouchableOpacity
        style={[AuthStyles.button, sendingOtp ? { opacity: 0.7 } : null]}
        onPress={handleSendOtp}
        disabled={sendingOtp}
      >
        <Text style={AuthStyles.buttonText}>{sendingOtp ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}</Text>
      </TouchableOpacity>

      {otpSent ? (
        <>
          <Text style={AuthStyles.inputLabel}>OTP Code</Text>
          <TextInput
            style={AuthStyles.input}
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            placeholder="Enter the OTP you received"
            placeholderTextColor={Colors.textSecondary}
            maxLength={8}
          />

          <TouchableOpacity
            style={[AuthStyles.button, loading ? { opacity: 0.7 } : null]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            <Text style={AuthStyles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}

      {(loading || sendingOtp) ? (
        <View style={AuthStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : null}
    </ScrollView>
  );
};

module.exports = MobileOtpVerificationScreen;
