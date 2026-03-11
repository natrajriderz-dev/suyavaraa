// src/components/modals/SuccessModal.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} = require('react-native');
const Colors = require('../../theme/Colors');

const SuccessModal = ({ visible, onClose, title, message }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.successOverlay}>
      <View style={styles.successCard}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>💛</Text>
        <Text style={styles.successTitle}>{title || 'Success!'}</Text>
        <Text style={styles.successText}>
          {message || "Action completed successfully."}
        </Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onClose}
        >
          <Text style={styles.actionBtnText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successCard: { backgroundColor: Colors.surface, borderRadius: 24, padding: 30, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 10 },
  successText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  actionBtn: { width: '100%', paddingVertical: 14, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
});

module.exports = SuccessModal;
