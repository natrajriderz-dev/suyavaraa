const React = require('react');
const { createBottomTabNavigator } = require('@react-navigation/bottom-tabs');
const { StyleSheet } = require('react-native');
const { Ionicons } = require('@expo/vector-icons');

const DatingHomeStack = require('./DatingHomeStack');
const DatingChatStack = require('./DatingChatStack');
const DatingProfileStack = require('./DatingProfileStack');
const ImpressStack = require('./ImpressStack');
const TribesStack = require('./TribesStack');
const Colors = require('../../src/theme/Colors');

const Tab = createBottomTabNavigator();

const DatingTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#E91E63',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused, size }) => {
          let iconName = 'ellipse';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discovery') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Impress') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DatingHomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Discovery" component={TribesStack} options={{ tabBarLabel: 'Tribes' }} />
      <Tab.Screen name="Impress" component={ImpressStack} options={{ tabBarLabel: 'Impress' }} />
      <Tab.Screen name="Chat" component={DatingChatStack} options={{ tabBarLabel: 'Matches' }} />
      <Tab.Screen name="Profile" component={DatingProfileStack} options={{ tabBarLabel: 'Profile' }} />
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

module.exports = DatingTabs;
