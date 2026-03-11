// src/screens/main/HomeStack.js
const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../theme/Colors');
const HomeScreen = require('../../../screens/main/HomeScreen');
const FiltersScreen = require('./FiltersScreen');
const SuyamvaramScreen = require('../../screens/main/SuyamvaramScreen');

const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="HomeMain"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Suyamvaram" component={SuyamvaramScreen} />
      <Stack.Screen 
        name="Filters" 
        component={FiltersScreen}
        options={{
          presentation: 'modal',
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

module.exports = HomeStack;
