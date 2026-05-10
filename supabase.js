const { AppState } = require('react-native');
require('react-native-url-polyfill/auto');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { createClient } = require('@supabase/supabase-js');

// SECURITY: Credentials must come from environment variables only.
// Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY via EAS Secrets
// or your .env file. Never hardcode keys in source code.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseProjectHost = supabaseUrl
  ? supabaseUrl.replace(/^https?:\/\//, '')
  : 'unknown';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ CRITICAL: Supabase credentials missing. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

module.exports = {
  supabase,
  supabaseConfig: {
    url: supabaseUrl,
    projectHost: supabaseProjectHost,
  },
};
