// src/screens/main/PremiumScreen.js
const React = require('react');
const {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const Colors = require('../../theme/Colors');

const { width } = Dimensions.get('window');

const PremiumScreen = ({ navigation }) => {
  const plans = [
    {
      id: 'monthly',
      title: 'Monthly',
      price: '₹299',
      period: '/month',
      features: ['Unlimited Likes', 'Full IMPRESS Feed', 'Who Viewed You', 'AI Relationship Coach'],
      color: ['#E91E63', '#9C27B0'], // Dating vibe
    },
    {
      id: 'yearly',
      title: 'Yearly',
      price: '₹2499',
      period: '/year',
      features: ['Everything in Monthly', 'Matrimony Suyamvaram Creator', 'AI Matrimony Guide', 'Saves 30%'],
      color: ['#D97706', '#F59E0B'], // Matrimony vibe
      recommended: true,
    }
  ];

  const PlanCard = ({ plan }) => (
    <View style={[styles.planCard, plan.recommended && styles.recommendedCard]}>
      {plan.recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>MOST POPULAR</Text>
        </View>
      )}
      <LinearGradient colors={plan.color} style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>{plan.period}</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.planBody}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={plan.color[0]} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
        
        <TouchableOpacity 
          style={[styles.selectBtn, { backgroundColor: plan.color[0] }]}
          onPress={() => {/* Handle Payment */}}
        >
          <Text style={styles.selectBtnText}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BOND Premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Level Up Your Love Life</Text>
          <Text style={styles.heroSub}>Unlock the full architecture of BOND—Dating and Matrimony.</Text>
        </View>

        {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Secure Checkout • Cancel Anytime</Text>
          <Text style={styles.footerSub}>Subscriptions will automatically renew unless canceled 24h before the end of the current period.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 10 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 16, color: '#1C1C1E' },
  scrollContent: { padding: 20 },
  heroSection: { alignItems: 'center', marginBottom: 30 },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#1C1C1E', textAlign: 'center' },
  heroSub: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  recommendedCard: {
    borderColor: '#D97706',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  recommendedText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  planHeader: { padding: 24, alignItems: 'center' },
  planTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  planPrice: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  planPeriod: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginLeft: 4 },
  planBody: { padding: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  featureText: { fontSize: 15, color: '#4B5563', marginLeft: 12 },
  selectBtn: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  selectBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 14, color: '#1C1C1E', fontWeight: 'bold' },
  footerSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 18 },
});

module.exports = PremiumScreen;
