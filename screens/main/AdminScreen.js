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
  TextInput,
} = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const adminDashboardService = require('../../src/services/adminDashboardService');

const shortId = (id) => (id ? `${id.slice(0, 8)}...` : 'unknown');
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const AdminScreen = () => {
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [adminUser, setAdminUser] = React.useState(null);
  const [selectedTab, setSelectedTab] = React.useState('Overview');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [data, setData] = React.useState({
    users: [],
    reports: [],
    feedback: [],
    blocks: [],
    deepfakeScans: [],
    autoRemovals: [],
    verificationQueue: [],
    pendingPhotos: [],
    pendingPosts: [],
    escalatedSupport: [],
    adminTeam: [],
    activityLog: [],
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
      if (!searchTerm.trim()) {
        setSearchResults([]);
      }
    } catch (error) {
      Alert.alert('Admin Error', error.message || 'Unable to load admin dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm]);

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

  const handleApprovePhoto = async (photoId) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.approvePhoto(photoId, adminUser.id);
    if (error) {
      Alert.alert('Failed', error.message || 'Could not approve photo');
      return;
    }
    await loadAll(false);
  };

  const handleRejectPhoto = async (photoId) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.rejectPhoto(photoId, adminUser.id, 'Photo did not meet guidelines');
    if (error) {
      Alert.alert('Failed', error.message || 'Could not reject photo');
      return;
    }
    await loadAll(false);
  };

  const handleApprovePost = async (postId) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.approvePost(postId, adminUser.id);
    if (error) {
      Alert.alert('Failed', error.message || 'Could not approve post');
      return;
    }
    await loadAll(false);
  };

  const handleRejectPost = async (postId) => {
    if (!adminUser) return;
    const { error } = await adminDashboardService.rejectPost(postId, adminUser.id, 'Post does not meet community standards');
    if (error) {
      Alert.alert('Failed', error.message || 'Could not reject post');
      return;
    }
    await loadAll(false);
  };

  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const results = await adminDashboardService.searchUsers(searchTerm.trim());
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Search Failed', error.message || 'Unable to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, shouldBan) => {
    if (!adminUser || !userId) return;
    setLoading(true);
    try {
      const result = shouldBan
        ? await adminDashboardService.banUser(userId, adminUser.id, 'Actioned by admin')
        : await adminDashboardService.unbanUser(userId, adminUser.id);
      if (result.error) {
        throw result.error;
      }
      await loadAll(false);
    } catch (error) {
      Alert.alert('Action Failed', error.message || 'Could not update user status');
    } finally {
      setLoading(false);
    }
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

  const renderTab = (label) => (
    <TouchableOpacity
      key={label}
      style={[styles.tabButton, selectedTab === label ? styles.tabButtonActive : null]}
      onPress={() => setSelectedTab(label)}
    >
      <Text style={[styles.tabButtonText, selectedTab === label ? styles.tabButtonTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderOverview = () => (
    <>
      <View style={styles.statsRow}>
        <StatCard label="Pending Reports" value={pendingReports.length} tone="danger" />
        <StatCard label="Pending Verifications" value={pendingVerifications} tone="warning" />
        <StatCard label="Pending Photos" value={data.pendingPhotos.length} tone="info" />
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Pending Posts" value={data.pendingPosts.length} tone="danger" />
        <StatCard label="Escalated Support" value={data.escalatedSupport.length} tone="warning" />
        <StatCard label="Active Admins" value={data.adminTeam.length} tone="info" />
      </View>
    </>
  );

  const renderReportsSection = () => (
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
  );

  const renderPhotoQueue = () => (
    <Section title="Photo Approval Queue">
      {data.pendingPhotos.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>User: {shortId(item.user_id)}</Text>
          <Text style={styles.cardMeta}>{item.photo_type} • {item.status}</Text>
          <Text style={styles.cardBody}>{item.photo_url ? item.photo_url : 'No URL available'}</Text>
          <Text style={styles.time}>{fmt(item.created_at)}</Text>
          <View style={styles.actionsRow}>
            <SmallBtn text="Approve" onPress={() => handleApprovePhoto(item.id)} />
            <SmallBtn text="Reject" kind="muted" onPress={() => handleRejectPhoto(item.id)} />
          </View>
        </View>
      ))}
      {data.pendingPhotos.length === 0 ? <EmptyLine text="No pending photos" /> : null}
    </Section>
  );

  const renderPostQueue = () => (
    <Section title="Impress Post Queue">
      {data.pendingPosts.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>User: {shortId(item.user_id)}</Text>
          <Text style={styles.cardMeta}>Status: {item.status}</Text>
          <Text style={styles.cardBody}>{item.caption || 'No caption provided'}</Text>
          <Text style={styles.time}>{fmt(item.created_at)}</Text>
          <View style={styles.actionsRow}>
            <SmallBtn text="Approve" onPress={() => handleApprovePost(item.id)} />
            <SmallBtn text="Reject" kind="muted" onPress={() => handleRejectPost(item.id)} />
          </View>
        </View>
      ))}
      {data.pendingPosts.length === 0 ? <EmptyLine text="No pending posts" /> : null}
    </Section>
  );

  const renderSupportQueue = () => (
    <Section title="Escalated Support Queue">
      {data.escalatedSupport.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>Conversation: {shortId(item.id)}</Text>
          <Text style={styles.cardMeta}>User: {shortId(item.user_id)} • {item.category}</Text>
          <Text style={styles.cardBody}>Status: {item.status}</Text>
          <Text style={styles.time}>{fmt(item.created_at)}</Text>
        </View>
      ))}
      {data.escalatedSupport.length === 0 ? <EmptyLine text="No escalated conversations" /> : null}
    </Section>
  );

  const renderUserManagement = () => {
    const results = searchResults.length > 0 ? searchResults : data.users;
    return (
      <Section title="User Management">
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <SmallBtn text="Search" onPress={handleSearchUsers} />
        </View>
        {results.map((user) => (
          <View key={user.id} style={styles.card}>
            <Text style={styles.cardTitle}>{user.full_name || user.email}</Text>
            <Text style={styles.cardMeta}>{user.email}</Text>
            <Text style={styles.cardBody}>Trust: {user.trust_score ?? '—'} · Status: {user.is_banned ? 'Banned' : 'Active'}</Text>
            <Text style={styles.time}>{fmt(user.created_at)}</Text>
            <View style={styles.actionsRow}>
              <SmallBtn
                text={user.is_banned ? 'Unban' : 'Ban'}
                onPress={() => handleBanUser(user.id, !user.is_banned)}
              />
            </View>
          </View>
        ))}
        {results.length === 0 ? <EmptyLine text="No matching users" /> : null}
      </Section>
    );
  };

  const renderTeamSettings = () => (
    <Section title="Admin Team Settings">
      {data.adminTeam.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.role.toUpperCase()}</Text>
          <Text style={styles.cardMeta}>User ID: {shortId(item.user_id)}</Text>
          <Text style={styles.cardBody}>Active: {item.is_active ? 'Yes' : 'No'}</Text>
          <Text style={styles.time}>{fmt(item.created_at)}</Text>
        </View>
      ))}
      {data.adminTeam.length === 0 ? <EmptyLine text="No admin team members found" /> : null}
    </Section>
  );

  const renderActivityLog = () => (
    <Section title="Activity Log">
      {data.activityLog.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.action}</Text>
          <Text style={styles.cardMeta}>{item.target_type || 'none'}</Text>
          <Text style={styles.cardBody}>{item.details ? JSON.stringify(item.details) : 'No details'}</Text>
          <Text style={styles.time}>{fmt(item.created_at)}</Text>
        </View>
      ))}
      {data.activityLog.length === 0 ? <EmptyLine text="No activity logged yet" /> : null}
    </Section>
  );

  const sectionContent = (() => {
    switch (selectedTab) {
      case 'Overview':
        return renderOverview();
      case 'Reports':
        return renderReportsSection();
      case 'Photos':
        return renderPhotoQueue();
      case 'Posts':
        return renderPostQueue();
      case 'Support':
        return renderSupportQueue();
      case 'Users':
        return renderUserManagement();
      case 'Team':
        return renderTeamSettings();
      case 'Activity':
        return renderActivityLog();
      default:
        return renderOverview();
    }
  })();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>{adminUser.email} ({adminUser.role})</Text>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.tabBar} showsHorizontalScrollIndicator={false}>
        {['Overview', 'Reports', 'Photos', 'Posts', 'Support', 'Users', 'Team', 'Activity'].map(renderTab)}
      </ScrollView>

      {sectionContent}
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
  tabBar: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  tabButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  tabButtonActive: { backgroundColor: '#0f766e' },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  tabButtonTextActive: { color: '#ffffff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
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
