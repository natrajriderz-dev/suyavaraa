const React = require('react');
const { View, Text, ScrollView, TouchableOpacity, StyleSheet } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const Colors = require('../../theme/Colors');
const { documents } = require('../../content/complianceContent');

const LegalDocumentScreen = ({ route, navigation }) => {
  const documentKey = route?.params?.documentKey || 'terms';
  const document = documents[documentKey] || documents.terms;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{document.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updatedAt}>Last updated: {document.updatedAt}</Text>
        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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
  section: { marginBottom: 20 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  sectionBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
});

module.exports = LegalDocumentScreen;
