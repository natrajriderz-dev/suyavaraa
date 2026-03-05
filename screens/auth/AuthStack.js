// screens/auth/AuthStack.js
const React = require('react');
const {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} = require('react-native');
const { createStackNavigator } = require('@react-navigation/stack');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const ImagePicker = require('expo-image-picker');
const { supabase } = require('../../supabase');
const { useState, useEffect } = React;

const Stack = createStackNavigator();

// Colors
const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#D97706',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  error: '#EF4444',
  success: '#10B981',
  border: '#2D2D2D',
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonOutlineText: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  countryCode: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginRight: 8,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: 80,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 16,
  },
  otpInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    width: 60,
    height: 60,
    textAlign: 'center',
    color: colors.text,
    fontSize: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photoImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 14,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  uploadButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  genderButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  genderText: {
    color: colors.text,
  },
  genderTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

// Splash Screen
const SplashScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Simulate splash screen delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');

        if (token && userData) {
          // Navigate to main app
          console.log('Session found, navigating to main app');
          // navigation.replace('MainApp');
        } else {
          navigation.replace('Landing');
        }
      } catch (error) {
        console.error('Session check error:', error);
        navigation.replace('Landing');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.centerContainer}>
      <View style={styles.logo}>
        {/* Replace with your actual logo */}
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 48, color: colors.text, fontWeight: 'bold' }}>BOND</Text>
        </View>
      </View>
      <Text style={styles.title}>BOND</Text>
      <Text style={styles.subtitle}>Find your perfect match</Text>
      {isLoading && <ActivityIndicator size="large" color={colors.primary} />}
    </View>
  );
};

// Landing Screen
const LandingScreen = ({ navigation }) => {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.logo}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 36, color: colors.text, fontWeight: 'bold' }}>BOND</Text>
        </View>
      </View>

      <Text style={styles.title}>Welcome to BOND</Text>
      <Text style={styles.subtitle}>
        The premium dating app for meaningful connections
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={[styles.buttonText, styles.buttonOutlineText]}>Create Account</Text>
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
      
      {/* Test Account Info */}
      <View style={{ marginTop: 20, padding: 16, backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151' }}>
        <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>Test Account Info:</Text>
        <Text style={{ color: '#D97706', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
          Phone: {process.env.EXPO_PUBLIC_TEST_PHONE || '+919999999999'}
        </Text>
        <Text style={{ color: '#D97706', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }}>
          OTP: {process.env.EXPO_PUBLIC_TEST_OTP || '123456'}
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 10, marginTop: 8 }}>
          Testing Mode: {process.env.EXPO_PUBLIC_TESTING_MODE === 'true' ? 'ENABLED' : 'DISABLED'}
        </Text>
      </View>
      
      <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 8 }}>Remove before launch</Text>
    </View>
  );
};

// Helper function to create a complete test user profile
const createTestUserProfile = async (user) => {
  try {
    // First, ensure the user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        full_name: 'Test User',
        date_of_birth: '1990-01-01',
        gender: 'Other',
        city: 'Test City',
        profile_complete: true,
        trust_level: 'verified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phone: user.phone,
        email: user.email,
      }, {
        onConflict: 'id'
      });

    if (userError) {
      console.error('Error creating user record:', userError);
    }

    // Create user profile with photos
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        primary_photo_url: 'https://via.placeholder.com/400x400/FF9900/FFFFFF?text=Test+User',
        bio: 'This is a test user account for development and testing purposes.',
        occupation: 'Software Developer',
        height_cm: 175,
        education: 'Bachelor\'s Degree',
        income_range: '$50,000 - $100,000',
        looking_for: 'Serious Relationship',
        marriage_timeline: 'Within 1 year',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
    }

    // Set user mode to dating
    await AsyncStorage.setItem('userMode', 'dating');
    await AsyncStorage.setItem('isPremium', 'true');
    await AsyncStorage.setItem('trustLevel', 'verified');
    
    console.log('Test user profile created successfully');
  } catch (error) {
    console.error('Error in createTestUserProfile:', error);
  }
};

