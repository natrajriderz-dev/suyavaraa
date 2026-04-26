// src/utils/platformUtils.js
const { Platform, Linking, Share, Alert, Dimensions } = require('react-native');

/**
 * Platform utilities for handling web vs mobile differences
 */
const platformUtils = {
  /**
   * Check if running on web
   */
  isWeb: Platform.OS === 'web',

  /**
   * Check if running on iOS
   */
  isIOS: Platform.OS === 'ios',

  /**
   * Check if running on Android
   */
  isAndroid: Platform.OS === 'android',

  /**
   * Get current platform
   */
  get OS() {
    return Platform.OS;
  },

  /**
   * Get screen dimensions
   */
  get screen() {
    return Dimensions.get('window');
  },

  /**
   * Check if device is tablet
   */
  get isTablet() {
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    return minDimension >= 768;
  },

  /**
   * Check if device is desktop (web only)
   */
  get isDesktop() {
    return Platform.OS === 'web' && this.screen.width >= 1024;
  },

  /**
   * Open URL in external browser
   */
  openURL: async (url) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      console.warn('Cannot open URL:', url);
      return false;
    } catch (error) {
      console.error('Error opening URL:', error);
      return false;
    }
  },

  /**
   * Share content
   */
  share: async (content) => {
    try {
      if (Platform.OS === 'web') {
        // Web sharing using clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(content.text || '');
          Alert.alert('Copied!', 'Content copied to clipboard');
        }
        return true;
      } else {
        const result = await Share.share({
          message: content.text || '',
          title: content.title || '',
          url: content.url,
        });
        return result.action === Share.sharedAction;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  },

  /**
   * Get safe area insets (stub for web)
   */
  getSafeAreaInsets: () => {
    if (Platform.OS === 'web') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    // For native, this would use react-native-safe-area-context
    return { top: 0, right: 0, bottom: 0, left: 0 };
  },

  /**
   * Platform-specific styling
   */
  select: (options) => {
    if (options.web !== undefined && Platform.OS === 'web') {
      return options.web;
    }
    if (options.ios !== undefined && Platform.OS === 'ios') {
      return options.ios;
    }
    if (options.android !== undefined && Platform.OS === 'android') {
      return options.android;
    }
    return options.default;
  },

  /**
   * Get platform-specific value
   */
  get: (key, fallback) => {
    const platformKey = Platform.OS;
    if (key === platformKey) {
      return fallback;
    }
    return undefined;
  },
};

module.exports = platformUtils;