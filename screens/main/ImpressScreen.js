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
      if (!user) throw new Error('Not authenticated');

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
        if (!refresh && mappedPosts.length > 0) {
          setPage(currentPage + 1);
        }
      }
    } catch (error) {
      console.log('Load feed error:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      loadFeed();
    }
  };

  const handleReaction = async (postId, reactionType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const existingPost = posts.find(p => p.id === postId);
      const isRemoving = existingPost?.user_reaction?.type === reactionType;

      let newReactionData = null;

      if (isRemoving) {
        await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        const { data: reactionRow, error } = await supabase
          .from('post_reactions')
          .upsert({ post_id: postId, user_id: user.id, reaction_type: reactionType }, { onConflict: 'post_id,user_id' })
          .select().single();

        if (error) throw error;
        newReactionData = reactionRow;
      }

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const reactionCounts = { ...post.reaction_counts };
          if (post.user_reaction) {
            reactionCounts[post.user_reaction.type] = (reactionCounts[post.user_reaction.type] || 1) - 1;
          }
          if (newReactionData) {
            reactionCounts[newReactionData.reaction_type] = (reactionCounts[newReactionData.reaction_type] || 0) + 1;
          }
          return {
            ...post,
            user_reaction: newReactionData ? { id: newReactionData.id, type: newReactionData.reaction_type, created_at: newReactionData.created_at } : null,
            reaction_counts: reactionCounts
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Reaction error:', error.message);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: insertedPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: postData.caption,
          media_urls: postData.photo ? [postData.photo] : [],
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
    }
  };

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Impress</Text>
      </View>

      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onReaction={handleReaction}
            onUserPress={(userId) => navigation.navigate('Profile', { userId })}
          />
        )}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: Colors.background },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  switchButton: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  buttonText: { color: Colors.text, fontWeight: 'bold' },
});

module.exports = ImpressScreen;
