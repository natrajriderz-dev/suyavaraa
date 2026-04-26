// screens/main/ProfileStack.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} = require('react-native');
const { createStackNavigator } = require('@react-navigation/stack');
const { useState, useEffect, useRef } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const axios = require('axios');
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const { supabase } = require('../../supabase');
const { uploadMedia, pickMedia } = require('../../src/utils/mediaUtils');
const moderationService = require('../../src/services/moderationService');
const deepfakeDetectionService = require('../../src/services/deepfakeDetectionService');

const { width } = Dimensions.get('window');
const { useMode } = require('../../context/ModeContext');
const PremiumScreen = require('../../src/screens/main/PremiumScreen');
const notificationService = require('../../src/services/notificationService');
const LegalDocumentScreen = require('../../src/screens/shared/LegalDocumentScreen');
const SupportCenterScreen = require('../../src/screens/shared/SupportCenterScreen');
const VideoVerificationScreen = require('../../src/screens/auth/VideoVerificationScreen');
const FamilyAccountScreen = require('../matrimony/FamilyAccountScreen');
const NotificationsScreen = require('../../src/screens/main/NotificationsScreen');
const Stack = createStackNavigator();

// Default colors
const datingColors = {
  background: '#ffffff',
  surface: '#f9f9f9',
  surfaceLight: '#f1f1f1',
  primary: '#E91E63', // Pink
  primaryLight: '#F06292',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E5EA',
  trustHigh: '#10B981',
  trustMedium: '#F59E0B',
  trustLow: '#EF4444',
};

const matrimonyColors = {
  background: '#ffffff',
  surface: '#FFFAF0',
  surfaceLight: '#FFF5E1',
  primary: '#D97706', // Gold
  primaryLight: '#F59E0B',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E5EA',
  trustHigh: '#10B981',
  trustMedium: '#D97706',
  trustLow: '#EF4444',
};

const colors = datingColors;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profilePhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainPhoto: {
    width: '100%',
    height: width,
    borderRadius: 0,
  },
  photoThumbnail: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    margin: 5,
    borderRadius: 8,
  },
  photoItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Premium Redesign Styles
  premiumPhotoSection: {
    width: width,
    height: width * 1.2,
    position: 'relative',
  },
  premiumMainPhoto: {
    width: width,
    height: width * 1.2,
    resizeMode: 'cover',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  photoPaging: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  pagingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  premiumInfoCard: {
    marginTop: -30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 0,
    minHeight: 500,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  completionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  completionPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  completionBarBackground: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 6,
    fontWeight: '500',
  },
  tagsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addPhotoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profile Info
  profileInfo: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileAge: {
    fontSize: 24,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  profileLocation: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Badges
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgePrimary: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  badgeTextPrimary: {
    color: colors.primary,
  },
  premiumBadge: {
    backgroundColor: '#D9770620',
    borderColor: '#D97706',
  },
  premiumText: {
    color: '#D97706',
    fontWeight: 'bold',
  },
  // Premium Banner
  premiumBanner: {
    padding: 2,
    borderRadius: 20,
    marginVertical: 16,
    overflow: 'hidden',
  },
  premiumBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
  },
  premiumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  premiumBannerTextContainer: {
    flex: 1,
  },
  premiumBannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumBannerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  // Trust Score
  trustScoreContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trustScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustScoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  trustScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  trustScoreBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    marginBottom: 8,
  },
  trustScoreFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  trustScoreLevels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trustLevelText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Bio
  bioContainer: {
    marginBottom: 20,
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  actionButtonTextPrimary: {
    fontWeight: '600',
  },
  // Edit Profile Screen
  editContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editForm: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  editPhotoItem: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    margin: 5,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhoto: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  // Settings Screen
  settingsSection: {
    marginBottom: 30,
  },
  settingsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  dangerText: {
    color: '#EF4444',
  },
  // Switch
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  // Fish Trap Profile
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  lockedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  verifyButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Account Switcher Styles
  switchContainer: { padding: 20, width: '100%' },
  switchAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  switchAccountInfo: { flex: 1, marginLeft: 16 },
  switchAccountName: { fontSize: 16, fontWeight: 'bold' },
  switchAccountMode: { fontSize: 12 },
  premiumLock: { 
    position: 'absolute', 
    top: 10, 
    right: 10,
    backgroundColor: '#00000010',
    padding: 4,
    borderRadius: 8
  },
});

