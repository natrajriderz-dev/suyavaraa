const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');
const CommunityScreen = require('./CommunityScreen');

const Stack = createStackNavigator();

const CommunityStack = () => (
  <Stack.Navigator
    initialRouteName="CommunityMain"
    screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.background } }}
  >
    <Stack.Screen name="CommunityMain" component={CommunityScreen} />
  </Stack.Navigator>
);

module.exports = CommunityStack;
