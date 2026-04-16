// App.js
const React = require('react');
const { NavigationContainer } = require('@react-navigation/native');
const { createStackNavigator } = require('@react-navigation/stack');
const { useEffect, useState } = React;
const { View, ActivityIndicator } = require('react-native');
const { supabase } = require('./supabase');
const { ModeProvider } = require('./context/ModeContext');
const ErrorBoundary = require('./src/components/shared/ErrorBoundary');
const notificationService = require('./src/services/notificationService');
const decoyRequestScheduler = require('./src/jobs/decoyRequestScheduler');

// Navigation Stacks
const AuthStack = require('./screens/auth/AuthStack');
const OnboardingStack = require('./screens/onboarding/OnboardingStack');
const MainTabs = require('./screens/main/MainTabs');
const PremiumScreen = require('./src/screens/main/PremiumScreen');
const VideoVerificationScreen = require('./src/screens/auth/VideoVerificationScreen');
const VerificationSuccessScreen = require('./src/screens/auth/VerificationSuccessScreen');

const Stack = createStackNavigator();

const App = () => {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    checkSession();
    return () => {
      decoyRequestScheduler.stop();
    };
  }, []);

  const checkSession = async () => {
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('Session found, checking profile status');
        const { data: profile } = await supabase
          .from('users')
          .select('profile_complete')
          .eq('id', session.user.id)
          .single();

        if (profile?.profile_complete) {
          setInitialRoute('Main');
          // Register for push notifications when user is authenticated
          notificationService.registerForPushNotifications(session.user.id);
        } else {
          setInitialRoute('Onboarding');
        }

        // Start the decoy request scheduler — sends automated decoy requests to
        // unverified users to surface scammer behaviour (Fish Trap system).
        // The scheduler uses UNIQUE constraints so concurrent device runs are safe.
        decoyRequestScheduler.start();
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
            <Stack.Screen name="VideoVerification" component={VideoVerificationScreen} />
            <Stack.Screen name="VerificationSuccess" component={VerificationSuccessScreen} />
            <Stack.Screen name="Premium" component={PremiumScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </ModeProvider>
    </ErrorBoundary>
  );
};

module.exports = App;
