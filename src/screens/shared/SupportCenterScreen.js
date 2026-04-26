const React = require('react');
const { View, Text, ScrollView, TouchableOpacity, StyleSheet } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');
const { support } = require('../../content/complianceContent');

const SupportCenterScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{support.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updatedAt}>Last updated: {support.updatedAt}</Text>
        {support.sections.map((section) => (
          <View key={section.heading} style={styles.card}>
            <Text style={styles.cardTitle}>{section.heading}</Text>
            <Text style={styles.cardBody}>{section.body}</Text>
          </View>
        ))}
        <View style={styles.tipCard}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
          <Text style={styles.tipText}>
            For urgent safety issues, use the in-app report and block flows from member profiles or chat.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { flex: 1, marginLeft: 16, fontSize: 18, fontWeight: 'bold', color: Colors.text },
  headerSpacer: { width: 24 },
  content: { padding: 20, paddingBottom: 40 },
  updatedAt: { color: Colors.textSecondary, marginBottom: 20, fontSize: 13 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.primary + '12',
  },
  tipText: { flex: 1, color: Colors.text, fontSize: 14, lineHeight: 22 },
});

module.exports = SupportCenterScreen;
