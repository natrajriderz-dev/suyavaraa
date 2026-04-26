const Notifications = require('expo-notifications');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { Platform } = require('react-native');
const { supabase } = require('../../supabase');

class NotificationService {
  constructor() {
    // Skip notification configuration on web
    if (Platform.OS !== 'web') {
      this.configure();
    }
  }

  configure() {
    // Skip on web
    if (Platform.OS === 'web') return;
    
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Set up notification categories for actions
    if (Platform.OS === 'ios') {
      Notifications.setNotificationCategoryAsync('match', [
        {
          identifier: 'view',
          buttonTitle: 'View Match',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    }

    // Handle notification response (user taps on notification)
    this.setupNotificationResponseListener();
  }

  setupNotificationResponseListener() {
    // Skip on web
    if (Platform.OS === 'web') return;
    
    // This listener is fired whenever a user taps on or interacts with a notification
    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { notification } = response;
        const data = notification.request.content.data;
        console.log('Notification response:', data);
        
        // Route user based on notification type
        this.handleNotificationNavigation(data);
      }
    );
  }

  handleNotificationNavigation(data) {
    // This method can be extended to handle deep linking based on notification type
    if (data?.type === 'match' && data?.userId) {
      console.log('Navigate to match profile:', data.userId);
      // Navigation will be handled by the component that uses this service
    } else if (data?.type === 'message' && data?.userId) {
      console.log('Navigate to chat:', data.userId);
    } else if (data?.type === 'suyamvaram' && data?.challengeId) {
      console.log('Navigate to challenge:', data.challengeId);
    }
  }

  removeNotificationListener() {
    if (this.notificationResponseListener) {
      Notifications.removeNotificationSubscription(this.notificationResponseListener);
    }
  }

  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  async getPushToken() {
    try {
      let token = null;
      
      // Get Expo push token
      const expoPushToken = await Notifications.getExpoPushTokenAsync();
      token = expoPushToken.data;

      // For Android, also get the native device token
      if (Platform.OS === 'android') {
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          console.log('Android device token:', deviceToken.data);
        } catch (error) {
          console.warn('Could not get Android device token:', error);
        }
      }

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async saveTokenToDatabase(userId, token) {
    if (!userId || !token) {
      console.warn('Missing userId or token for saving to database');
      return false;
    }

    try {
      // Update or insert the push token in the database
      const { error } = await supabase
        .from('notification_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving token to database:', error);
        return false;
      }

      console.log('Push token saved to database for user:', userId);
      return true;
    } catch (error) {
      console.error('Unexpected error saving token to database:', error);
      return false;
    }
  }

  async registerForPushNotifications(userId) {
    if (Platform.OS === 'web') return null;
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Push notification permission denied');
      return null;
    }

    const token = await this.getPushToken();
    if (token) {
      // Store token in AsyncStorage for persistence
      await AsyncStorage.setItem('pushToken', token);
      
      // Save token to Supabase database so backend can send notifications
      await this.saveTokenToDatabase(userId, token);
      
      console.log('Push notification registered successfully for user:', userId);
      return token;
    } else {
      console.warn('Failed to get push token');
    }

    return null;
  }

  async unregisterPushNotifications() {
    try {
      await AsyncStorage.removeItem('pushToken');
      this.removeNotificationListener();
      console.log('Push notifications unregistered');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  }

  async verifyAndRefreshToken(userId) {
    try {
      const storedToken = await AsyncStorage.getItem('pushToken');
      const currentToken = await this.getPushToken();

      if (currentToken && currentToken !== storedToken) {
        console.log('Token changed, updating...');
        await AsyncStorage.setItem('pushToken', currentToken);
        await this.saveTokenToDatabase(userId, currentToken);
      }

      return currentToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  async syncTokenWithDatabase(userId) {
    try {
      const token = await AsyncStorage.getItem('pushToken');
      if (token) {
        await this.saveTokenToDatabase(userId, token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error syncing token:', error);
      return false;
    }
  }

  async sendLocalNotification(title, body, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
  }

  async scheduleNotification(title, body, secondsFromNow, data = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: { seconds: secondsFromNow },
    });
  }

  // Database notifications
  async getNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async markAllAsRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        callback(payload.new);
      })
      .subscribe();
  }

  // Notification types for different app events
  async notifyMatch(matchUser) {
    await this.sendLocalNotification(
      'New Match! 💕',
      `You matched with ${matchUser.display_name}`,
      { type: 'match', userId: matchUser.id }
    );
  }

  async notifyMessage(fromUser, message) {
    await this.sendLocalNotification(
      `Message from ${fromUser.display_name}`,
      message.length > 50 ? message.substring(0, 50) + '...' : message,
      { type: 'message', userId: fromUser.id }
    );
  }

  async notifyInterest(fromUser) {
    await this.sendLocalNotification(
      'Someone is interested! 👋',
      `${fromUser.display_name} sent you an interest`,
      { type: 'interest', userId: fromUser.id }
    );
  }

  async notifySuyamvaramUpdate(challenge) {
    await this.sendLocalNotification(
      'Suyamvaram Update',
      `New application for "${challenge.title}"`,
      { type: 'suyamvaram', challengeId: challenge.id }
    );
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('notificationsEnabled');
      return enabled !== 'false'; // Default to true
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true;
    }
  }

  // Set notification preference
  async setNotificationsEnabled(enabled) {
    try {
      await AsyncStorage.setItem('notificationsEnabled', enabled.toString());
      if (!enabled) {
        // Cancel all scheduled notifications when disabled
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (error) {
      console.error('Error setting notification preference:', error);
    }
  }
}

module.exports = new NotificationService();