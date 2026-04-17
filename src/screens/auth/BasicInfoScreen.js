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
} = require('react-native');
const { useState } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../../../supabase');
const AuthStyles = require('./AuthStyles');
const Colors = require('../../theme/Colors');
const { pickMedia, compressImage, uploadMedia } = require('../../utils/mediaUtils');

const normalizeDateOfBirth = (value) => {
  const raw = (value || '').trim();
  if (!raw) return null;

  // Already ISO-like: YYYY-MM-DD
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = raw.match(isoPattern);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const parsed = new Date(`${y}-${m}-${d}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return `${y}-${m}-${d}`;
    return null;
  }

  // UI format: DD/MM/YYYY
  const dmyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dmyMatch = raw.match(dmyPattern);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const normalizedDob = normalizeDateOfBirth(dob);
    if (!normalizedDob) {
      setError('Date of birth must be in DD/MM/YYYY format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload compressed photo
      const fileName = `profile_${user.id}_${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      const photoUrl = await uploadMedia(photo.uri, 'avatars', filePath);

      if (!photoUrl) throw new Error('Failed to upload photo');

      // Update basic user info
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          date_of_birth: normalizedDob,
          gender: gender.toLowerCase(),
          city: city.trim(),
          profile_complete: true
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Update profile with photo
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          primary_photo_url: photoUrl
        }, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      await AsyncStorage.setItem('onboarding_complete', 'true');
      const parentNavigation = navigation.getParent?.();
      if (parentNavigation?.replace) {
        parentNavigation.replace('Main');
      } else {
        navigation.replace('Main');
      }
    } catch (err) {
      console.error('BasicInfo submit error:', err);
      setError(err?.message || 'Failed to complete profile');
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
      <TextInput style={AuthStyles.input} value={dob} onChangeText={setDob} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" />

      <Text style={AuthStyles.inputLabel}>Gender</Text>
      <View style={AuthStyles.row}>
        {['Male', 'Female', 'Other'].map((g) => (
          <TouchableOpacity key={g} style={[AuthStyles.genderButton, gender === g && AuthStyles.genderButtonSelected]} onPress={() => setGender(g)}>
            <Text style={[AuthStyles.genderText, gender === g && AuthStyles.genderTextSelected]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={AuthStyles.inputLabel}>City</Text>
      <TextInput style={AuthStyles.input} value={city} onChangeText={setCity} placeholder="Enter your city" placeholderTextColor={Colors.textSecondary} />

      {error ? <Text style={AuthStyles.errorText}>{error}</Text> : null}
      
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
