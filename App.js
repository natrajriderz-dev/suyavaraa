// App.js
const React = require('react');
const { NavigationContainer } = require('@react-navigation/native');
const { createStackNavigator } = require('@react-navigation/stack');
const { useEffect, useState } = React;
const { View, ActivityIndicator } = require('react-native');
const { supabase } = require('./supabase');
const { ModeProvider } = require('./context/ModeContext');
const ErrorBoundary = require('./src/components/shared/ErrorBoundary');

// Navigation Stacks
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
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('Session found, navigating to Main');
        setInitialRoute('Main');
      } else {
        console.log('No session found, navigating to Auth');
        setInitialRoute('Auth');
      }
    } catch (error) {
      console.error('Session check error:', error);
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
    <ErrorBoundary>
      <ModeProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthStack} />
            <Stack.Screen name="Onboarding" component={OnboardingStack} />
            <Stack.Screen name="Main" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </ModeProvider>
    </ErrorBoundary>
  );
};

module.exports = App;
