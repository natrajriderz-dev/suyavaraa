// screens/onboarding/OnboardingStack.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Image,
  Platform
} = require('react-native');
const { createStackNavigator } = require('@react-navigation/stack');
const ExpoCamera = require('expo-camera');
const ExpoAV = require('expo-av');
const { useState, useEffect, useRef } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const axios = require('axios');
const { pickMedia, compressImage, uploadMedia } = require('../../src/utils/mediaUtils');
const { supabase } = require('../../supabase');
const { isOwnerUser } = require('../../src/config/privilegedAccess');

const Camera = ExpoCamera.Camera || ExpoCamera;
const CameraView = ExpoCamera.CameraView || ExpoCamera.default || null;
const Video = ExpoAV.Video || ExpoAV.default?.Video || ExpoAV.default || null;

const Stack = createStackNavigator();

const navigateToRootMain = (navigation) => {
  const parentNavigation = navigation.getParent?.();
  if (parentNavigation?.replace) {
    parentNavigation.replace('Main');
    return;
  }

  if (parentNavigation?.navigate) {
    parentNavigation.navigate('Main');
    return;
  }

  navigation.navigate('Main');
};

const markProfileComplete = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { error } = await supabase
    .from('users')
    .update({
      profile_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw error;

  await AsyncStorage.setItem('onboarding_complete', 'true');
  return user;
};

// Colors
const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2D2D2D',
  primary: '#D97706',
  primaryLight: '#F59E0B',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  border: '#2D2D2D',
  gold: '#D97706',
  goldLight: '#FBBF24',
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  // Mode Selection Styles
  modeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconText: {
    fontSize: 30,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Input Styles
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Button Styles
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
  buttonDisabled: {
    opacity: 0.5,
  },
  // Photo Grid Styles
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 12,
  },
  // Timeline Styles
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timelineButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  timelineText: {
    color: colors.text,
  },
  timelineTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Tribe Grid Styles
  tribeGrid: {
    marginTop: 16,
  },
  tribeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
    minWidth: '45%',
    maxWidth: '45%',
  },
  tribeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  tribeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  tribeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  tribeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Camera Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 24,
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonRecording: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  previewVideo: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  // Premium Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: colors.surfaceLight,
    marginTop: 8,
  },
  // Loading Overlay
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
  // Progress Indicator
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
});

// Mock Data
const datingTribes = [
  { id: '1', name: 'Adventure Seekers', icon: '🏔️', description: 'Love hiking, travel, and outdoor activities' },
  { id: '2', name: 'Foodies', icon: '🍜', description: 'Passionate about cooking, dining, and cuisine' },
  { id: '3', name: 'Fitness Freaks', icon: '💪', description: 'Gym, yoga, sports, and healthy living' },
  { id: '4', name: 'Book Worms', icon: '📚', description: 'Avid readers and literature enthusiasts' },
  { id: '5', name: 'Art & Culture', icon: '🎨', description: 'Museums, galleries, and creative expression' },
  { id: '6', name: 'Tech Geeks', icon: '💻', description: 'Coding, gadgets, and digital innovation' },
  { id: '7', name: 'Music Lovers', icon: '🎵', description: 'Concerts, festivals, and all genres' },
  { id: '8', name: 'Spiritual', icon: '🧘', description: 'Meditation, mindfulness, and inner peace' },
];

const matrimonyZones = [
  { id: '1', name: 'Traditional', icon: '🏛️', description: 'Value customs, family traditions, and cultural practices' },
  { id: '2', name: 'Modern', icon: '🌟', description: 'Progressive outlook, career-focused, urban lifestyle' },
  { id: '3', name: 'Spiritual', icon: '🕉️', description: 'Religious, meditative, and community-oriented' },
  { id: '4', name: 'Academic', icon: '🎓', description: 'Education-focused, intellectual, research-minded' },
  { id: '5', name: 'Creative', icon: '🎭', description: 'Artistic, innovative, and expressive' },
  { id: '6', name: 'Adventurous', icon: '🧗', description: 'Risk-takers, explorers, and thrill-seekers' },
  { id: '7', name: 'Homely', icon: '🏠', description: 'Family-oriented, nurturing, and domestic' },
  { id: '8', name: 'Cosmopolitan', icon: '🌆', description: 'Global citizens, multilingual, well-traveled' },
];

