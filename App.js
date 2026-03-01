<<<<<<< HEAD
const React = require('react');
const { NavigationContainer } = require('@react-navigation/native');
const { createStackNavigator } = require('@react-navigation/stack');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { useEffect, useState } = React;
const { View, ActivityIndicator, StyleSheet } = require('react-native');

const AuthStack = require('./screens/auth/AuthStack');
const OnboardingStack = require('./screens/onboarding/OnboardingStack');
const MainTabs = require('./screens/main/MainTabs');

const Stack = createStackNavigator();

const App = () => {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const verified = await AsyncStorage.getItem('is_verified');
      const onboarded = await AsyncStorage.getItem('onboarding_complete');
      if (userId && onboarded === 'true') setInitialRoute('Main');
      else if (userId && verified === 'true') setInitialRoute('Onboarding');
      else setInitialRoute('Auth');
    } catch (e) {
      setInitialRoute('Auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Onboarding" component={OnboardingStack} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

module.exports = App;
=======
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
>>>>>>> ecf766d0e8c43ffde3e2e2828897e39afd1f66f6
