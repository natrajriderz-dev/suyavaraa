const React = require('react');
const { NavigationContainer } = require('@react-navigation/native');
const { createStackNavigator } = require('@react-navigation/stack');
const { useEffect, useState } = React;
const { View, ActivityIndicator } = require('react-native');
const { supabase } = require('./supabase');

const AuthStack = require('./screens/auth/AuthStack');
const OnboardingStack = require('./screens/onboarding/OnboardingStack');
const MainTabs = require('./screens/main/MainTabs');

const Stack = createStackNavigator();

const App = () => {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    // Check if testing mode is enabled and we should skip auth
    const testingMode = process.env.EXPO_PUBLIC_TESTING_MODE === 'true';
    
    if (testingMode) {
      console.log('Testing mode enabled');
      // In testing mode, we could auto-login, but for now keep the normal flow
      // Users can use the test phone number to bypass OTP
    }
    
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is already logged in
        console.log('Session found, navigating to Main');
        setInitialRoute('Main');
      } else {
        // No session, go to auth
        console.log('No session found, navigating to Auth');
        setInitialRoute('Auth');
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Fallback to auth on error
      setInitialRoute('Auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#D97706" />
    </View>
  );

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
