const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');
const ImpressScreen = require('../main/ImpressScreen');

const Stack = createStackNavigator();

const ImpressStack = () => (
  <Stack.Navigator
    initialRouteName="ImpressMain"
    screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.background } }}
  >
    <Stack.Screen name="ImpressMain" component={ImpressScreen} />
  </Stack.Navigator>
);

module.exports = ImpressStack;
