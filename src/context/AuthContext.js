import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, saveUser as saveUserToStorage } from '../services/storage';

const AuthContext = createContext({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await getUser();
      setUser(userData);
    } catch (e) {
      console.error('Auth check failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    setIsLoading(true);
    try {
      await saveUserToStorage(userData);
      setUser(userData);
    } catch (e) {
      console.error('Login failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // clear storage logic if needed, for now just state
      // await clearUserFromStorage(); 
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
