// src/screens/main/PremiumScreen.js
const React = require('react');
const {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Share,
  ActivityIndicator,
} = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const { LinearGradient } = require('expo-linear-gradient');
const Colors = require('../../theme/Colors');
const paymentService = require('../../services/paymentService');
const { Alert } = require('react-native');
const { supabase } = require('../../../supabase');

const { width } = Dimensions.get('window');

const PremiumScreen = ({ navigation }) => {
  const [referralCode, setReferralCode] = React.useState('');
  const [loadingCode, setLoadingCode] = React.useState(true);

  React.useEffect(() => {
    fetchReferralCode();
  }, []);

  const fetchReferralCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single();
        
      if (!error && data?.referral_code) {
        setReferralCode(data.referral_code);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Join Suyavaraa with my referral code ${referralCode} to get 3 days of FREE Premium!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const plans = [
    {
      id: 'monthly',
      title: 'Premium Standard',
      features: ['Unlimited Likes', 'Full IMPRESS Feed', 'Who Viewed You', 'AI Relationship Coach'],
      color: ['#E91E63', '#9C27B0'], // Dating vibe
    },
    {
      id: 'yearly',
      title: 'Premium Plus',
      features: ['Everything in Standard', 'Matrimony Suyamvaram Creator', 'AI Matrimony Guide', 'Priority Profile Visibility'],
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
      </LinearGradient>
      
      <View style={styles.planBody}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={plan.color[0]} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suyavaraa Premium</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Refer & Earn Premium</Text>
          <Text style={styles.heroSub}>Invite friends to unlock Premium! Earn 7 days for every friend who joins, and they get 3 days free.</Text>

          <View style={styles.referralContainer}>
            <Text style={styles.referralLabel}>Your Invite Code</Text>
            {loadingCode ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{referralCode || 'UNAVAILABLE'}</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="share-social" size={20} color="#fff" />
                  <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
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
  referralContainer: { marginTop: 24, padding: 20, backgroundColor: '#FFF5F5', borderRadius: 16, width: '100%', borderWidth: 1, borderColor: '#FFE4E6' },
  referralLabel: { fontSize: 14, color: '#E91E63', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeText: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', letterSpacing: 2 },
  shareBtn: { flexDirection: 'row', backgroundColor: '#E91E63', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 4,
    boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
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
  selectBtnDisabled: {
    opacity: 0.75,
  },
  selectBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 14, color: '#1C1C1E', fontWeight: 'bold' },
  footerSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 18 },
});

module.exports = PremiumScreen;