// Mode Select Screen
const ModeSelectScreen = ({ navigation }) => {
  const [selectedMode, setSelectedMode] = useState(null);
  const [loading, setLoading] = useState(false);

  const modes = [
    {
      id: 'dating',
      title: 'Dating',
      icon: '💘',
      description: 'Find meaningful connections and romantic relationships in your area',
    },
    {
      id: 'matrimony',
      title: 'Matrimony',
      icon: '💍',
      description: 'Search for your life partner with serious intentions and family values',
    },
    {
      id: 'hybrid',
      title: 'Hybrid',
      icon: '🤝',
      description: 'Open to both dating and matrimony, let destiny decide the path',
    },
  ];

  const handleContinue = async () => {
    if (!selectedMode) {
      Alert.alert('Select Mode', 'Please select a mode to continue');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('userMode', selectedMode);
      
      if (selectedMode === 'dating') {
        navigation.navigate('DatingProfile');
      } else if (selectedMode === 'matrimony') {
        navigation.navigate('MatrimonyProfile');
      } else {
        // Hybrid: Ask user to choose primary focus
        Alert.alert(
          'Choose Primary Focus',
          'Would you like to focus more on dating or matrimony?',
          [
            { text: 'Dating', onPress: () => navigation.navigate('DatingProfile') },
            { text: 'Matrimony', onPress: () => navigation.navigate('MatrimonyProfile') },
          ]
        );
      }
    } catch (error) {
      console.error('Mode selection error:', error);
      Alert.alert('Error', 'Failed to save selection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.title}>Choose Your Path</Text>
        <Text style={styles.subtitle}>
          Select how you'd like to use Suyavaraa to find meaningful connections
        </Text>

        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            testID={`mode-select-${mode.id}`}
            style={[
              styles.modeCard,
              selectedMode === mode.id && styles.modeCardSelected,
            ]}
            onPress={() => setSelectedMode(mode.id)}
          >
            <View style={styles.modeIcon}>
              <Text style={styles.modeIconText}>{mode.icon}</Text>
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>{mode.title}</Text>
              <Text style={styles.modeDescription}>{mode.description}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          testID="mode-continue-button"
          style={[styles.button, !selectedMode && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selectedMode || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

// Dating Profile Screen
const DatingProfileScreen = ({ navigation }) => {
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [photos, setPhotos] = useState(Array(6).fill(null));
  const [loading, setLoading] = useState(false);

  const lookingForOptions = [
    'Casual Dating',
    'Serious Relationship',
    'Friendship First',
    'Long-term Partner',
    'Marriage-minded',
    'Not Sure Yet',
  ];

  const handlePhotoUpload = async (index) => {
    const media = await pickMedia('library');
    if (media) {
      const compressed = await compressImage(media.uri);
      const newPhotos = [...photos];
      newPhotos[index] = compressed;
      setPhotos(newPhotos);
    }
  };

  const handleContinue = async () => {
    if (!bio || !occupation || !lookingFor || photos.filter(p => p).length < 3) {
      Alert.alert('Incomplete', 'Please fill all fields and upload at least 3 photos');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        bio,
        occupation,
        lookingFor,
        photos: photos.filter(p => p),
      };
      
      await AsyncStorage.setItem('datingProfile', JSON.stringify(profileData));
      navigation.navigate('Verification');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        nestedScrollViewEnabled={true}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.title}>Your Dating Profile</Text>
        <Text style={styles.subtitle}>
          Help others get to know the real you
        </Text>

        <Text style={styles.inputLabel}>About Me</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Write a short bio about yourself..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.inputLabel}>Occupation</Text>
        <TextInput
          style={styles.input}
          value={occupation}
          onChangeText={setOccupation}
          placeholder="What do you do?"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.inputLabel}>Looking For</Text>
        <View style={styles.timelineContainer}>
          {lookingForOptions.slice(0, 3).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.timelineButton,
                lookingFor === option && styles.timelineButtonSelected,
              ]}
              onPress={() => setLookingFor(option)}
            >
              <Text
                style={[
                  styles.timelineText,
                  lookingFor === option && styles.timelineTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.timelineContainer, { marginTop: 0 }]}>
          {lookingForOptions.slice(3).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.timelineButton,
                lookingFor === option && styles.timelineButtonSelected,
              ]}
              onPress={() => setLookingFor(option)}
            >
              <Text
                style={[
                  styles.timelineText,
                  lookingFor === option && styles.timelineTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Profile Photos (Minimum 3)</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              testID={`dating-photo-${index}`}
              style={[
                styles.photoItem,
                photo && styles.photoItemSelected,
              ]}
              onPress={() => handlePhotoUpload(index)}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={{ fontSize: 24, color: colors.textSecondary }}>+</Text>
                  <Text style={styles.photoPlaceholderText}>
                    {index === 0 ? 'Main Photo' : `Photo ${index + 1}`}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          testID="dating-profile-continue-button"
          style={styles.button}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

// Matrimony Profile Screen
const MatrimonyProfileScreen = ({ navigation }) => {
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [income, setIncome] = useState('');
  const [timeline, setTimeline] = useState('');

  const timelineOptions = [
    'Within 6 months',
    'Within 1 year',
    'Within 2 years',
    'Not decided yet',
  ];

  const handleContinue = async () => {
    if (!bio || !education || !occupation || !income || !timeline) {
      Alert.alert('Incomplete', 'Please fill all fields');
      return;
    }

    try {
      const profileData = {
        bio,
        education,
        occupation,
        income,
        timeline,
      };
      
      await AsyncStorage.setItem('matrimonyProfile', JSON.stringify(profileData));
      navigation.navigate('Verification');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        nestedScrollViewEnabled={true}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.title}>Your Matrimony Profile</Text>
        <Text style={styles.subtitle}>
          Help us find your perfect life partner
        </Text>

        <Text style={styles.inputLabel}>About Me</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Write about yourself, your values, and what matters to you..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.inputLabel}>Highest Education</Text>
        <TextInput
          style={styles.input}
          value={education}
          onChangeText={setEducation}
          placeholder="e.g., Bachelor's in Engineering"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.inputLabel}>Occupation</Text>
        <TextInput
          style={styles.input}
          value={occupation}
          onChangeText={setOccupation}
          placeholder="What do you do?"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.inputLabel}>Annual Income</Text>
        <TextInput
          style={styles.input}
          value={income}
          onChangeText={setIncome}
          placeholder="e.g., $50,000 - $100,000"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.inputLabel}>Marriage Timeline</Text>
        <View style={styles.timelineContainer}>
          {timelineOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.timelineButton,
                timeline === option && styles.timelineButtonSelected,
              ]}
              onPress={() => setTimeline(option)}
            >
              <Text
                style={[
                  styles.timelineText,
                  timeline === option && styles.timelineTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Verification Screen
const VerificationScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState('front');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  const requestCameraPermission = async () => {
    const requestFn =
      ExpoCamera.requestCameraPermissionsAsync ||
      Camera.requestCameraPermissionsAsync;

    if (!requestFn) {
      setHasPermission(false);
      return;
    }

    const { status } = await requestFn();
    setHasPermission(status === 'granted');
  };

  useEffect(() => {
    (async () => {
      await requestCameraPermission();
    })();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (!cameraRef.current) return;

    if (!cameraRef.current.recordAsync) {
      Alert.alert(
        'Recording Unavailable',
        'Live recording is unavailable on this device/build. Please upload a verification video from your gallery.'
      );
      return;
    }

    setIsRecording(true);
    setRecordingTime(0);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: '720p',
      });
      setRecordedVideo(video);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', error.message || 'Failed to record video');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current || !cameraRef.current.stopRecording) return;
    
    cameraRef.current.stopRecording();
    setIsRecording(false);
  };

  const pickVerificationVideo = async () => {
    try {
      const picked = await pickMedia('library', false, 'video');
      if (!picked?.uri) return;
      setRecordedVideo({ uri: picked.uri });
      setRecordingTime(0);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to pick verification video');
    }
  };

  const retakeVideo = () => {
    setRecordedVideo(null);
    setRecordingTime(0);
  };

  const submitVerification = async () => {
    if (!recordedVideo) {
      Alert.alert('Error', 'Please record a verification video first');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = recordedVideo.uri.split('.').pop() || 'mp4';
      const filePath = `verifications/${user.id}_${Date.now()}.${ext}`;
      const mediaUrl = await uploadMedia(recordedVideo.uri, 'verification_media', filePath);

      const { error: requestError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

      if (requestError) throw requestError;

      const premiumFlag = await AsyncStorage.getItem('isPremium') === 'true';
      const isPremium = premiumFlag || isOwnerUser(user.id);
      if (isOwnerUser(user.id)) {
        await AsyncStorage.setItem('isPremium', 'true');
      }
      
      if (isPremium) {
        navigation.navigate('TribeZoneSelect');
      } else {
        // Check if user has premium access
        Alert.alert(
          'Premium Feature',
          'Tribe/Zone selection is a premium feature. Would you like to upgrade?',
          [
            {
              text: 'Not Now',
              onPress: async () => {
                try {
                  await markProfileComplete();
                  navigateToRootMain(navigation);
                } catch (error) {
                  Alert.alert('Error', error.message || 'Failed to complete onboarding');
                }
              }
            },
            { text: 'View Plans', onPress: () => console.log('Show premium plans') },
          ]
        );
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.message || 'Failed to submit verification');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.subtitle}>
          We need camera access to verify your identity
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline, { marginTop: 12 }]}
          onPress={pickVerificationVideo}
        >
          <Text style={styles.buttonOutlineText}>Upload Video Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!recordedVideo && !CameraView) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Camera Unavailable</Text>
        <Text style={styles.subtitle}>
          This build cannot render the camera view right now. Please update the app build or use file upload instead.
        </Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 12 }]}
          onPress={pickVerificationVideo}
        >
          <Text style={styles.buttonText}>Upload Verification Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.title}>Identity Verification</Text>
        <Text style={styles.subtitle}>
          Record a short video saying "I want to find meaningful connections on Suyavaraa"
        </Text>

        {!recordedVideo ? (
          <>
            <View style={styles.camera}>
              <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing={cameraType}
              />
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setCameraType(
                  cameraType === 'front' ? 'back' : 'front'
                )}
              >
                <Text style={{ fontSize: 24 }}>🔄</Text>
              </TouchableOpacity>

              {!isRecording ? (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <View style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.error,
                  }} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    backgroundColor: colors.text,
                  }} />
                </TouchableOpacity>
              )}
            </View>

            {isRecording && (
              <Text style={[styles.timer, { textAlign: 'center' }]}>
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')} / 0:30
              </Text>
            )}
          </>
        ) : (
          <>
            {Video ? (
              <Video
                source={{ uri: recordedVideo.uri }}
                style={styles.previewVideo}
                useNativeControls
                resizeMode="cover"
                isLooping
              />
            ) : (
              <View style={[styles.previewVideo, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.subtitle}>Video preview is unavailable in this build.</Text>
              </View>
            )}

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline, { flex: 1, marginRight: 8 }]}
                onPress={retakeVideo}
              >
                <Text style={styles.buttonOutlineText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { flex: 1, marginLeft: 8 }]}
                onPress={submitVerification}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