// Helper function to ensure test user profile exists
const ensureTestUserProfile = async (user) => {
  try {
    // Check if user exists in users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError || !existingUser) {
      // Create profile if it doesn't exist
      await createTestUserProfile(user);
    } else {
      // Update AsyncStorage with existing data
      await AsyncStorage.setItem('userMode', 'dating');
      await AsyncStorage.setItem('isPremium', 'true');
      await AsyncStorage.setItem('trustLevel', existingUser.trust_level || 'verified');
    }
  } catch (error) {
    console.error('Error in ensureTestUserProfile:', error);
  }
};

// Login Screen
const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
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
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      
      // Check for testing mode bypass
      const testingMode = process.env.EXPO_PUBLIC_TESTING_MODE === 'true';
      const testPhone = process.env.EXPO_PUBLIC_TEST_PHONE;
      
      if (testingMode && testPhone && fullPhoneNumber === testPhone) {
        // Testing mode: skip OTP and auto-login with test user
        console.log('Testing mode: Auto-login for test phone');
        
        // Create or sign in with test user
        const testEmail = `test_${Date.now()}@example.com`;
        const testPassword = 'testpassword123';
        
        // First try to sign in with test credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        
        if (signInError) {
          // If sign in fails, create a new test user
          console.log('Creating new test user');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            phone: fullPhoneNumber,
          });
          
          if (signUpError) throw signUpError;
          
          // Sign in with the newly created user
          const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });
          
          if (newSignInError) throw newSignInError;
          
          // Get the user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Failed to get test user');
          
          // Create complete test user profile in Supabase
          await createTestUserProfile(user);
          
          // Store user data
          await AsyncStorage.setItem('userToken', newSignInData.session.access_token);
          await AsyncStorage.setItem('userData', JSON.stringify(user));
          
          Alert.alert('Test Login Successful', 'Logged in with test account');
          navigation.replace('Main');
          return;
        }
        
        // If sign in succeeded, get user and ensure profile exists
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await ensureTestUserProfile(user);
          await AsyncStorage.setItem('userToken', signInData.session.access_token);
          await AsyncStorage.setItem('userData', JSON.stringify(user));
          
          Alert.alert('Test Login Successful', 'Logged in with existing test account');
          navigation.replace('Main');
          return;
        }
      }
      
      // Normal OTP flow for non-test numbers
      const { data, error: signInError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (signInError) throw signInError;

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
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      
      // Check for testing mode bypass OTP
      const testingMode = process.env.EXPO_PUBLIC_TESTING_MODE === 'true';
      const testPhone = process.env.EXPO_PUBLIC_TEST_PHONE;
      const testOtp = process.env.EXPO_PUBLIC_TEST_OTP;
      
      if (testingMode && testPhone && fullPhoneNumber === testPhone && testOtp && otpString === testOtp) {
        // Use test OTP to verify
        console.log('Testing mode: Using test OTP');
      }
      
      const { data: { session, user }, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: otpString,
        type: 'sms'
      });

      if (verifyError) throw verifyError;

      if (session) {
        await AsyncStorage.setItem('userToken', session.access_token);
        await AsyncStorage.setItem('userData', JSON.stringify(user));

        console.log('Login successful, navigating to main app');
        navigation.replace('Main');
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Implement Google Sign-In
      console.log('Google login pressed');
      Alert.alert('Coming Soon', 'Google login will be available soon');
    } catch (err) {
      setError('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      const nextInput = `otpInput${index + 1}`;
      // Focus next input logic would go here
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Login to continue your journey</Text>

      {!showOtp ? (
        <>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneContainer}>
            <TextInput
              style={styles.countryCode}
              value={countryCode}
              onChangeText={setCountryCode}
              placeholder="+1"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, styles.phoneInput]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send OTP'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textSecondary, marginHorizontal: 16 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={handleGoogleLogin}
          >
            <Text style={[styles.buttonText, styles.buttonOutlineText]}>
              Continue with Google
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.inputLabel}>Enter Verification Code</Text>
          <Text style={[styles.subtitle, { marginBottom: 8 }]}>
            Sent to {countryCode} {phoneNumber}
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowOtp(false)}>
            <Text style={styles.linkText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={[styles.linkText, { textAlign: 'center', marginTop: 24 }]}>
          Don't have an account? Sign up
        </Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};

