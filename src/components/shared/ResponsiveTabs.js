// src/components/shared/ResponsiveTabs.js
const React = require('react');
const { View, TouchableOpacity, Text, StyleSheet, Platform, useWindowDimensions } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const { useSafeAreaInsets } = require('react-native-safe-area-context');

const Colors = require('../../theme/Colors');

/**
 * ResponsiveTabs - A navigation component that provides
 * bottom tabs on mobile and sidebar on web
 */
const ResponsiveTabs = ({
  tabs = [],
  activeTab,
  onTabPress,
  activeColor = Colors.primary,
  inactiveColor = '#8E8E93',
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;

  // Use sidebar on web/tablet, bottom tabs on mobile
  const useSidebar = isWeb || (width >= 1024);

  if (useSidebar) {
    return (
      <View style={[styles.sidebar, { paddingTop: insets.top || 20 }]}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.name}
            style={[
              styles.sidebarItem,
              activeTab === tab.name && styles.sidebarItemActive,
            ]}
            onPress={() => onTabPress(tab.name)}
          >
            <Ionicons
              name={activeTab === tab.name ? tab.activeIcon : tab.inactiveIcon}
              size={24}
              color={activeTab === tab.name ? activeColor : inactiveColor}
            />
            <Text
              style={[
                styles.sidebarLabel,
                activeTab === tab.name && { color: activeColor },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Mobile bottom tabs
  return (
    <View style={[styles.bottomTabs, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tabItem}
          onPress={() => onTabPress(tab.name)}
        >
          <View style={[
            styles.tabIconContainer,
            activeTab === tab.name && { backgroundColor: activeColor + '20' }
          ]}>
            <Ionicons
              name={activeTab === tab.name ? tab.activeIcon : tab.inactiveIcon}
              size={24}
              color={activeTab === tab.name ? activeColor : inactiveColor}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.name && { color: activeColor },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Sidebar styles (web/tablet)
  sidebar: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: Colors.primary + '15',
  },
  sidebarLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  // Bottom tabs styles (mobile)
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 60,
  },
  tabIconContainer: {
    padding: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
  },
});

module.exports = { ResponsiveTabs };