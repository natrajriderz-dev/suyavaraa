// src/components/modals/CreatePostModal.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} = require('react-native');
const { useState } = React;
const Colors = require('../../theme/Colors');
const { pickMedia, compressImage } = require('../../utils/mediaUtils');
const { Ionicons } = require('@expo/vector-icons');

const CreatePostModal = ({ visible, onClose, onSubmit }) => {
  const [caption, setCaption] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [selectedTribes, setSelectedTribes] = useState([]);

  const handlePickImage = async () => {
    const result = await pickMedia('library', true);
    if (result) {
      setLoading(true);
      const compressedUri = await compressImage(result.uri);
      setPhoto({ ...result, uri: compressedUri });
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!caption && !photo) {
      Alert.alert('Error', 'Please add a caption or photo');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        caption,
        photo: photo, // Passing full photo object including URI
        visibility,
        tribe_tags: selectedTribes
      });
      // Reset after success is usually handled by parent if modal closes, 
      // but let's clear here too
      setCaption('');
      setPhoto(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to share post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Post to Impress</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={loading} style={[styles.shareBtn, (!caption && !photo) && styles.shareBtnDisabled]}>
              <Text style={styles.shareBtnText}>{loading ? 'Sharing...' : 'Share'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.inputArea}>
              <TextInput
                style={styles.captionInput}
                placeholder="Share a moment..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                value={caption}
                onChangeText={setCaption}
                maxLength={2000}
              />
            </View>

            {photo ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhoto(null)}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickImage}>
                <Ionicons name="image" size={40} color={Colors.primary} />
                <Text style={styles.addPhotoText}>Add High-Quality Photo</Text>
                <Text style={styles.compressionHint}>Auto-optimized for best performance</Text>
              </TouchableOpacity>
            )}

            <View style={styles.settingContainer}>
              <Text style={styles.settingLabel}>Visibility</Text>
              <View style={styles.visibilityButtons}>
                {['public', 'tribe_only', 'private'].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.visibilityBtn, visibility === v && styles.visibilityBtnActive]}
                    onPress={() => setVisibility(v)}
                  >
                    <Text style={[styles.visibilityBtnText, visibility === v && styles.visibilityBtnActiveText]}>
                      {v.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '92%', width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  closeBtn: { fontSize: 16, color: Colors.textSecondary },
  shareBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtnText: { color: Colors.text, fontWeight: 'bold' },
  inputArea: { marginBottom: 16 },
  captionInput: { fontSize: 16, color: Colors.text, minHeight: 80, textAlignVertical: 'top' },
  addPhotoBtn: { height: 250, backgroundColor: Colors.background, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginVertical: 16, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  addPhotoText: { color: Colors.text, fontSize: 16, fontWeight: '600', marginTop: 12 },
  compressionHint: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  photoPreviewContainer: { position: 'relative', marginVertical: 16 },
  photoPreview: { width: '100%', height: 400, borderRadius: 16, resizeMode: 'cover' },
  removePhotoBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  settingContainer: { marginTop: 20, paddingBottom: 40 },
  settingLabel: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  visibilityButtons: { flexDirection: 'row', gap: 10 },
  visibilityBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
  visibilityBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  visibilityBtnText: { fontSize: 14, color: Colors.textSecondary, textTransform: 'capitalize' },
  visibilityBtnActiveText: { color: '#fff', fontWeight: 'bold' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
});

module.exports = CreatePostModal;
