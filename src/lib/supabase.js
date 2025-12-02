import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const SUPABASE_URL = 'https://ycjzbzynkjwmermsmnph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljanpienlua2p3bWVybXNtbnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ3ODYsImV4cCI6MjA4MDE1MDc4Nn0.hnfLhxLxJhCpMtg7ENpq--yj-INFgvXwcyE3efyz-YI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Let Supabase process OAuth redirects on web so Google sign-in works
    detectSessionInUrl: Platform.OS === 'web',
  },
  db: {
    schema: 'public',
  },
});

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

