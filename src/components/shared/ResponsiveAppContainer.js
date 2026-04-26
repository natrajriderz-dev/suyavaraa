// src/components/shared/ResponsiveAppContainer.js
const React = require('react');
const { View, StyleSheet, Platform, useWindowDimensions } = require('react-native');
const { useSafeAreaInsets } = require('react-native-safe-area-context');

const Colors = require('../../theme/Colors');

/**
 * ResponsiveAppContainer - Main app wrapper that provides
 * sidebar on web/tablet and full-screen on mobile
 */
const ResponsiveAppContainer = ({
  children,
  showSidebar = false,
  sidebarContent,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  const useSidebarLayout = isWeb || isWideScreen;

  if (useSidebarLayout && showSidebar) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.sidebarWrapper}>
          <View style={styles.sidebar}>
            {sidebarContent}
          </View>
        </View>
        <View style={styles.contentWrapper}>
          {children}
        </View>
      </View>
    );
  }

  // Mobile layout - full screen
  return (
    <View style={[styles.container, { paddingTop: isWeb ? 0 : insets.top }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  sidebarWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebar: {
    width: 100,
    backgroundColor: '#121212',
    borderRightWidth: 1,
    borderRightColor: '#1E1E1E',
  },
  contentWrapper: {
    flex: 1,
  },
});

module.exports = { ResponsiveAppContainer };