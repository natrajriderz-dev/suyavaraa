// App.js
const React = require('react');
const { NavigationContainer, createNavigationContainerRef } = require('@react-navigation/native');
const { createStackNavigator } = require('@react-navigation/stack');
const { useEffect, useState } = React;
const { View, ActivityIndicator, LogBox, Platform, StyleSheet } = require('react-native');
const { supabase } = require('./supabase');
const { ModeProvider } = require('./context/ModeContext');
const ErrorBoundary = require('./src/components/shared/ErrorBoundary');
const notificationService = require('./src/services/notificationService');
const decoyRequestScheduler = require('./src/jobs/decoyRequestScheduler');

// Navigation Stacks
const AuthStack = require('./screens/auth/AuthStack');
const OnboardingStack = require('./screens/onboarding/OnboardingStack');
const DatingTabs = require('./screens/dating/DatingTabs');
const MatrimonyTabs = require('./screens/matrimony/MatrimonyTabs');
const PremiumScreen = require('./src/screens/main/PremiumScreen');
const { useMode } = require('./context/ModeContext');

const Stack = createStackNavigator();

LogBox.ignoreLogs([
  'Method getInfoAsync imported from "expo-file-system" is deprecated.',
]);

const navigationRef = createNavigationContainerRef();

const App = () => {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');
  const [onboardingScreen, setOnboardingScreen] = useState('BasicInfo');

  useEffect(() => {
    checkSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setInitialRoute('Auth');
        if (navigationRef.isReady()) {
          navigationRef.reset({ index: 0, routes: [{ name: 'Auth' }] });
        }
      }
      if (event === 'PASSWORD_RECOVERY') {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('Auth', { screen: 'ResetPassword' });
          }
        }, 500);
      }
    });

    return () => {
      decoyRequestScheduler.stop();
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const checkSession = async () => {
    try {
      console.log('Checking session...');
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = data?.session;

      if (!session) {
        console.log('No session, routing to Auth');
        setInitialRoute('Auth');
        return;
      }

      console.log('Session found for user:', session.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('profile_complete, onboarding_step, role')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.warn('Profile fetch error:', profileError.message);
      }

      if (!profile?.profile_complete) {
        const step = profile?.onboarding_step || 'BasicInfo';
        console.log('Profile incomplete, routing to:', step);
        setOnboardingScreen(step);
        setInitialRoute('Onboarding');
      } else {
        console.log('Fully onboarded, routing to Main');
        setInitialRoute('Main');
        notificationService.registerForPushNotifications(session.user.id);
      }

      // Only start decoy scheduler for admins to avoid 403 errors for regular users
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        console.log('Admin detected, starting decoy request scheduler');
        decoyRequestScheduler.start();
      }
    } catch (error) {
      console.error('CRITICAL: Session check error:', error);
      setInitialRoute('Auth');
    } finally {
      setLoading(false);
      console.log('Session check complete');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ModeProvider>
        <View style={appStyles.webWrapper}>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Auth" component={AuthStack} />
              <Stack.Screen 
                name="Onboarding" 
                component={OnboardingStack} 
                initialParams={{ screen: onboardingScreen }} 
              />
              <Stack.Screen name="Main" component={MainTabsRouter} />
              <Stack.Screen name="Premium" component={PremiumScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </ModeProvider>
    </ErrorBoundary>
  );
};

const MainTabsRouter = () => {
  const { activeMode } = useMode();
  return activeMode === 'matrimony' ? <MatrimonyTabs /> : <DatingTabs />;
};

const appStyles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    alignSelf: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? '0px 0px 30px rgba(0,0,0,0.6)' : undefined,
  },
  webContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  webSidebar: {
    width: Platform.OS === 'web' ? 80 : 0,
    backgroundColor: '#121212',
  },
  webContent: {
    flex: 1,
  }
});

module.exports = App;
