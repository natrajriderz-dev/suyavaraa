// screens/main/TribesScreen.js
const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');
const TribesScreen = require('../../src/screens/main/TribesScreen');
const TribeInnerPage = require('../../src/screens/main/TribeInnerPage');

const Stack = createStackNavigator();

const TribesStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="TribesMain" component={TribesScreen} />
      <Stack.Screen name="TribeInner" component={TribeInnerPage} />
    </Stack.Navigator>
  );
};

module.exports = TribesStack;