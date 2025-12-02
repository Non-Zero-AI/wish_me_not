import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';
import { registerForPushNotificationsAsync } from '../services/notifications';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  passwordRecovery: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPasswordRecoveryState: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
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
      Alert.alert('Sign Up Failed', error.message);
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
        Alert.alert('Login Failed', error.message);
        return { user: null, error };
      }

      return { user: data?.user ?? null, error: null };
    } catch (err) {
      console.error('Login Error (unexpected):', err.message);
      Alert.alert('Login Failed', 'An unexpected error occurred. Please try again.');
      return { user: null, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
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
