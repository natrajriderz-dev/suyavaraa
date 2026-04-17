// screens/main/MainTabs.js
const React = require('react');
const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
const { Text, View, StyleSheet } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');

const HomeStack = require('../../src/screens/main/HomeStack');
const ChatStack = require('./ChatStack');
const ImpressScreen = require('./ImpressScreen');
const TribesStack = require('./TribesScreen');
const ProfileStack = require('./ProfileStack');
const AdminScreen = require('./AdminScreen');
const SuyamvaramScreen = require('../../src/screens/main/SuyamvaramScreen');

const { useMode } = require('../../context/ModeContext');
const Colors = require('../../src/theme/Colors');

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { userMode, activeMode, isPrivilegedOwner } = useMode();
  const isAdminMode = activeMode === 'admin' && isPrivilegedOwner;

  // Branding Colors matching the guide
  const activeColor = isAdminMode ? '#0f766e' : (userMode === 'matrimony' ? '#D4A017' : '#E91E63'); // Teal for Admin
  const inactiveColor = '#8E8E93';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#ffffff', 
          borderTopWidth: 0.5, 
          borderTopColor: '#e5e5ea', 
          height: 60,
          paddingBottom: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -4 },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ 
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          )
        }} 
      />
      
      <Tab.Screen 
        name="Discovery" 
        component={TribesStack}
        options={{ 
          tabBarLabel: userMode === 'dating' ? 'Tribes' : 'Zones',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          )
        }} 
      />

      {/* Special Feature Tab (Tab 3) */}
      <Tab.Screen 
        name="Feature" 
        component={isAdminMode ? AdminScreen : (userMode === 'dating' ? ImpressScreen : SuyamvaramScreen)}
        options={{ 
          tabBarLabel: isAdminMode ? 'ADMIN' : (userMode === 'dating' ? 'IMPRESS' : 'SUYAMVARAM'),
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.specialTab, { backgroundColor: focused ? activeColor : inactiveColor + '20' }]}>
              <Ionicons 
                name={isAdminMode ? 'shield-checkmark' : (userMode === 'dating' ? 'flash' : 'ribbon')} 
                size={22} 
                color={focused ? '#fff' : color} 
              />
            </View>
          ),
          tabBarLabelStyle: { fontWeight: 'bold', color: activeColor }
        }} 
      />

      <Tab.Screen 
        name="Chat" 
        component={ChatStack}
        options={{ 
          tabBarLabel: 'Matches', 
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          )
        }} 
      />

      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          )
        }} 
      />

    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  specialTab: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  }
});

module.exports = MainTabs;
