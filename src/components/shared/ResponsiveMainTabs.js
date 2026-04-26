// src/components/shared/ResponsiveMainTabs.js
const React = require('react');
const { View, TouchableOpacity, Text, StyleSheet, Platform, useWindowDimensions } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');
const { useSafeAreaInsets } = require('react-native-safe-area-context');

const { useMode } = require('../../context/ModeContext');
const Colors = require('../../theme/Colors');

/**
 * ResponsiveMainTabs - Navigation component that provides
 * sidebar on web/tablet and bottom tabs on mobile
 */
const ResponsiveMainTabs = ({
  navigation,
  activeTab = 'Home',
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { userMode, activeMode, isPrivilegedOwner } = useMode();

  const isWeb = Platform.OS === 'web';
  const isWideScreen = width >= 768;
  const useSidebar = isWeb || isWideScreen;

  // Branding Colors
  const activeColor = isPrivilegedOwner && activeMode === 'admin' 
    ? '#0f766e' 
    : (activeMode === 'matrimony' ? '#D4A017' : '#E91E63');
  const inactiveColor = '#8E8E93';

  // Tab configuration
  const tabs = [
    {
      name: 'Home',
      label: 'Home',
      activeIcon: 'home',
      inactiveIcon: 'home-outline',
      component: 'HomeStack',
    },
    {
      name: 'Discovery',
      label: userMode === 'dating' ? 'Tribes' : 'Zones',
      activeIcon: 'people',
      inactiveIcon: 'people-outline',
      component: 'TribesStack',
    },
    {
      name: 'Feature',
      label: isPrivilegedOwner && activeMode === 'admin' 
        ? 'ADMIN' 
        : (userMode === 'dating' ? 'IMPRESS' : 'SUYAMVARAM'),
      activeIcon: isPrivilegedOwner && activeMode === 'admin' 
        ? 'shield-checkmark' 
        : (userMode === 'dating' ? 'flash' : 'ribbon'),
      inactiveIcon: isPrivilegedOwner && activeMode === 'admin' 
        ? 'shield-checkmark-outline' 
        : (userMode === 'dating' ? 'flash-outline' : 'ribbon-outline'),
      component: isPrivilegedOwner && activeMode === 'admin' ? 'AdminScreen' : (userMode === 'dating' ? 'ImpressScreen' : 'SuyamvaramScreen'),
    },
    {
      name: 'Chat',
      label: 'Matches',
      activeIcon: 'chatbubbles',
      inactiveIcon: 'chatbubbles-outline',
      component: 'ChatStack',
    },
    {
      name: 'ProfileTab',
      label: 'Profile',
      activeIcon: 'person',
      inactiveIcon: 'person-outline',
      component: 'ProfileStack',
    },
  ];

  const handleTabPress = (tabName) => {
    const tab = tabs.find(t => t.name === tabName);
    if (tab) {
      navigation.navigate(tab.component);
    }
  };

  // Sidebar layout for web/tablet
  if (useSidebar) {
    return (
      <View style={[styles.sidebarContainer, { paddingTop: insets.top || 20 }]}>
        <View style={styles.sidebar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.sidebarItem,
                activeTab === tab.name && styles.sidebarItemActive,
                activeTab === tab.name && { borderLeftColor: activeColor },
              ]}
              onPress={() => handleTabPress(tab.name)}
            >
              <Ionicons
                name={activeTab === tab.name ? tab.activeIcon : tab.inactiveIcon}
                size={24}
                color={activeTab === tab.name ? activeColor : inactiveColor}
              />
              <Text
                style={[
                  styles.sidebarLabel,
                  activeTab === tab.name && { color: activeColor, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Bottom tabs for mobile
  return (
    <View style={[styles.bottomTabsContainer, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tabItem}
          onPress={() => handleTabPress(tab.name)}
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
              activeTab === tab.name && { color: activeColor, fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Sidebar styles
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebar: {
    width: 100,
    backgroundColor: '#121212',
    paddingVertical: 20,
    borderRightWidth: 1,
    borderRightColor: '#1E1E1E',
  },
  sidebarItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sidebarLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
  },
  // Bottom tabs styles
  bottomTabsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-around',
    elevation: 8,
    boxShadow: '0px -2px 4px rgba(0,0,0,0.1)',
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

module.exports = { ResponsiveMainTabs };