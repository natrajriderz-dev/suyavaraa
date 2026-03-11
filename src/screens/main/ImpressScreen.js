// src/screens/main/ImpressScreen.js
const React = require('react');
const {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} = require('react-native');
const { useState, useEffect } = React;
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../../../supabase');
const { useMode } = require('../../context/ModeContext');
const Colors = require('../../theme/Colors');
const PostCard = require('../../components/impress/PostCard');
const CreatePostModal = require('../../components/modals/CreatePostModal');
const { uploadMedia } = require('../../utils/mediaUtils');

const ImpressScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { userMode } = useMode();

  useEffect(() => {
    if (userMode === 'dating') {
      loadFeed(true);
    } else {
      setLoading(false);
    }
  }, [userMode]);

  const loadFeed = async (refresh = false) => {
    if (refresh) {
      setPage(0);
      setHasMore(true);
    }
    const currentPage = refresh ? 0 : page;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id, caption, media_urls, tribe_tags, visibility, created_at,
          user:user_id (id, full_name, city, trust_level, user_profiles(primary_photo_url)),
          post_reactions (*),
          my_reaction:post_reactions(id, reaction_type, created_at)
        `)
        .eq('my_reaction.user_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentPage * 10, (currentPage + 1) * 10 - 1);

      if (error) throw error;

      if (postsData) {
        const mappedPosts = postsData.map(post => {
          const reaction_counts = { total: 0 };
          (post.post_reactions || []).forEach(r => {
            reaction_counts[r.reaction_type] = (reaction_counts[r.reaction_type] || 0) + 1;
            reaction_counts.total++;
          });

          return {
            id: post.id,
            user_id: post.user.id,
            user: {
              display_name: post.user.full_name,
              location: post.user.city,
              trust_level: post.user.trust_level,
              profile_picture_url: post.user.user_profiles?.[0]?.primary_photo_url || null
            },
            caption: post.caption,
            media_urls: post.media_urls,
            tribe_tags: post.tribe_tags,
            visibility: post.visibility,
            created_at: post.created_at,
            reaction_counts,
            user_reaction: post.my_reaction && post.my_reaction.length > 0 ? {
              id: post.my_reaction[0].id,
              type: post.my_reaction[0].reaction_type,
              created_at: post.my_reaction[0].created_at
            } : null
          };
        });

        setPosts(prev => refresh ? mappedPosts : [...prev, ...mappedPosts]);
        setHasMore(mappedPosts.length === 10);
        if (!refresh && mappedPosts.length > 0) setPage(currentPage + 1);
      }
    } catch (error) {
      console.log('Load feed error:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let mediaUrls = [];
      if (postData.photo) {
        const fileName = `post_${user.id}_${Date.now()}.jpg`;
        const uploadedUrl = await uploadMedia(postData.photo.uri, 'posts', fileName);
        if (uploadedUrl) mediaUrls = [uploadedUrl];
      }

      const { data: insertedPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: postData.caption,
          media_urls: mediaUrls,
          tribe_tags: postData.tribe_tags,
          visibility: postData.visibility
        })
        .select(`
          id, caption, media_urls, tribe_tags, visibility, created_at,
          user:user_id (id, full_name, city, trust_level, user_profiles(primary_photo_url))
        `)
        .single();

      if (error) throw error;

      const newPostObj = {
        id: insertedPost.id,
        user_id: insertedPost.user.id,
        user: {
          display_name: insertedPost.user.full_name,
          profile_picture_url: insertedPost.user.user_profiles?.[0]?.primary_photo_url || null,
          trust_level: insertedPost.user.trust_level,
          location: insertedPost.user.city
        },
        caption: insertedPost.caption,
        media_urls: insertedPost.media_urls,
        reaction_counts: { total: 0 },
        user_reaction: null,
        created_at: insertedPost.created_at
      };

      setPosts(prev => [newPostObj, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Create post error:', error.message);
      Alert.alert('Error', 'Failed to create post');
      throw error; // Re-throw for modal to handle loading state
    }
  };

  // ... (rest of the component remains similar)
  const handleRefresh = () => { setRefreshing(true); loadFeed(true); };
  const handleLoadMore = () => { if (hasMore && !loadingMore) { setLoadingMore(true); loadFeed(); } };
  const handleReaction = async (postId, type) => { /* reaction logic */ };

  if (userMode === 'matrimony') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Impress Feed</Text>
        <Text style={styles.emptySubtext}>Available only in Dating mode.</Text>
        <TouchableOpacity style={styles.switchButton} onPress={() => navigation.navigate('ModeSelect')}>
          <Text style={styles.buttonText}>Switch Mode</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Impress</Text></View>
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard post={item} onReaction={handleReaction} onUserPress={(id) => navigation.navigate('Profile', { userId: id })} />
        )}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} /> : null}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}><Ionicons name="add" size={32} color="#fff" /></TouchableOpacity>
      <CreatePostModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onSubmit={handleCreatePost} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: Colors.background },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  switchButton: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  buttonText: { color: Colors.text, fontWeight: 'bold' },
});

module.exports = ImpressScreen;
