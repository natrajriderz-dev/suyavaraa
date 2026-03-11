// src/screens/main/FiltersScreen.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const Colors = require('../../theme/Colors');
const { useMode } = require('../../../context/ModeContext');

const FiltersScreen = ({ navigation }) => {
  const { userMode } = useMode();
  const [distance, setDistance] = useState(50);
  const [ageRange, setAgeRange] = useState([18, 35]);
  const [gender, setGender] = useState('Everyone');
  const [religion, setReligion] = useState('All');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [education, setEducation] = useState('All');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const saved = await AsyncStorage.getItem(`filters_${userMode}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDistance(parsed.distance || 50);
        setAgeRange(parsed.ageRange || [18, 35]);
        setGender(parsed.gender || 'Everyone');
        setReligion(parsed.religion || 'All');
        setShowVerifiedOnly(parsed.showVerifiedOnly || false);
        setEducation(parsed.education || 'All');
      }
    } catch (e) {
      console.log('Load filters error:', e);
    }
  };

  const saveFilters = async () => {
    try {
      const filters = {
        distance,
        ageRange,
        gender,
        religion,
        showVerifiedOnly,
        education
      };
      await AsyncStorage.setItem(`filters_${userMode}`, JSON.stringify(filters));
      navigation.goBack();
    } catch (e) {
      console.log('Save filters error:', e);
    }
  };

  const renderOption = (label, current, options, setter) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionBtn, current === opt && styles.optionBtnActive]}
            onPress={() => setter(opt)}
          >
            <Text style={[styles.optionText, current === opt && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={saveFilters}>
          <Text style={styles.doneBtn}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Max Distance</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.valueText}>{distance} miles</Text>
          </View>
          {/* Slider replacement - simple increments for now as Slider needs @react-native-community/slider */}
          <View style={styles.chipRow}>
            {[10, 25, 50, 100, 500].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, distance === d && styles.chipActive]}
                onPress={() => setDistance(d)}
              >
                <Text style={[styles.chipText, distance === d && styles.chipTextActive]}>{d}mi</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Range</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.valueText}>{ageRange[0]} - {ageRange[1]}</Text>
          </View>
          <View style={styles.chipRow}>
            {[18, 25, 30, 35, 45, 60].map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, ageRange.includes(a) && styles.chipActive]}
                onPress={() => {
                  if (ageRange[0] === a) return; // simple toggle logic
                  setAgeRange([ageRange[0], a]);
                }}
              >
                <Text style={[styles.chipText, ageRange.includes(a) && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {userMode === 'dating' && renderOption('Show Me', gender, ['Men', 'Women', 'Everyone'], setGender)}
        
        {userMode === 'matrimony' && (
          <>
            {renderOption('Religion', religion, ['All', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Parsi'], setReligion)}
            {renderOption('Education', education, ['All', 'Bachelors', 'Masters', 'Doctorate'], setEducation)}
          </>
        )}

        <View style={styles.switchSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Verified Profiles Only</Text>
            <Text style={styles.subtext}>Only show users who have verified their identity</Text>
          </View>
          <Switch
            value={showVerifiedOnly}
            onValueChange={setShowVerifiedOnly}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
          />
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={() => {
          setDistance(50);
          setAgeRange([18, 35]);
          setGender('Everyone');
          setReligion('All');
          setShowVerifiedOnly(false);
          setEducation('All');
        }}>
          <Text style={styles.resetText}>Reset All Filters</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  doneBtn: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  scrollContent: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  valueText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  optionBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  optionText: { color: Colors.textSecondary, fontSize: 15 },
  optionTextActive: { color: Colors.primary, fontWeight: 'bold' },
  switchSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  subtext: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  resetBtn: { marginTop: 20, alignItems: 'center', padding: 16 },
  resetText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
});

module.exports = FiltersScreen;
