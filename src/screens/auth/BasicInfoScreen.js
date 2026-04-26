// src/screens/auth/BasicInfoScreen.js
const React = require('react');
const {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} = require('react-native');
const { useState } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');
const { pickMedia, compressImage, uploadMedia } = require('../../utils/mediaUtils');
const LocationPicker = require('../../components/shared/LocationPicker');
let DateTimePicker;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  DateTimePicker = null;
}

const formatDobDisplay = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
};

const toIsoDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${year}-${month}-${day}`;
};

const normalizeDateOfBirth = (value) => {
  const raw = (value || '').trim();
  if (!raw) return null;

  // Accept common separators users type on mobile keyboards.
  const normalizedInput = raw.replace(/[.\-]/g, '/');

  // Already ISO-like: YYYY-MM-DD
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = normalizedInput.match(isoPattern);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const parsed = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return `${y}-${m}-${d}`;
    return null;
  }

  // UI format: DD/MM/YYYY
  const dmyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dmyMatch = normalizedInput.match(dmyPattern);
  if (!dmyMatch) return null;

  const [, dd, mm, yyyy] = dmyMatch;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;

  if (!valid) return null;

  const normalizedMonth = String(month).padStart(2, '0');
  const normalizedDay = String(day).padStart(2, '0');
  return `${year}-${normalizedMonth}-${normalizedDay}`;
};

const BasicInfoScreen = ({ navigation, route }) => {
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [photo, setPhoto] = useState(null);
  const [dobDate, setDobDate] = useState(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const handleDobChange = (_event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowDobPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    setDobDate(selectedDate);
    setDob(formatDobDisplay(selectedDate));
    setError('');
  };

  const handlePhotoAction = async (source) => {
    const result = await pickMedia(source);
    if (result) {
      setLoading(true);
      const compressedUri = await compressImage(result.uri);
      setPhoto({ ...result, uri: compressedUri });
      setLoading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Profile Photo',
      'Select a photo for your profile',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => handlePhotoAction('camera') },
        { text: 'Choose from Gallery', onPress: () => handlePhotoAction('library') },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!fullName || !dob || !gender || !city || !photo) {
      setError('Please fill in all fields and upload a photo');
      return;
    }

    const normalizedDob = dobDate ? toIsoDate(dobDate) : normalizeDateOfBirth(dob);
    if (!normalizedDob) {
      setError('Please select a valid date of birth');
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload compressed photo
      const fileName = `profile_${user.id}_${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      let photoUrl = null;
      try {
        photoUrl = await uploadMedia(photo.uri, 'avatars', filePath);
      } catch (uploadError) {
        console.error('Photo upload failed, continuing onboarding without remote avatar:', uploadError);
        setWarning('Photo upload failed due to network/storage permissions. Profile was saved; you can re-upload photo from Profile later.');
      }

      // Update basic user info
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName.trim(),
          date_of_birth: normalizedDob,
          gender: gender.toLowerCase(),
          city: city.trim(),
          profile_complete: false,
          onboarding_step: 'VideoVerification',
        }, {
          onConflict: 'id'
        });

      if (userError) throw userError;

      // Verify user row exists before creating profile
      const { data: verifyUser, error: verifyError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (verifyError || !verifyUser) {
        throw new Error('User record not found after upsert — cannot create profile');
      }

      // Update profile with photo
      if (photoUrl) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            primary_photo_url: photoUrl
          }, {
            onConflict: 'user_id'
          });

        if (profileError) throw profileError;
      }

      await AsyncStorage.setItem('onboarding_complete', 'false'); // Still need verification
      navigation.replace('VideoVerification');
    } catch (err) {
      console.error('Save Profile Error:', err);
      const { supabaseConfig } = require('../../../supabase');
      let errorMessage = err.message || 'Failed to save profile';
      
      if (errorMessage.includes('Network request failed')) {
        errorMessage = `Network Error: Cannot reach ${supabaseConfig.projectHost}. Please check your internet.`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={AuthStyles.scrollContainer}>
      <Text style={AuthStyles.title}>Complete Your Profile</Text>
      <Text style={AuthStyles.subtitle}>Tell us a bit about yourself to get started</Text>

      <View style={AuthStyles.photoContainer}>
        <TouchableOpacity onPress={showPhotoOptions} style={AuthStyles.photoPreview}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={AuthStyles.photoImage} />
          ) : (
            <View style={AuthStyles.photoPlaceholder}>
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={AuthStyles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity testID="profile-photo-upload" style={AuthStyles.uploadButton} onPress={showPhotoOptions}>
          <Text style={AuthStyles.uploadButtonText}>
            {photo ? 'Change Photo' : 'Upload Profile Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={AuthStyles.inputLabel}>Full Name</Text>
      <TextInput style={AuthStyles.input} value={fullName} onChangeText={setFullName} placeholder="Enter your full name" placeholderTextColor={Colors.textSecondary} />

      <Text style={AuthStyles.inputLabel}>Date of Birth</Text>
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          value: dobDate ? toIsoDate(dobDate) : '',
          onChange: (e) => {
            const val = e.target.value;
            if (!val) return;
            const [y, m, d] = val.split('-');
            const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
            setDobDate(dateObj);
            setDob(formatDobDisplay(dateObj));
            setError('');
          },
          max: toIsoDate(new Date()),
          style: {
            height: '50px',
            backgroundColor: Colors.surface,
            borderRadius: '12px',
            padding: '0 16px',
            fontSize: '16px',
            color: Colors.text,
            border: `1px solid ${Colors.border}`,
            outline: 'none',
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box'
          }
        })
      ) : DateTimePicker ? (
        <>
          <TouchableOpacity
            style={[AuthStyles.input, { justifyContent: 'center' }]}
            onPress={() => setShowDobPicker(true)}
          >
            <Text style={{ color: dob ? Colors.text : Colors.textSecondary, fontSize: 16 }}>
              {dob || 'Select date of birth'}
            </Text>
          </TouchableOpacity>

          {showDobPicker ? (
            <DateTimePicker
              value={dobDate || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDobChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          ) : null}
        </>
      ) : (
        <TextInput
          style={AuthStyles.input}
          value={dob}
          onChangeText={setDob}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="number-pad"
        />
      )}

      <Text style={AuthStyles.inputLabel}>Gender</Text>
      <View style={AuthStyles.row}>
        {['Male', 'Female', 'Other'].map((g) => (
          <TouchableOpacity key={g} style={[AuthStyles.genderButton, gender === g && AuthStyles.genderButtonSelected]} onPress={() => setGender(g)}>
            <Text style={[AuthStyles.genderText, gender === g && AuthStyles.genderTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={AuthStyles.inputLabel}>Location (City, State, Country)</Text>
      <LocationPicker 
        initialCity={city} 
        onLocationSelect={(locationString) => setCity(locationString)} 
      />

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}
      {warning ? <Text style={[AuthStyles.errorText, { color: '#F59E0B' }]}>{warning}</Text> : null}
      
      <TouchableOpacity testID="complete-registration-button" style={[AuthStyles.button, { marginTop: 32 }]} onPress={handleSubmit} disabled={loading}>
        <Text style={AuthStyles.buttonText}>{loading ? 'Saving...' : 'Complete Registration'}</Text>
      </TouchableOpacity>

      {loading && (
        <View style={AuthStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: '#fff', marginTop: 10 }}>Optimizing & Uploading...</Text>
        </View>
      )}
    </ScrollView>
  );
};

module.exports = BasicInfoScreen;