// Signup Screen
const SignupScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationId, setVerificationId] = useState('');

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signInWithOtp({
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
        // Proceed to basic info
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join BOND to find meaningful connections</Text>

      {!showOtp ? (
        <>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={styles.phoneContainer}>
            <TextInput
              style={styles.countryCode}
              value={countryCode}
              onChangeText={setCountryCode}
              placeholder="+1"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, styles.phoneInput]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.inputLabel}>Enter Verification Code</Text>
          <Text style={[styles.subtitle, { marginBottom: 8 }]}>
            Sent to {countryCode} {phoneNumber}
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={styles.otpInput}
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

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowOtp(false)}>
            <Text style={styles.linkText}>Change phone number</Text>
          </TouchableOpacity>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={[styles.linkText, { textAlign: 'center', marginTop: 24 }]}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};

// Basic Info Screen
const BasicInfoScreen = ({ navigation, route }) => {
  const { phone } = route.params || {};
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSubmit = async () => {
    if (!fullName || !dob || !gender || !city || !photo) {
      setError('Please fill in all fields and upload a photo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      let photoUrl = null;

      // Upload photo if selected
      if (photo) {
        const ext = photo.uri.substring(photo.uri.lastIndexOf('.') + 1);
        const fileName = `${user.id}-${Date.now()}.${ext}`;

        const photoResp = await fetch(photo.uri);
        const photoBlob = await photoResp.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoBlob, {
            contentType: `image/${ext}`
          });

        if (uploadError) {
          console.warn('Photo upload failed, continuing without photo:', uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        }
      }

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          date_of_birth: dob,
          gender: gender,
          city: city,
          profile_complete: true
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Insert into user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          primary_photo_url: photoUrl
        });

      if (profileError) throw profileError;

      await AsyncStorage.setItem('onboarding_complete', 'true');
      console.log('Profile completed, navigating to main app');
      navigation.replace('Main');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      'Upload Photo',
      'Choose a photo for your profile',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Tell us a bit about yourself to get started
      </Text>

      <View style={styles.photoContainer}>
        <TouchableOpacity onPress={handlePhotoUpload} style={styles.photoPreview}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoImage} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={{ fontSize: 32, color: colors.textSecondary }}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={handlePhotoUpload}>
          <Text style={styles.uploadButtonText}>Upload Profile Photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter your full name"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.inputLabel}>Date of Birth</Text>
      <TextInput
        style={styles.input}
        value={dob}
        onChangeText={setDob}
        placeholder="DD/MM/YYYY"
        placeholderTextColor={colors.textSecondary}
      />

      <Text style={styles.inputLabel}>Gender</Text>
      <View style={styles.row}>
        {['Male', 'Female', 'Other'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderButton,
              gender === g && styles.genderButtonSelected,
            ]}
            onPress={() => setGender(g)}
          >
            <Text
              style={[
                styles.genderText,
                gender === g && styles.genderTextSelected,
              ]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>City</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Enter your city"
        placeholderTextColor={colors.textSecondary}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, { marginTop: 32 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Complete Registration'}
        </Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};

// Auth Stack Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="BasicInfo"
        component={BasicInfoScreen}
        options={{ title: 'Profile Info' }}
      />
    </Stack.Navigator>
  );
};

module.exports = AuthStack;
