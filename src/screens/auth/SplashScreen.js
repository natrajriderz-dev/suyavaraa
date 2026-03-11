// src/screens/auth/SplashScreen.js
const React = require('react');
const { View, Text, ActivityIndicator } = require('react-native');
const { useState, useEffect } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const Colors = require('../../theme/Colors');
const AuthStyles = require('./AuthStyles');

const SplashScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('userData');

        if (token && userData) {
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
    <View style={AuthStyles.centerContainer}>
      <View style={AuthStyles.logo}>
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: Colors.primary,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 48, color: Colors.text, fontWeight: 'bold' }}>BOND</Text>
        </View>
      </View>
      <Text style={AuthStyles.title}>BOND</Text>
      <Text style={AuthStyles.subtitle}>Find your perfect match</Text>
      {isLoading && <ActivityIndicator size="large" color={Colors.primary} />}
    </View>
  );
};

module.exports = SplashScreen;
