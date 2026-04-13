// src/screens/auth/VideoVerificationScreen.js
const React = require('react');
const {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} = require('react-native');
const { useState } = React;
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const Colors = require('../../theme/Colors');
const CameraCapture = require('../../components/video/CameraCapture').default;
const { supabase } = require('../../../supabase');

const VideoVerificationScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Instructions, 2: Capture, 3: Review
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCapture = (media) => {
    setCapturedMedia(media);
    setStep(3); // Go to review
  };

  const uploadVerification = async () => {
    if (!capturedMedia) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upload media to Supabase storage
      const fileExt = capturedMedia.uri.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `verifications/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: capturedMedia.uri,
        name: fileName,
        type: `video/${fileExt === 'mp4' ? 'mp4' : 'quicktime'}`,
      });

      const { data: upload, error: uploadError } = await supabase.storage
        .from('verification_media')
        .upload(filePath, formData);

      if (uploadError) throw uploadError;

      // 2. Register verification request in DB
      const { error: dbError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          media_url: filePath,
          status: 'pending',
          created_at: new Date()
        });

      if (dbError) throw dbError;

      // 3. Success!
      navigation.navigate('VerificationSuccess');

    } catch (error) {
      console.error('Upload error:', error);
      const message = error.message?.includes('bucket')
        ? error.message
        : 'Failed to submit verification. Please try again.';
      Alert.alert('Upload Error', message);
    } finally {
      setLoading(false);
    }
  };

  const Instructions = () => (
    <View style={styles.content}>
      <View style={styles.iconCircle}>
        <Ionicons name="shield-checkmark" size={60} color={Colors.primary} />
      </View>
      <Text style={styles.title}>Secure Verification</Text>
      <Text style={styles.desc}>
        To ensure a safe community, we require a quick video verification. 
        This prevents fake profiles and protects all users.
      </Text>
      <View style={styles.bulletList}>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.bulletText}>Align your face in the oval</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.bulletText}>Turn your head slowly left and right</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
          <Text style={styles.bulletText}>Speak the numbers on screen (optional)</Text>
        </View>
      </View>
      <TouchableOpacity 
        testID="start-capturing-button"
        style={styles.primaryBtn} 
        onPress={() => setStep(2)}
      >
        <Text style={styles.primaryBtnText}>Start Capturing</Text>
      </TouchableOpacity>
    </View>
  );

  const Review = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Review Your Video</Text>
      <View style={styles.reviewPlaceholder}>
        <Ionicons name="videocam" size={60} color={Colors.textSecondary} />
        <Text style={styles.reviewSub}>Media Captured Successfully</Text>
      </View>
      <Text style={styles.desc}>
        Is your face clearly visible? If yes, click Submit for review.
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          testID="retake-video-button"
          style={styles.secondaryBtn} 
          onPress={() => setStep(2)}
        >
          <Text style={styles.secondaryBtnText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="submit-video-button"
          style={styles.primaryBtnFlat} 
          onPress={uploadVerification}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Submitting...' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 28 }} />
      </View>

      {step === 1 && <Instructions />}
      {step === 2 && <CameraCapture onCapture={handleCapture} instruction="Align your face & hold to record" />}
      {step === 3 && <Review />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: Colors.surface, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  bulletList: { alignSelf: 'stretch', marginBottom: 40, gap: 16 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bulletText: { fontSize: 16, color: Colors.text },
  primaryBtn: { 
    backgroundColor: Colors.primary, 
    width: '100%', 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryBtnFlat: { flex: 2, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 16, width: '100%' },
  secondaryBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  secondaryBtnText: { fontSize: 18, color: Colors.textSecondary },
  reviewPlaceholder: { width: '100%', height: 300, backgroundColor: Colors.surface, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  reviewSub: { marginTop: 16, fontSize: 14, color: Colors.textSecondary },
});

module.exports = VideoVerificationScreen;
