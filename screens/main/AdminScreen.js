const React = require('react');
const {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const adminDashboardService = require('../../src/services/adminDashboardService');

const shortId = (id) => (id ? `${id.slice(0, 8)}...` : 'unknown');
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const AdminScreen = () => {
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [adminUser, setAdminUser] = React.useState(null);
  const [data, setData] = React.useState({
    users: [],
    reports: [],
    feedback: [],
    blocks: [],
    deepfakeScans: [],
    autoRemovals: [],
    verificationQueue: [],
  });

  const loadAll = React.useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const admin = await adminDashboardService.getCurrentAdminUser();
      if (!admin) {
        setAdminUser(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setAdminUser(admin);
      const dashboardData = await adminDashboardService.loadAdminDashboardData();
      setData(dashboardData);
    } catch (error) {
      Alert.alert('Admin Error', error.message || 'Unable to load admin dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll(false);
    const id = setInterval(() => loadAll(false), 30000);
    return () => clearInterval(id);
  }, [loadAll]);

  const handleResolveReport = async (reportId, status) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.resolveReport(reportId, adminUser.id, status);
    if (error) {
      Alert.alert('Failed', error.message || 'Could not update report');
      return;
    }
    await loadAll(false);
  };

  const handleCloseFeedback = async (feedbackId) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.closeFeedback(
      feedbackId,
      adminUser.id,
      'Reviewed in mobile admin dashboard.'
    );
    if (error) {
      Alert.alert('Failed', error.message || 'Could not close feedback');
      return;
    }
    await loadAll(false);
  };

  const handleVerification = async (row, approved) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.processVerification(row, adminUser.id, approved);
    if (error) {
      Alert.alert('Failed', error.message || 'Could not update verification');
      return;
    }
    await loadAll(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  if (!adminUser) {
    return (
      <View style={styles.center}>
        <Ionicons name="shield-outline" size={42} color="#64748b" />
        <Text style={styles.emptyTitle}>No admin access</Text>
        <Text style={styles.emptyText}>Your account is not listed in admin_users.</Text>
      </View>
    );
  }

  const pendingReports = data.reports.filter((r) => r.status === 'pending');
  const pendingVerifications = data.verificationQueue.length;
  const suspiciousScans = data.deepfakeScans.filter((s) => ['deepfake', 'nsfw', 'suspicious'].includes(s.result)).length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>{adminUser.email} ({adminUser.role})</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Pending Reports" value={pendingReports.length} tone="danger" />
        <StatCard label="Pending Verifications" value={pendingVerifications} tone="warning" />
        <StatCard label="Suspicious Scans" value={suspiciousScans} tone="info" />
      </View>

      <Section title="Reports Queue">
        {pendingReports.slice(0, 8).map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.cardTitle}>{r.category || 'general'} • {r.severity || 'medium'}</Text>
            <Text style={styles.cardMeta}>Reporter: {shortId(r.reporter_id)}</Text>
            <Text style={styles.cardBody}>{r.reason}</Text>
            <Text style={styles.time}>{fmt(r.created_at)}</Text>
            <View style={styles.actionsRow}>
              <SmallBtn text="Resolve" onPress={() => handleResolveReport(r.id, 'resolved')} />
              <SmallBtn text="Dismiss" kind="muted" onPress={() => handleResolveReport(r.id, 'dismissed')} />
            </View>
          </View>
        ))}
        {pendingReports.length === 0 ? <EmptyLine text="No pending reports" /> : null}
      </Section>

      <Section title="Verification Queue">
        {data.verificationQueue.slice(0, 8).map((row) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.cardTitle}>User: {shortId(row.user_id)}</Text>
            <Text style={styles.cardMeta}>Status: {row.status}</Text>
            <Text style={styles.time}>{fmt(row.created_at)}</Text>
            <View style={styles.actionsRow}>
              <SmallBtn text="Approve" onPress={() => handleVerification(row, true)} />
              <SmallBtn text="Reject" kind="muted" onPress={() => handleVerification(row, false)} />
            </View>
          </View>
        ))}
        {data.verificationQueue.length === 0 ? <EmptyLine text="No pending verification requests" /> : null}
      </Section>

      <Section title="User Feedback">
        {data.feedback.slice(0, 6).map((f) => (
          <View key={f.id} style={styles.card}>
            <Text style={styles.cardTitle}>{f.subject}</Text>
            <Text style={styles.cardMeta}>{f.category} • {f.status}</Text>
            <Text style={styles.cardBody}>{f.message}</Text>
            <Text style={styles.time}>{fmt(f.created_at)}</Text>
            {f.status !== 'closed' ? <SmallBtn text="Close" onPress={() => handleCloseFeedback(f.id)} /> : null}
          </View>
        ))}
        {data.feedback.length === 0 ? <EmptyLine text="No feedback entries" /> : null}
      </Section>

      <Section title="Latest Blocks">
        {data.blocks.slice(0, 6).map((b) => (
          <View key={b.id} style={styles.card}>
            <Text style={styles.cardTitle}>{shortId(b.blocker_id)} blocked {shortId(b.blocked_id)}</Text>
            <Text style={styles.cardBody}>{b.reason || 'No reason provided'}</Text>
            <Text style={styles.time}>{fmt(b.created_at)}</Text>
          </View>
        ))}
        {data.blocks.length === 0 ? <EmptyLine text="No block records" /> : null}
      </Section>
    </ScrollView>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const StatCard = ({ label, value, tone }) => (
  <View style={[styles.statCard, tone === 'danger' ? styles.statDanger : null, tone === 'warning' ? styles.statWarning : null, tone === 'info' ? styles.statInfo : null]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SmallBtn = ({ text, onPress, kind }) => (
  <TouchableOpacity style={[styles.smallBtn, kind === 'muted' ? styles.smallBtnMuted : null]} onPress={onPress}>
    <Text style={[styles.smallBtnText, kind === 'muted' ? styles.smallBtnTextMuted : null]}>{text}</Text>
  </TouchableOpacity>
);

const EmptyLine = ({ text }) => <Text style={styles.emptyLine}>{text}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, color: '#334155' },
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: '700', color: '#0f172a' },
  emptyText: { marginTop: 4, color: '#64748b' },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12 },
  statCard: { flex: 1, margin: 4, padding: 10, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  statDanger: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  statWarning: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  statInfo: { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { marginTop: 2, fontSize: 11, color: '#475569' },
  section: { marginTop: 14, paddingHorizontal: 12, paddingBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardMeta: { fontSize: 12, color: '#475569', marginTop: 4 },
  cardBody: { fontSize: 12, color: '#334155', marginTop: 6 },
  time: { fontSize: 11, color: '#64748b', marginTop: 8 },
  actionsRow: { flexDirection: 'row', marginTop: 10 },
  smallBtn: { backgroundColor: '#0f766e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, marginRight: 8 },
  smallBtnMuted: { backgroundColor: '#e2e8f0' },
  smallBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  smallBtnTextMuted: { color: '#334155' },
  emptyLine: { color: '#64748b', fontSize: 12, marginTop: 2, marginLeft: 4 },
});

module.exports = AdminScreen;