const AccountSwitcher = ({ visible, onClose, currentMode, onSwitch, isPremium, canUseAdminMode }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { paddingBottom: 40 }]}>
          <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={styles.modalTitle}>Switch Experience</Text>
          
          <View style={styles.switchContainer}>
            {/* Dating Option */}
            <TouchableOpacity 
              style={[
                styles.switchAccountItem, 
                { 
                  borderColor: currentMode === 'dating' ? datingColors.primary : '#eee',
                  backgroundColor: currentMode === 'dating' ? datingColors.primary + '10' : '#fff'
                }
              ]}
              onPress={() => onSwitch('dating')}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: datingColors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>💕</Text>
              </View>
              <View style={styles.switchAccountInfo}>
                <Text style={[styles.switchAccountName, { color: datingColors.primary }]}>Dating Mode</Text>
                <Text style={styles.switchAccountMode}>Casual, Fun & Social</Text>
              </View>
              {currentMode === 'dating' && <Ionicons name="checkmark-circle" size={24} color={datingColors.primary} />}
            </TouchableOpacity>

            {/* Matrimony Option */}
            <TouchableOpacity 
              style={[
                styles.switchAccountItem, 
                { 
                  borderColor: currentMode === 'matrimony' ? matrimonyColors.primary : '#eee',
                  backgroundColor: currentMode === 'matrimony' ? matrimonyColors.primary + '10' : '#fff',
                  opacity: !isPremium && currentMode === 'dating' ? 0.6 : 1
                }
              ]}
              onPress={() => onSwitch('matrimony')}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: matrimonyColors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>💍</Text>
              </View>
              <View style={styles.switchAccountInfo}>
                <Text style={[styles.switchAccountName, { color: matrimonyColors.primary }]}>Matrimony Mode</Text>
                <Text style={styles.switchAccountMode}>Serious & Tradition-focused</Text>
              </View>
              {currentMode === 'matrimony' && <Ionicons name="checkmark-circle" size={24} color={matrimonyColors.primary} />}
              {!isPremium && currentMode === 'dating' && (
                <View style={styles.premiumLock}>
                  <Ionicons name="lock-closed" size={14} color="#666" />
                </View>
              )}
            </TouchableOpacity>

            {canUseAdminMode ? (
              <TouchableOpacity
                style={[
                  styles.switchAccountItem,
                  {
                    borderColor: currentMode === 'admin' ? '#0f766e' : '#eee',
                    backgroundColor: currentMode === 'admin' ? '#0f766e10' : '#fff',
                  }
                ]}
                onPress={() => onSwitch('admin')}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f766e20', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24 }}>🛡️</Text>
                </View>
                <View style={styles.switchAccountInfo}>
                  <Text style={[styles.switchAccountName, { color: '#0f766e' }]}>Admin Mode</Text>
                  <Text style={styles.switchAccountMode}>Moderation Dashboard & Safety Tools</Text>
                </View>
                {currentMode === 'admin' && <Ionicons name="checkmark-circle" size={24} color="#0f766e" />}
              </TouchableOpacity>
            ) : null}
          </View>

          {!isPremium && !canUseAdminMode && (
            <TouchableOpacity style={{ marginTop: 10, alignSelf: 'center' }} onPress={() => { onClose(); }}>
              <Text style={{ color: matrimonyColors.primary, fontWeight: 'bold' }}>Premium users only can switch modes</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const PremiumBanner = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={['#D97706', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumBannerInner}
      >
        <View style={styles.premiumIconContainer}>
          <Ionicons name="star" size={24} color="#fff" />
        </View>
        <View style={styles.premiumBannerTextContainer}>
          <Text style={styles.premiumBannerTitle}>Premium Preview</Text>
          <Text style={styles.premiumBannerSubtitle}>Billing is paused while release compliance is finalized</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Fish Trap Profile Screen (for unverified users)
const FishTrapProfileScreen = ({ navigation }) => {
  return (
    <View style={styles.lockedContainer}>
      <View style={styles.lockedIcon}>
        <Text style={{ fontSize: 50 }}>🔒</Text>
      </View>
      <Text style={styles.lockedTitle}>Profile Locked</Text>
      <Text style={styles.lockedText}>
        Complete verification to see real profiles and connect with genuine people on Suyavaraa.
      </Text>
      <TouchableOpacity 
        style={styles.verifyButton}
        onPress={() => navigation.navigate('Verification')}
      >
        <Text style={styles.verifyButtonText}>Complete Verification</Text>
      </TouchableOpacity>
    </View>
  );
};

// Profile Screen Component
const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const { userMode, activeMode, switchMode, isPrivilegedOwner } = useMode();
  const [isPremium, setIsPremium] = useState(false);
  const [trustLevel, setTrustLevel] = useState('unverified');
  const [preferredMode, setPreferredMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    matches: 0,
    likes: 0,
    views: 0
  });
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const calculateCompletion = (profileData, userData) => {
    let score = 0;
    let total = 6;
    if (userData?.full_name) score++;
    if (userData?.bio) score++;
    if (userData?.city) score++;
    if (profileData?.occupation) score++;
    if (profileData?.primary_photo_url) score++;
    if (profileData?.additional_photos?.length > 0) score++;
    
    return Math.round((score / total) * 100);
  };

  useEffect(() => {
    loadProfile();
  }, [userMode]);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, city, bio, is_premium, premium_expires_at, trust_level, trust_score, is_verified, date_of_birth, preferred_mode')
        .eq('id', user.id)
        .single();

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('primary_photo_url, additional_photos, occupation, interests, hobbies, languages, height_cm')
        .eq('user_id', user.id)
        .single();

      if (userData) {
        const isPremiumActive =
          userData.is_premium &&
          (!userData.premium_expires_at || new Date(userData.premium_expires_at) > new Date());
        
        // Calculate age from date_of_birth
        const calculateAgeFromDOB = (dob) => {
          if (!dob) return null;
          const birthDate = new Date(dob);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        };

        // Format height from cm
        const formatHeight = (cm) => {
          if (!cm) return '';
          const totalInches = Math.round(cm / 2.54);
          const feet = Math.floor(totalInches / 12);
          const inches = totalInches % 12;
          return `${feet}'${inches}"`;
        };

        setProfile({
          display_name: userData.full_name,
          bio: userData.bio,
          city: userData.city,
          age: calculateAgeFromDOB(userData.date_of_birth) || 25,
          photos: profileData
            ? [profileData.primary_photo_url, ...(profileData.additional_photos || [])].filter(Boolean)
            : [],
          occupation: profileData?.occupation || '',
          interests: profileData?.interests || [],
          hobbies: profileData?.hobbies || [],
          languages: profileData?.languages || [],
          height: formatHeight(profileData?.height_cm),
          trust_score: userData.trust_score || 75
        });
        setPreferredMode(userData.preferred_mode || 'zone');
        setIsPremium(isPrivilegedOwner ? true : isPremiumActive);
        setTrustLevel(userData.trust_level || 'unverified');
        setCompletionPercentage(calculateCompletion(profileData, userData));
      }

      const [matchesRes, likesRes, viewsRes] = await Promise.all([
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase
          .from('user_actions')
          .select('id', { count: 'exact', head: true })
          .eq('target_user_id', user.id)
          .eq('action_type', 'like'),
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('viewed_id', user.id),
      ]);

      if (matchesRes.error || likesRes.error || viewsRes.error) {
        console.warn(
          'Stats fetch warning:',
          matchesRes.error?.message || likesRes.error?.message || viewsRes.error?.message
        );
      }

      setStats({
        matches: matchesRes.count ?? 0,
        likes: likesRes.count ?? 0,
        views: viewsRes.count ?? 0,
      });
    } catch (error) {
      console.error('Load profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showSwitcher, setShowSwitcher] = useState(false);
  const effectiveMode = activeMode === 'admin' ? userMode : activeMode;
  const colors = effectiveMode === 'matrimony' ? matrimonyColors : datingColors;

  const handleSwitchMode = (targetMode) => {
    if (targetMode === activeMode) {
      setShowSwitcher(false);
      return;
    }

    if (targetMode === 'admin') {
      if (!isPrivilegedOwner) {
        Alert.alert('Access Denied', 'Admin mode is restricted.');
        return;
      }
      switchMode('admin');
      setShowSwitcher(false);
      Alert.alert('Success', 'Switched to Admin mode');
      return;
    }

    if (!isPremium) {
      Alert.alert(
        'Premium Preview',
        'Premium purchases are temporarily unavailable while billing and release compliance are being finalized.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'View Preview', onPress: () => navigation.navigate('Premium') }
        ]
      );
      return;
    }

    switchMode(targetMode);
    setShowSwitcher(false);
    Alert.alert('Success', `Switched to ${targetMode === 'dating' ? 'Dating' : 'Matrimony'} mode`);
  };

  const getTrustScoreColor = (score) => {
    if (score >= 80) return colors.trustHigh;
    if (score >= 50) return colors.trustMedium;
    return colors.trustLow;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isUnverified = trustLevel === 'unverified' || trustLevel === 'pending';

  // Redirect unverified users to FishTrap profile
  if (isUnverified && !isPremium) {
    return <FishTrapProfileScreen navigation={navigation} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AccountSwitcher 
        visible={showSwitcher}
        onClose={() => setShowSwitcher(false)}
        currentMode={activeMode}
        onSwitch={handleSwitchMode}
        isPremium={isPremium}
        canUseAdminMode={isPrivilegedOwner}
      />
      
      {/* Photo Viewer Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedPhoto(null)}
        >
          <Image source={{ uri: selectedPhoto }} style={{ width: width, height: width * 1.5, resizeMode: 'contain' }} />
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20 }}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileInfo}>
          {completionPercentage < 100 && (
            <View style={styles.completionContainer}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionText}>Profile Completion</Text>
                <Text style={[styles.completionPercentage, { color: colors.primary }]}>
                  {completionPercentage}%
                </Text>
              </View>
              <View style={styles.completionBarBackground}>
                <View
                  style={[
                    styles.completionBarFill,
                    {
                      width: `${completionPercentage}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                <Text style={{ fontSize: 12, color: colors.primary, marginTop: 6 }}>
                  Complete your profile to get more matches →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{profile?.display_name || 'User'}</Text>
            <Text style={styles.profileAge}>{profile?.age || 25}</Text>
          </View>

          <View style={styles.profileLocation}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.bioText, { marginLeft: 4, color: colors.textSecondary }]}>
              {profile?.city || 'Location not set'}
            </Text>
          </View>

          {!isPremium && (
            <PremiumBanner onPress={() => navigation.navigate('Premium')} />
          )}

          {/* Photos Grid (Small Icons) */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.bioTitle, { marginBottom: 12 }]}>Photos</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {profile?.photos?.length > 0 ? (
                profile.photos.map((photo, index) => (
                  <TouchableOpacity key={index} onPress={() => setSelectedPhoto(photo)}>
                    <Image source={{ uri: photo }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity 
                  style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Ionicons name="add" size={30} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badgesContainer}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Text>{activeMode === 'admin' ? '🛡️' : (effectiveMode === 'dating' ? '💘' : '💍')}</Text>
              <Text style={[styles.badgeText, { color: colors.primary, fontWeight: 'bold' }]}>
                {activeMode === 'admin' ? 'Admin' : (effectiveMode === 'dating' ? 'Dating' : 'Matrimony')}
              </Text>
            </View>

            {isPremium && (
              <View style={[styles.badge, styles.premiumBadge]}>
                <Text>⭐</Text>
                <Text style={[styles.badgeText, styles.premiumText]}>Premium</Text>
              </View>
            )}

            {trustLevel === 'green_verified' && (
              <View style={[styles.badge, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
                <Text>✅</Text>
                <Text style={[styles.badgeText, { color: '#10B981', fontWeight: 'bold' }]}>Verified</Text>
              </View>
            )}
          </View>

          {/* Trust Score */}
          <View style={[styles.trustScoreContainer, { borderColor: colors.border }]}>
            <View style={styles.trustScoreHeader}>
              <Text style={styles.trustScoreTitle}>Trust Score</Text>
              <Text style={[styles.trustScoreValue, { color: getTrustScoreColor(profile?.trust_score || 75) }]}>
                {profile?.trust_score || 75}%
              </Text>
            </View>
            <View style={styles.trustScoreBar}>
              <View style={[styles.trustScoreFill, { width: `${profile?.trust_score || 75}%`, backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.trustScoreLevels}>
              <Text style={styles.trustLevelText}>Basic</Text>
              <Text style={styles.trustLevelText}>Trusted</Text>
              <Text style={styles.trustLevelText}>Verified</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioTitle}>About Me</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>
              {profile?.bio || 'No bio added yet. Tell others about yourself!'}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.detailsGrid}>
            {profile?.occupation ? (
              <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]}>{profile.occupation}</Text>
              </View>
            ) : null}
            {profile?.height ? (
              <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="resize-outline" size={18} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]}>{profile.height}</Text>
              </View>
            ) : null}
            {profile?.languages?.length > 0 ? (
              <View style={[styles.detailItem, { backgroundColor: colors.surface }]}>
                <Ionicons name="language-outline" size={18} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]}>{profile.languages.join(', ')}</Text>
              </View>
            ) : null}
          </View>

          {/* Interests & Hobbies Tags */}
          {profile?.interests?.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsTitle}>Interests</Text>
              <View style={styles.tagsContainer}>
                {profile.interests.map((item, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {profile?.hobbies?.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.tagsTitle}>Hobbies</Text>
              <View style={styles.tagsContainer}>
                {profile.hobbies.map((item, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={[styles.statsContainer, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.matches}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.likes}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{stats.views}</Text>
              <Text style={styles.statLabel}>Profile Views</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff', fontWeight: 'bold' }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowSwitcher(true)}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Text>{activeMode === 'admin' ? '🛡️' : (effectiveMode === 'dating' ? '💘' : '💍')}</Text>
            </View>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Switch Mode (Current: {activeMode === 'admin' ? 'Admin' : (effectiveMode === 'dating' ? 'Dating' : 'Matrimony')})
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto', marginRight: 10 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Edit Profile Screen
const EditProfileScreen = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [photos, setPhotos] = useState([]);
  const [interests, setInterests] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [languages, setLanguages] = useState('');
  const [height, setHeight] = useState('');
  const [religion, setReligion] = useState('');
  const [education, setEducation] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('full_name, bio, city')
        .eq('id', user.id)
        .single();

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('primary_photo_url, additional_photos, occupation, interests, hobbies, languages, height_cm, religion, education, mother_tongue, about')
        .eq('user_id', user.id)
        .single();

      if (userData) {
        setDisplayName(userData.full_name || '');
        setBio(userData.bio || '');
        setCity(userData.city || '');
      }
      if (profileData) {
        setOccupation(profileData.occupation || '');
        const allPhotos = [
          profileData.primary_photo_url,
          ...(profileData.additional_photos || [])
        ].filter(Boolean);
        setPhotos(allPhotos);
        setInterests(profileData.interests?.join(', ') || '');
        setHobbies(profileData.hobbies?.join(', ') || '');
        setLanguages(profileData.languages?.join(', ') || '');
        setHeight(profileData.height_cm ? String(profileData.height_cm) : '');
        setReligion(profileData.religion || '');
        setEducation(profileData.education || '');
        setMotherTongue(profileData.mother_tongue || '');
        setAbout(profileData.about || '');
      }
    } catch (error) {
      console.error('Load profile error:', error);
      // Fallback
      const cached = await AsyncStorage.getItem('userData');
      if (cached) {
        const profile = JSON.parse(cached);
        setDisplayName(profile.display_name || '');
        setBio(profile.bio || '');
        setOccupation(profile.occupation || '');
        setCity(profile.city || '');
        setPhotos(profile.photos || []);
      }
    }
  };

  const pickImage = async (index) => {
    try {
      const result = await pickMedia('library', true, 'image');
      if (result?.uri) {
        const newPhotos = [...photos];
        newPhotos[index] = result.uri;
        setPhotos(newPhotos);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removePhoto = (index) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            setPhotos(newPhotos);
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload any new local-URI photos to Supabase storage
      const uploadedPhotos = await Promise.all(
        photos.map(async (uri, idx) => {
          if (!uri || uri.startsWith('http')) return uri; // Already uploaded
          const filePath = `${user.id}/photo_${idx}_${Date.now()}.jpg`;
          const uploaded = await uploadMedia(uri, 'avatars', filePath);
          return uploaded || uri;
        })
      );

      const [primaryPhoto, ...additionalPhotos] = uploadedPhotos.filter(Boolean);

      // Update users table
      await supabase.from('users').upsert({
        id: user.id,
        full_name: displayName,
        bio,
        city,
      }, {
        onConflict: 'id'
      });

      // Verify user row exists before creating profile
      const { data: verifyUser, error: verifyError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (verifyError || !verifyUser) {
        throw new Error('User record not found after upsert — cannot update profile');
      }

      // Parse height_cm to integer
      const heightCmParsed = height ? parseInt(height, 10) : null;

      // Upsert user_profiles table
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        primary_photo_url: primaryPhoto || null,
        additional_photos: additionalPhotos,
        occupation,
        interests: interests.split(',').map(i => i.trim()).filter(Boolean),
        hobbies: hobbies.split(',').map(i => i.trim()).filter(Boolean),
        languages: languages.split(',').map(i => i.trim()).filter(Boolean),
        height_cm: heightCmParsed,
        religion: religion || null,
        education: education || null,
        mother_tongue: motherTongue || null,
        about: about || null,
      }, { onConflict: 'user_id' });

      // Safety scan for profile photos: deepfake + sexual imagery detection
      const photosToScan = [primaryPhoto, ...additionalPhotos].filter(Boolean);
      if (photosToScan.length > 0) {
        const scanResults = await deepfakeDetectionService.scanUserProfile(user.id, photosToScan);
        const flagged = scanResults.filter(s => ['deepfake', 'nsfw', 'suspicious'].includes(s.result));

        if (flagged.length > 0) {
          await supabase.from('reports').insert({
            reporter_id: user.id,
            target_id: user.id,
            content_type: 'profile_photo',
            reason: `AUTO-DETECTED profile risk: ${flagged[0].result} (${flagged[0].reasoning || 'No reason'})`,
            category: flagged[0].result === 'deepfake' ? 'deepfake' : 'sexual_content',
            severity: flagged[0].confidence > 0.8 ? 'critical' : 'high',
            auto_flagged: true,
            status: 'pending',
            ai_analysis: JSON.stringify(flagged[0]),
          });
        }
      }

      // Keep AsyncStorage in sync for quick offline reads
      await AsyncStorage.setItem('userData', JSON.stringify({
        display_name: displayName,
        bio,
        occupation,
        city,
        photos: uploadedPhotos,
        profile_picture_url: primaryPhoto || null,
        religion,
        education,
        mother_tongue: motherTongue,
        height_cm: heightCmParsed,
      }));

      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.editContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.editForm}>
        {/* Photos */}
        <Text style={styles.inputLabel}>Profile Photos (Max 6)</Text>
        <View style={styles.photoGrid}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TouchableOpacity
              key={index}
              style={styles.editPhotoItem}
              onPress={() => pickImage(index)}
            >
              {photos[index] ? (
                <>
                  <Image source={{ uri: photos[index] }} style={styles.editPhotoImage} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close" size={16} color={colors.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <Ionicons name="camera" size={24} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={styles.inputLabel}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Bio */}
        <Text style={styles.inputLabel}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell others about yourself..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        {/* Occupation */}
        <Text style={styles.inputLabel}>Occupation</Text>
        <TextInput
          style={styles.input}
          value={occupation}
          onChangeText={setOccupation}
          placeholder="What do you do?"
          placeholderTextColor={colors.textSecondary}
        />

        {/* City */}
        <Text style={styles.inputLabel}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Your city"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Interests */}
        <Text style={styles.inputLabel}>Interests (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={interests}
          onChangeText={setInterests}
          placeholder="e.g. Travel, Music, Tech"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Hobbies */}
        <Text style={styles.inputLabel}>Hobbies</Text>
        <TextInput
          style={styles.input}
          value={hobbies}
          onChangeText={setHobbies}
          placeholder="e.g. Reading, Swimming"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Languages */}
        <Text style={styles.inputLabel}>Languages</Text>
        <TextInput
          style={styles.input}
          value={languages}
          onChangeText={setLanguages}
          placeholder="e.g. English, Tamil, Hindi"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Height (cm) */}
        <Text style={styles.inputLabel}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          placeholder="e.g. 170"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
        />

        {/* Religion */}
        <Text style={styles.inputLabel}>Religion</Text>
        <TextInput
          style={styles.input}
          value={religion}
          onChangeText={setReligion}
          placeholder="e.g. Hindu, Muslim, Christian"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Education */}
        <Text style={styles.inputLabel}>Education</Text>
        <TextInput
          style={styles.input}
          value={education}
          onChangeText={setEducation}
          placeholder="e.g. Bachelor's in Engineering"
          placeholderTextColor={colors.textSecondary}
        />

        {/* Mother Tongue */}
        <Text style={styles.inputLabel}>Mother Tongue</Text>
        <TextInput
          style={styles.input}
          value={motherTongue}
          onChangeText={setMotherTongue}
          placeholder="e.g. Tamil, Hindi, English"
          placeholderTextColor={colors.textSecondary}
        />

        {/* About (extended bio) */}
        <Text style={styles.inputLabel}>About</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={about}
          onChangeText={setAbout}
          placeholder="Tell more about yourself, your values, what you're looking for..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Settings Screen
const SettingsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [blockUserId, setBlockUserId] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    loadNotificationPreference();
    loadSettingsPreferences();
  }, []);
  const loadNotificationPreference = async () => {
    const enabled = await notificationService.areNotificationsEnabled();
    setNotifications(enabled);
  };

  const loadSettingsPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('settingsPreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (typeof prefs.showOnline === 'boolean') setShowOnline(prefs.showOnline);
      }
    } catch (e) {
      console.warn('Failed to load settings preferences:', e);
    }
  };

  const handleNotificationToggle = async (value) => {
    setNotifications(value);
    await notificationService.setNotificationsEnabled(value);
  };

  const handleShowOnlineToggle = async (value) => {
    setShowOnline(value);
    try {
      const saved = await AsyncStorage.getItem('settingsPreferences');
      const prefs = saved ? JSON.parse(saved) : {};
      prefs.showOnline = value;
      await AsyncStorage.setItem('settingsPreferences', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save show online preference:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Logout failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleResetPassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'suyavaraa://reset-password',
      });

      if (error) throw error;
      Alert.alert('Email Sent', 'A password reset link has been sent to your email.');
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'Failed to send reset email.');
    }
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log the deletion request
      await supabase.from('user_feedback').insert({
        user_id: user.id,
        category: 'general',
        subject: 'Account Deletion Request',
        message: 'User requested account deletion from settings.',
        status: 'open',
      });

      // Actually delete the auth user and cascade to all tables
      const { error } = await supabase.rpc('delete_user_and_related_data', { user_id: user.id });
      if (error) {
        // Fallback: try admin API or just sign out
        console.warn('RPC delete failed, trying direct approach:', error.message);
        // Clear local data and sign out
        await AsyncStorage.clear();
        await supabase.auth.signOut();
        Alert.alert('Account Deletion', 'Your local data has been cleared. For full deletion, please contact support.');
        return;
      }

      await AsyncStorage.clear();
      await supabase.auth.signOut();
      Alert.alert('Account Deleted', 'Your account and all associated data have been permanently deleted.');
    } catch (error) {
      console.error('Delete account error:', error);
      // Fallback: clear local data and sign out
      await AsyncStorage.clear();
      await supabase.auth.signOut();
      Alert.alert('Account Deletion', 'Your local data has been cleared. For full deletion, please contact support.');
    }
  };

  const submitFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      Alert.alert('Feedback', 'Please add both subject and message.');
      return;
    }

    setFeedbackLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Screen feedback for abuse/spam so admin gets categorized reports
      const textCheck = await moderationService.screenText(feedbackMessage, user.id);

      const { error } = await supabase.from('user_feedback').insert({
        user_id: user.id,
        category: feedbackCategory,
        subject: feedbackSubject,
        message: feedbackMessage,
        status: 'open',
      });

      if (error) throw error;

      // If risky feedback content is detected, auto-create report for admin queue
      if (!textCheck.safe) {
        await supabase.from('reports').insert({
          reporter_id: user.id,
          target_id: user.id,
          content_type: 'feedback',
          reason: `Feedback moderation flag: ${textCheck.reason}`,
          category: textCheck.category || 'general',
          severity: textCheck.severity || 'medium',
          auto_flagged: true,
          status: 'pending',
          ai_analysis: JSON.stringify(textCheck),
        });
      }

      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackCategory('general');
      Alert.alert('Thanks', 'Your feedback has been submitted.');
    } catch (error) {
      console.error('submitFeedback error:', error);
      Alert.alert('Error', error.message || 'Failed to submit feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const submitBlockUser = async () => {
    if (!blockUserId.trim()) {
      Alert.alert('Block User', 'Please provide a user ID to block.');
      return;
    }

    setBlockLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (user.id === blockUserId.trim()) throw new Error('You cannot block yourself');

      const reason = blockReason.trim() || 'No reason provided';

      const { error } = await supabase.from('user_blocks').upsert({
        blocker_id: user.id,
        blocked_id: blockUserId.trim(),
        reason,
      }, { onConflict: 'blocker_id,blocked_id' });

      if (error) throw error;

      // Create a moderation report so admin sees this block reason in dashboard
      await supabase.from('reports').insert({
        reporter_id: user.id,
        target_id: blockUserId.trim(),
        content_type: 'user_account',
        reason: `User block reason: ${reason}`,
        category: 'harassment',
        severity: 'medium',
        status: 'pending',
        auto_flagged: false,
      });

      setBlockUserId('');
      setBlockReason('');
      Alert.alert('Blocked', 'User has been blocked and the report is visible to admins.');
    } catch (error) {
      console.error('submitBlockUser error:', error);
      Alert.alert('Error', error.message || 'Failed to block user');
    } finally {
      setBlockLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        {/* Account Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsHeader}>ACCOUNT</Text>
          
          <TouchableOpacity style={styles.settingsItem} onPress={() => Alert.alert('Account Info', 'View and edit your account email, phone, and login details. Coming soon.')}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="person" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Account Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => Alert.alert('Privacy & Security', 'Manage who can see your profile, block list, and security settings. Coming soon.')}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('Premium')}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="card" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Subscription</Text>
            </View>
            <View style={styles.settingsItemRight}>
              <Text style={styles.settingsItemValue}>Preview</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {effectiveMode === 'matrimony' && preferredMode === 'community' && (
            <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('FamilyAccount')}>
              <View style={styles.settingsItemLeft}>
                <Ionicons name="people" size={20} color={colors.textSecondary} />
                <Text style={styles.settingsItemText}>Family Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.settingsItem} onPress={handleResetPassword}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="lock-open" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Reset Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsHeader}>PREFERENCES</Text>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="notifications" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
              style={styles.switch}
            />
          </View>

          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="eye" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Show Online Status</Text>
            </View>
            <Switch
              value={showOnline}
              onValueChange={handleShowOnlineToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
              style={styles.switch}
            />
          </View>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="heart" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Interested In</Text>
            </View>
            <View style={styles.settingsItemRight}>
              <Text style={styles.settingsItemValue}>Women</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="locate" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Distance Range</Text>
            </View>
            <View style={styles.settingsItemRight}>
              <Text style={styles.settingsItemValue}>50 km</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="calendar" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Age Range</Text>
            </View>
            <View style={styles.settingsItemRight}>
              <Text style={styles.settingsItemValue}>25-35</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsHeader}>SUPPORT</Text>
          
          <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('SupportCenter')}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="help-circle" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={() => navigation.navigate('SupportCenter')}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="chatbubble" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.settingsItem, { alignItems: 'flex-start', flexDirection: 'column' }]}>
            <Text style={[styles.settingsItemText, { marginLeft: 0, marginBottom: 10 }]}>Send Feedback</Text>
            <TextInput
              style={[styles.input, { width: '100%', marginBottom: 8 }]}
              placeholder="Subject"
              placeholderTextColor={colors.textSecondary}
              value={feedbackSubject}
              onChangeText={setFeedbackSubject}
            />
            <TextInput
              style={[styles.input, styles.textArea, { width: '100%', marginBottom: 8 }]}
              placeholder="Tell us your feedback / safety concern"
              placeholderTextColor={colors.textSecondary}
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.saveButton, { width: '100%', marginTop: 0, opacity: feedbackLoading ? 0.7 : 1 }]}
              onPress={submitFeedback}
              disabled={feedbackLoading}
            >
              {feedbackLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.saveButtonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.settingsItem, { alignItems: 'flex-start', flexDirection: 'column' }]}>
            <Text style={[styles.settingsItemText, { marginLeft: 0, marginBottom: 10 }]}>Block User</Text>
            <TextInput
              style={[styles.input, { width: '100%', marginBottom: 8 }]}
              placeholder="Target user ID"
              placeholderTextColor={colors.textSecondary}
              value={blockUserId}
              onChangeText={setBlockUserId}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.textArea, { width: '100%', marginBottom: 8 }]}
              placeholder="Reason (harassment, spam, abuse...)"
              placeholderTextColor={colors.textSecondary}
              value={blockReason}
              onChangeText={setBlockReason}
              multiline
            />
            <TouchableOpacity
              style={[styles.actionButton, { width: '100%', marginBottom: 0, opacity: blockLoading ? 0.7 : 1 }]}
              onPress={submitBlockUser}
              disabled={blockLoading}
            >
              {blockLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Ionicons name="hand-left-outline" size={20} color={colors.text} />
                  <Text style={styles.actionButtonText}>Block & Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('LegalDocument', { documentKey: 'terms' })}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="document-text" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('LegalDocument', { documentKey: 'privacy' })}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('LegalDocument', { documentKey: 'refunds' })}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="refresh-circle" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Refund Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsHeader}>DANGER ZONE</Text>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="log-out" size={20} color={colors.error} />
              <Text style={[styles.settingsItemText, styles.dangerText]}>Logout</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="trash" size={20} color={colors.error} />
              <Text style={[styles.settingsItemText, styles.dangerText]}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmDelete}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const AccountInfoScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccountInfo();
  }, []);

  const loadAccountInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in to view account information.');
        navigation.goBack();
        return;
      }

      setEmail(user.email || '');
      const { data, error } = await supabase.from('users').select('full_name').eq('id', user.id).single();
      if (error) throw error;
      setFullName(data?.full_name || '');
    } catch (error) {
      console.error('AccountInfo load error:', error);
      Alert.alert('Error', 'Unable to load account information.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const saveAccountInfo = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('users').update({ full_name: fullName.trim() || null }).eq('id', user.id);
      if (error) throw error;
      Alert.alert('Saved', 'Your account information has been updated.');
    } catch (error) {
      console.error('AccountInfo save error:', error);
      Alert.alert('Error', error.message || 'Unable to update account information.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Information</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.editForm}>
        <Text style={styles.inputLabel}>Email</Text>
        <Text style={[styles.profileLocation, { marginBottom: 16 }]}>{email || 'No email available'}</Text>

        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.inputLabel, { marginTop: 24 }]}>Email management</Text>
        <Text style={styles.bioText}>
          Email changes are managed through your login provider. To update your email, use password reset or contact support.
        </Text>

        <TouchableOpacity
          style={[styles.saveButton, { opacity: saving ? 0.7 : 1 }]}
          onPress={saveAccountInfo}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const PrivacySecurityScreen = ({ navigation }) => {
  const [hideProfile, setHideProfile] = useState(false);
  const [autoBlockSuspicious, setAutoBlockSuspicious] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  useEffect(() => {
    loadPrivacyPreferences();
  }, []);

  const loadPrivacyPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('privacyPreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        setHideProfile(!!prefs.hideProfile);
        setAutoBlockSuspicious(!!prefs.autoBlockSuspicious);
        setShowOnlineStatus(prefs.showOnlineStatus !== false);
      }
    } catch (error) {
      console.warn('Failed to load privacy preferences:', error);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const savePrivacyPreferences = async (prefs) => {
    try {
      await AsyncStorage.setItem('privacyPreferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save privacy preferences:', error);
    }
  };

  const toggleHideProfile = async (value) => {
    setHideProfile(value);
    await savePrivacyPreferences({ hideProfile: value, autoBlockSuspicious, showOnlineStatus });
  };

  const toggleAutoBlockSuspicious = async (value) => {
    setAutoBlockSuspicious(value);
    await savePrivacyPreferences({ hideProfile, autoBlockSuspicious: value, showOnlineStatus });
  };

  const toggleShowOnlineStatus = async (value) => {
    setShowOnlineStatus(value);
    await savePrivacyPreferences({ hideProfile, autoBlockSuspicious, showOnlineStatus: value });
  };

  if (loadingPrefs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView>
        <View style={styles.settingsSection}>
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="eye-off" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Hide profile from search</Text>
            </View>
            <Switch
              value={hideProfile}
              onValueChange={toggleHideProfile}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Auto block suspicious contacts</Text>
            </View>
            <Switch
              value={autoBlockSuspicious}
              onValueChange={toggleAutoBlockSuspicious}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="person" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsItemText}>Show online status</Text>
            </View>
            <Switch
              value={showOnlineStatus}
              onValueChange={toggleShowOnlineStatus}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          <View style={[styles.settingsItem, { alignItems: 'flex-start', flexDirection: 'column' }]}> 
            <Text style={[styles.settingsItemText, { marginLeft: 0, marginBottom: 10 }]}>Blocked members</Text>
            <Text style={styles.bioText}>
              Manage your block list through the chat safety menu or contact support if you need help removing a block.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Profile Stack Navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Profile"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: datingColors.background },
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AccountInfo" component={AccountInfoScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="FishTrap" component={FishTrapProfileScreen} />
      <Stack.Screen name="Verification" component={VideoVerificationScreen} />
      <Stack.Screen name="FamilyAccount" component={FamilyAccountScreen} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      <Stack.Screen name="SupportCenter" component={SupportCenterScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

module.exports = ProfileStack;
