// src/screens/auth/VideoVerificationScreen.js
const React = require('react');
const {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar
} = require('react-native');
const { useState } = React;
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');
const CameraCapture = require('../../components/video/CameraCapture');
const { pickMedia } = require('../../utils/mediaUtils');
const verificationService = require('../../services/verificationService');

const VideoVerificationScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Instructions, 2: Capture, 3: Review
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [idCardMedia, setIdCardMedia] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCapture = (media) => {
    setCapturedMedia(media);
    setStep(3); // Go to review
  };

  const uploadVerification = async () => {
    if (!capturedMedia) return;
    setLoading(true);

    try {
      await verificationService.submitVerificationRequest({
        capturedMedia,
        idCardMedia,
      });
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

  const pickIdCard = async () => {
    const result = await pickMedia('library', true, 'image');
    if (result) {
      setIdCardMedia(result);
    }
  };

  const Instructions = () => (
    <View style={styles.content}>
      <View style={styles.iconCircle}>
        <Ionicons name="shield-checkmark" size={60} color={Colors.primary} />
      </View>
      <Text style={styles.title}>Selfie Verification</Text>
      <Text style={styles.desc}>
        To ensure a safe community, we require a quick selfie or short video verification.
        You can also add an optional ID card upload for faster admin review.
      </Text>
      <View style={styles.bulletList}>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} style={{ marginRight: 16 }} />
          <Text style={styles.bulletText}>Align your face in the oval</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} style={{ marginRight: 16 }} />
          <Text style={styles.bulletText}>Turn your head slowly left and right</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle" size={24} color={Colors.success} style={{ marginRight: 16 }} />
          <Text style={styles.bulletText}>Tap for selfie or hold for a short video</Text>
        </View>
        <View style={styles.bulletRow}>
          <Ionicons name="card" size={24} color={Colors.success} style={{ marginRight: 16 }} />
          <Text style={styles.bulletText}>Optional: upload your ID card for admin review</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.secondaryCta} onPress={pickIdCard}>
        <Text style={styles.secondaryCtaText}>
          {idCardMedia ? 'Replace Optional ID Card' : 'Upload Optional ID Card'}
        </Text>
      </TouchableOpacity>
      {idCardMedia ? (
        <Text style={styles.metaText}>ID file attached: {idCardMedia.name || 'selected document'}</Text>
      ) : null}
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
        Is your face clearly visible? If yes, submit this for admin review.
      </Text>
      {idCardMedia ? (
        <Text style={styles.metaText}>Optional ID card is attached and will be reviewed by the admin team.</Text>
      ) : (
        <TouchableOpacity style={styles.secondaryCta} onPress={pickIdCard}>
          <Text style={styles.secondaryCtaText}>Attach Optional ID Card</Text>
        </TouchableOpacity>
      )}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          testID="retake-video-button"
          style={[styles.secondaryBtn, { marginRight: 16 }]} 
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
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 40 }]}>
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
    </View>
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
  bulletList: { alignSelf: 'stretch', marginBottom: 40 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
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
  buttonRow: { flexDirection: 'row', width: '100%' },
  secondaryBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  secondaryBtnText: { fontSize: 18, color: Colors.textSecondary },
  secondaryCta: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, marginBottom: 16 },
  secondaryCtaText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  reviewPlaceholder: { width: '100%', height: 300, backgroundColor: Colors.surface, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  reviewSub: { marginTop: 16, fontSize: 14, color: Colors.textSecondary },
  metaText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
});

module.exports = VideoVerificationScreen;
