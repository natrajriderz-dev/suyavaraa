// src/screens/auth/SplashScreen.js
const React = require('react');
const { View, Text, ActivityIndicator, Image } = require('react-native');
const { useState, useEffect } = React;
// SECURITY: Use SecureStore instead of AsyncStorage
const SecureStore = require('expo-secure-store');
const Colors = require('../../theme/Colors');
const AuthStyles = require('./AuthStyles');

const SplashScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        // We only check for the token now.
        const token = await SecureStore.getItemAsync('userToken');

        if (token) {
          // In a real app, confirm session with Supabase here
        }
        navigation.replace('Landing');
      } catch (error) {
        console.error('Session check error:', error);
        navigation.replace('Landing');
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  return (
    <View style={[AuthStyles.centerContainer, { backgroundColor: '#000' }]}>
      <View style={AuthStyles.logo}>
        <Image 
          source={require('../../../assets/logo.png')} 
          style={{ width: 250, height: 250, resizeMode: 'contain' }} 
        />
      </View>
      <Text style={[AuthStyles.subtitle, { color: Colors.primary, marginTop: -20 }]}>Find your perfect match</Text>
      {isLoading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
    </View>
  );
};

module.exports = SplashScreen;
