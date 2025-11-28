import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme as baseTheme } from './colors';
import { themes } from './themes';

const THEME_MODE_KEY = '@app_theme_mode';
const THEME_ID_KEY = '@app_theme_id';

const ThemeContext = createContext({
  theme: baseTheme,
  isDark: false,
  currentThemeId: 'default',
  toggleTheme: () => {},
  setThemeId: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [currentThemeId, setCurrentThemeId] = useState('default');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Load Mode (Light/Dark)
        const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (savedMode !== null) {
          setIsDark(savedMode === 'dark');
        } else if (systemScheme) {
          setIsDark(systemScheme === 'dark');
        }

        // Load Theme ID
        const savedThemeId = await AsyncStorage.getItem(THEME_ID_KEY);
        if (savedThemeId && themes.some(t => t.id === savedThemeId)) {
          setCurrentThemeId(savedThemeId);
        }
      } catch (e) {
        console.error('Failed to load theme preferences', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, newIsDark ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  };

  const setThemeId = async (id) => {
    setCurrentThemeId(id);
    try {
      await AsyncStorage.setItem(THEME_ID_KEY, id);
    } catch (e) {
      console.error('Failed to save theme ID', e);
    }
  };

  // Construct the active theme object
  const activeThemeDef = themes.find(t => t.id === currentThemeId) || themes[0];
  const activeColors = isDark ? activeThemeDef.colors.dark : activeThemeDef.colors.light;

  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      ...activeColors,
    },
  };

  const value = {
    theme,
    isDark,
    currentThemeId,
    toggleTheme,
    setThemeId,
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
