const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const HomeScreen = require('../main/HomeScreen');
const Stack = createStackNavigator();

const DatingHomeStack = () => (
  <Stack.Navigator
    initialRouteName="DatingHome"
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="DatingHome" component={HomeScreen} />
  </Stack.Navigator>
);

module.exports = DatingHomeStack;
