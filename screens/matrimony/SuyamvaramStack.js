const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');
const SuyamvaramScreen = require('../../src/screens/main/SuyamvaramScreen');
const CreateSuyamvaramScreen = require('../../src/screens/main/CreateSuyamvaramScreen');

const Stack = createStackNavigator();

const SuyamvaramStack = () => (
  <Stack.Navigator
    initialRouteName="SuyamvaramMain"
    screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.background } }}
  >
    <Stack.Screen name="SuyamvaramMain" component={SuyamvaramScreen} />
    <Stack.Screen name="CreateSuyamvaram" component={CreateSuyamvaramScreen} />
  </Stack.Navigator>
);

module.exports = SuyamvaramStack;
