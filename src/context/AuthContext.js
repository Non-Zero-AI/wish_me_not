import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Alert, Platform } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { clearUser, saveItems, saveFriends } from '../services/storage';

// Helper to show alerts that works on both web and native
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const AuthContext = createContext({
  user: null,
  isLoading: true,
  passwordRecovery: false,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  resetPasswordRecoveryState: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const upsertProfileFromAuthUser = async (authUser) => {
    if (!authUser) return;

    try {
      const { id, email, user_metadata } = authUser;
      const firstName =
        user_metadata?.first_name ||
        user_metadata?.given_name ||
        user_metadata?.name?.split(' ')[0] ||
        '';
      const lastName =
        user_metadata?.last_name ||
        user_metadata?.family_name ||
        (user_metadata?.name ? user_metadata.name.split(' ').slice(1).join(' ') : '') ||
        '';
      const username =
        user_metadata?.username ||
        (email ? email.split('@')[0] : '') ||
        undefined;
      const avatarUrl = user_metadata?.avatar_url || null;

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id,
            email,
            first_name: firstName,
            last_name: lastName,
            username,
            avatar_url: avatarUrl,
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Profile upsert from auth user failed:', error);
      }
    } catch (err) {
      console.error('Unexpected error syncing profile from auth user:', err);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        upsertProfileFromAuthUser(currentUser).catch(console.error);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }

      // Keep profile table in sync with auth user (email/password + Google)
      if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        upsertProfileFromAuthUser(currentUser).catch(console.error);
      }

      // Register for push notifications if logged in
      if (currentUser) {
        registerForPushNotificationsAsync(currentUser.id).catch(console.error);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetPasswordRecoveryState = () => {
    setPasswordRecovery(false);
  };

  const signUp = async ({ email, password, firstName, lastName, username }) => {
    setIsLoading(true);
    try {
      console.log('Starting sign up for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username,
          },
        },
      });

      if (error) {
        console.error('Supabase auth.signUp error:', error);
        throw error;
      }

      console.log('Auth signUp response:', data);

      // If we got a user back, manually create their profile row
      // (in case the database trigger is missing)
      if (data?.user?.id) {
        console.log('Creating profile for user:', data.user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            username: username,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here - auth succeeded, profile can be created later
        } else {
          console.log('Profile created successfully');
        }
      }

      return data;
    } catch (error) {
      console.error('Sign Up Error:', error.message);
      showAlert('Sign Up Failed', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login Error:', error.message);
        showAlert('Login Failed', error.message);
        return { user: null, error };
      }

      return { user: data?.user ?? null, error: null };
    } catch (err) {
      console.error('Login Error (unexpected):', err.message);
      showAlert('Login Failed', 'An unexpected error occurred. Please try again.');
      return { user: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Always use production URL for OAuth redirect
      const PRODUCTION_URL = 'https://wishmenot.app';
      const redirectUrl = Platform.OS === 'web' 
        ? PRODUCTION_URL 
        : 'wishmenot://auth/callback';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('Google Sign In Error:', error.message);
        showAlert('Google Sign In Failed', error.message);
        return { error };
      }

      return { data };
    } catch (err) {
      console.error('Google Sign In Error (unexpected):', err.message);
      showAlert('Google Sign In Failed', 'An unexpected error occurred.');
      return { error: err };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      await clearUser();
      await saveItems([]);
      await saveFriends([]);
    } catch (error) {
      console.error('Logout Error:', error.message);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        passwordRecovery,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPasswordRecoveryState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
