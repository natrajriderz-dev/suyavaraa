// src/components/modals/MatrimonyDetailModal.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  ScrollView,
} = require('react-native');
const Colors = require('../../theme/Colors');

const MatrimonyDetailModal = ({ visible, profile, onClose, onInterest, alreadySent }) => {
  if (!profile) return null;

  const heightLabel = (cm) => {
    if (!cm) return null;
    const totalInches = Math.round(cm / 2.54);
    return `${Math.floor(totalInches / 12)}'${totalInches % 12}"  (${cm} cm)`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailPhotoContainer}>
              <Image
                source={{ uri: profile.primary_photo_url || 'https://via.placeholder.com/400' }}
                style={styles.detailPhoto}
              />
              <View style={styles.detailPhotoOverlay}>
                {profile.trust_level === 'green_verified' && (
                  <View style={styles.verifiedPill}>
                    <Text style={{ fontSize: 10 }}>✅</Text>
                    <Text style={styles.verifiedPillText}> Verified</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailBody}>
              <View style={styles.detailNameRow}>
                <Text style={styles.detailName}>{profile.display_name}</Text>
                <Text style={styles.detailAge}>, {profile.age}</Text>
              </View>
              <Text style={styles.detailMarital}>{profile.marital_status} • {profile.city}</Text>

              <View style={styles.infoGrid}>
                {[
                  { icon: '🕉️', label: 'Religion', value: profile.religion },
                  { icon: '🗣️', label: 'Mother Tongue', value: profile.mother_tongue },
                  { icon: '🎓', label: 'Education', value: profile.education },
                  { icon: '💼', label: 'Occupation', value: profile.occupation },
                  { icon: '👨‍👩‍👧', label: 'Family Type', value: profile.family_type },
                  { icon: '📏', label: 'Height', value: heightLabel(profile.height_cm) },
                  { icon: '💰', label: 'Annual Income', value: profile.annual_income },
                ].filter(f => f.value).map((field, i) => (
                  <View key={i} style={styles.infoCell}>
                    <Text style={styles.infoCellIcon}>{field.icon}</Text>
                    <View>
                      <Text style={styles.infoCellLabel}>{field.label}</Text>
                      <Text style={styles.infoCellValue} numberOfLines={1}>{field.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {profile.bio && (
                <View style={styles.bioSection}>
                  <Text style={styles.bioTitle}>⭐ About Me</Text>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.interestsSection}>
                  <Text style={styles.bioTitle}>Interests & Hobbies</Text>
                  <View style={styles.interestTags}>
                    {profile.interests.map((tag, i) => (
                      <View key={i} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.privacyNote}>
                <Text style={{ fontSize: 16 }}>🔒</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.privacyTitle}>Privacy Protected</Text>
                  <Text style={styles.privacyText}>
                    Contact details are shared only after both parties express interest and admin approval.
                  </Text>
                </View>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity style={styles.closeDetailBtn} onPress={onClose}>
                  <Text style={styles.closeDetailBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.expressBtn, alreadySent && { backgroundColor: Colors.success }]}
                  onPress={onInterest}
                  disabled={alreadySent}
                >
                  <Text style={styles.expressBtnText}>
                    {alreadySent ? '✓ Interest Sent' : '💛 Express Interest'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingBottom: 30 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  detailPhotoContainer: { position: 'relative' },
  detailPhoto: { width: '100%', height: 280, resizeMode: 'cover' },
  detailPhotoOverlay: { position: 'absolute', bottom: 12, left: 16, flexDirection: 'row' },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detailBody: { padding: 20 },
  detailNameRow: { flexDirection: 'row', alignItems: 'baseline' },
  detailName: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  detailAge: { fontSize: 20, color: Colors.textSecondary },
  detailMarital: { fontSize: 14, color: Colors.textMuted, marginTop: 4, marginBottom: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  infoCell: { width: '47%', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, padding: 10, borderRadius: 12 },
  infoCellIcon: { fontSize: 20, marginRight: 10 },
  infoCellLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase' },
  infoCellValue: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  bioSection: { marginBottom: 24 },
  bioTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  interestsSection: { marginBottom: 24 },
  interestTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  interestTagText: { fontSize: 12, color: Colors.textSecondary },
  privacyNote: { flexDirection: 'row', backgroundColor: Colors.surfaceLight + '80', padding: 16, borderRadius: 16, marginBottom: 30 },
  privacyTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  privacyText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  detailActions: { flexDirection: 'row', gap: 12 },
  closeDetailBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: 'center' },
  closeDetailBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  expressBtn: { flex: 2, paddingVertical: 16, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  expressBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
});

module.exports = MatrimonyDetailModal;
