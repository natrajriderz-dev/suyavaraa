// screens/auth/AuthStack.js
const React = require('react');
const { createStackNavigator } = require('@react-navigation/stack');
const Colors = require('../../src/theme/Colors');

// Import screens from modularized paths
const SplashScreen = require('../../src/screens/auth/SplashScreen');
const LandingScreen = require('../../src/screens/auth/LandingScreen');
const LoginScreen = require('../../src/screens/auth/LoginScreen');
const SignupScreen = require('../../src/screens/auth/SignupScreen');
const BasicInfoScreen = require('../../src/screens/auth/BasicInfoScreen');

const Stack = createStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
        cardStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="BasicInfo"
        component={BasicInfoScreen}
        options={{ title: 'Profile Info' }}
      />
    </Stack.Navigator>
  );
};

module.exports = AuthStack;
