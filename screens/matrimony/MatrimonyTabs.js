const React = require('react');
const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
const { StyleSheet } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');

const MatrimonyHomeStack = require('./MatrimonyHomeStack');
const MatrimonyChatStack = require('./MatrimonyChatStack');
const MatrimonyProfileStack = require('./MatrimonyProfileStack');
const SuyamvaramStack = require('./SuyamvaramStack');
const ZonesStack = require('./ZonesStack');
const Colors = require('../../src/theme/Colors');

const Tab = createBottomTabNavigator();

const MatrimonyTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#D4A017',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName = 'ellipse';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discovery') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Suyamvaram') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={MatrimonyHomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Discovery" component={ZonesStack} options={{ tabBarLabel: 'Zones' }} />
      <Tab.Screen name="Suyamvaram" component={SuyamvaramStack} options={{ tabBarLabel: 'Suyamvaram' }} />
      <Tab.Screen name="Chat" component={MatrimonyChatStack} options={{ tabBarLabel: 'Matches' }} />
      <Tab.Screen name="Profile" component={MatrimonyProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5ea',
    height: 62,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

module.exports = MatrimonyTabs;
