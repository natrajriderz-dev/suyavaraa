const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const HomeScreen = require('../main/HomeScreen');
const Stack = createStackNavigator();

const MatrimonyHomeStack = () => (
  <Stack.Navigator
    initialRouteName="MatrimonyHome"
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="MatrimonyHome" component={HomeScreen} />
  </Stack.Navigator>
);

module.exports = MatrimonyHomeStack;
