const React = require('react');
const { createContext, useState, useContext, useEffect } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { supabase } = require('../supabase');
const { isOwnerUser } = require('../src/config/privilegedAccess');

const ModeContext = createContext();

const ModeProvider = ({ children }) => {
  const [userMode, setUserMode] = useState('dating');
  const [activeMode, setActiveMode] = useState('dating');
  const [isPremium, setIsPremium] = useState(false);
  const [isPrivilegedOwner, setIsPrivilegedOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('userMode');
      const savedActiveMode = await AsyncStorage.getItem('activeMode');
      const premiumStatus = (await AsyncStorage.getItem('isPremium')) === 'true';
      const { data: { user } } = await supabase.auth.getUser();
      const ownerAccount = isOwnerUser(user?.id);
      const normalizedMode = savedMode === 'matrimony' ? 'matrimony' : 'dating';
      
      setUserMode(normalizedMode);
      setIsPrivilegedOwner(ownerAccount);

      if (savedActiveMode === 'admin' && ownerAccount) {
        setActiveMode('admin');
      } else if (savedActiveMode === 'matrimony' || savedActiveMode === 'dating') {
        setActiveMode(savedActiveMode);
      } else {
        setActiveMode(normalizedMode);
      }

      if (ownerAccount) {
        setIsPremium(true);
        await AsyncStorage.setItem('isPremium', 'true');
      } else {
        setIsPremium(premiumStatus);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = async (newMode) => {
    try {
      if (!['dating', 'matrimony', 'admin'].includes(newMode)) return;

      if (newMode === 'admin') {
        if (!isPrivilegedOwner) return;
        await AsyncStorage.setItem('activeMode', 'admin');
        setActiveMode('admin');
        return;
      }

      await AsyncStorage.setItem('userMode', newMode);
      await AsyncStorage.setItem('activeMode', newMode);
      setUserMode(newMode);
      setActiveMode(newMode);
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  const toggleMode = async () => {
    const baseMode = userMode === 'matrimony' ? 'matrimony' : 'dating';
    const nextMode = baseMode === 'dating' ? 'matrimony' : 'dating';
    await switchMode(nextMode);
  };

  return (
    <ModeContext.Provider
      value={{
        userMode,
        activeMode,
        switchMode,
        toggleMode,
        isPremium,
        isPrivilegedOwner,
        loading,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
};

const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

module.exports = { ModeProvider, useMode };