// Tribe Zone Select Screen
const TribeZoneSelectScreen = ({ navigation }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [userMode, setUserMode] = useState('dating');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const mode = await AsyncStorage.getItem('userMode');
      const { data: { user } } = await supabase.auth.getUser();
      const premiumFlag = await AsyncStorage.getItem('isPremium') === 'true';
      const premium = premiumFlag || isOwnerUser(user?.id);
      if (isOwnerUser(user?.id)) {
        await AsyncStorage.setItem('isPremium', 'true');
      }
      setUserMode(mode || 'dating');
      setIsPremium(premium);
    };
    loadUserData();
  }, []);

  const maxSelections = isPremium ? 3 : 1;
  const items = userMode === 'dating' ? datingTribes : matrimonyZones;
  const itemType = userMode === 'dating' ? 'Tribe' : 'Zone';

  const toggleItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      if (selectedItems.length >= maxSelections) {
        if (!isPremium) {
          setShowPremiumModal(true);
        } else {
          Alert.alert(`Maximum ${maxSelections} ${itemType}s`, 
            `You can only select up to ${maxSelections} ${itemType}s`);
        }
        return;
      }
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  const handleContinue = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Selection Required', `Please select at least one ${itemType.toLowerCase()}`);
      return;
    }

    try {
      await AsyncStorage.setItem('userTribes', JSON.stringify(selectedItems));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const selectedNames = items
          .filter((item) => selectedItems.includes(item.id))
          .map((item) => item.name);

        if (selectedNames.length > 0) {
          const { data: tribeRows, error: tribeLookupError } = await supabase
            .from('tribes')
            .select('id, name')
            .in('name', selectedNames);

          if (tribeLookupError) throw tribeLookupError;

          if (tribeRows?.length) {
            await supabase.from('user_tribes').delete().eq('user_id', user.id);

            const inserts = tribeRows.map((tribe, index) => ({
              user_id: user.id,
              tribe_id: tribe.id,
              is_primary: index === 0,
            }));

            const { error: insertError } = await supabase.from('user_tribes').insert(inserts);
            if (insertError) throw insertError;
          }
        }
      }

      await markProfileComplete();
      navigateToRootMain(navigation);
    } catch (error) {
      console.error('Save tribes error:', error);
      Alert.alert('Error', 'Failed to save selections');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.tribeCard,
        selectedItems.includes(item.id) && styles.tribeCardSelected,
      ]}
      onPress={() => toggleItem(item.id)}
    >
      <View style={styles.tribeIcon}>
        <Text style={{ fontSize: 24 }}>{item.icon}</Text>
      </View>
      <Text style={styles.tribeName}>{item.name}</Text>
      <Text style={styles.tribeDescription} numberOfLines={2}>
        {item.description}
      </Text>
      {selectedItems.includes(item.id) && (
        <View style={styles.selectionBadge}>
          <Text style={styles.selectionBadgeText}>
            {selectedItems.indexOf(item.id) + 1}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
        </View>

        <Text style={styles.title}>
          Choose Your {itemType}s
        </Text>
        <Text style={styles.subtitle}>
          {isPremium 
            ? `Select up to 3 ${itemType}s that resonate with you`
            : `Free users can select 1 ${itemType}. Upgrade to Premium for up to 3 selections.`
          }
        </Text>

        <Text style={[styles.subtitle, { color: colors.primary, marginBottom: 8 }]}>
          Selected: {selectedItems.length}/{maxSelections}
        </Text>

        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.tribeGrid}
          scrollEnabled={false}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Complete Setup</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showPremiumModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✨ Upgrade to Premium</Text>
            <Text style={styles.modalText}>
              Free users can select only 1 {itemType.toLowerCase()}. 
              Upgrade to Premium to select up to 3 {itemType.toLowerCase()}s 
              and unlock more meaningful matches!
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPremiumModal(false);
                console.log('Show premium plans');
              }}
            >
              <Text style={styles.modalButtonText}>View Premium Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalCloseButton]}
              onPress={() => setShowPremiumModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Onboarding Stack Navigator
const OnboardingStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="ModeSelect"
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
        name="ModeSelect" 
        component={ModeSelectScreen} 
        options={{ title: 'Choose Mode' }}
      />
      <Stack.Screen 
        name="DatingProfile" 
        component={DatingProfileScreen} 
        options={{ title: 'Dating Profile' }}
      />
      <Stack.Screen 
        name="MatrimonyProfile" 
        component={MatrimonyProfileScreen} 
        options={{ title: 'Matrimony Profile' }}
      />
      <Stack.Screen 
        name="Verification" 
        component={VerificationScreen} 
        options={{ title: 'Verification' }}
      />
      <Stack.Screen 
        name="TribeZoneSelect" 
        component={TribeZoneSelectScreen} 
        options={{ title: 'Your Tribes' }}
      />
    </Stack.Navigator>
  );
};

module.exports = OnboardingStack;
