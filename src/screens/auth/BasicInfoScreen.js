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

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload compressed photo
      const fileName = `profile_${user.id}_${Date.now()}.jpg`;
      const photoUrl = await uploadMedia(photo.uri, 'avatars', fileName);

      if (!photoUrl) throw new Error('Failed to upload photo');

      // Update basic user info
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          date_of_birth: dob,
          gender: gender.toLowerCase(),
          city: city,
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
        });

      if (profileError) throw profileError;

      await AsyncStorage.setItem('onboarding_complete', 'true');
      navigation.replace('Main');
    } catch (err) {
      setError(err.message || 'Failed to complete profile');
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
        <TouchableOpacity style={AuthStyles.uploadButton} onPress={showPhotoOptions}>
          <Text style={AuthStyles.uploadButtonText}>
            {photo ? 'Change Photo' : 'Upload Profile Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={AuthStyles.inputLabel}>Full Name</Text>
      <TextInput style={AuthStyles.input} value={fullName} onChangeText={setFullName} placeholder="Enter your full name" placeholderTextColor={Colors.textSecondary} />

      <Text style={AuthStyles.inputLabel}>Date of Birth</Text>
      <TextInput style={AuthStyles.input} value={dob} onChangeText={setDob} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.textSecondary} />

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
      
      <TouchableOpacity style={[AuthStyles.button, { marginTop: 32 }]} onPress={handleSubmit} disabled={loading}>
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
