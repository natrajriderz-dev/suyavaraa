const React = require('react');
const { createContext, useState, useContext, useEffect } = React;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const ModeContext = createContext();

const ModeProvider = ({ children }) => {
  const [userMode, setUserMode] = useState('dating');
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('userMode');
      const premiumStatus = (await AsyncStorage.getItem('isPremium')) === 'true';
      
      if (savedMode) setUserMode(savedMode);
      setIsPremium(premiumStatus);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = async (newMode) => {
    // Premium check is handled in individual UI components for better UX feedback,
    // but we support the programmatic switch here.
    try {
      if (newMode !== 'dating' && newMode !== 'matrimony') return;
      
      await AsyncStorage.setItem('userMode', newMode);
      setUserMode(newMode);
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  const toggleMode = async () => {
    const nextMode = userMode === 'dating' ? 'matrimony' : 'dating';
    await switchMode(nextMode);
  };

  return (
    <ModeContext.Provider value={{ userMode, switchMode, toggleMode, isPremium, loading }}>
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
