import { DefaultTheme, DarkTheme } from '@react-navigation/native';

// Primitive Palette
const palette = {
  deepNavy: '#003049',
  crimsonRed: '#D62828',
  brightOrange: '#F77F00',
  goldenAmber: '#FCBF49',
  softCream: '#EAE2B7',
  offWhite: '#FDFCF5',
  white: '#FFFFFF',
  darkNavy: '#001D2E',
  navyGray: '#4A5D69',
  lightGray: '#A8B2B8',
  borderNavy: '#1A455C',
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.deepNavy,
    secondary: palette.brightOrange,
    accent: palette.crimsonRed,
    background: palette.softCream,
    surface: palette.offWhite,
    surfaceElevated: palette.white,
    text: palette.deepNavy,
    textSecondary: palette.navyGray,
    textInverse: palette.softCream,
    border: palette.goldenAmber,
    error: palette.crimsonRed,
    success: '#2A9D8F', // Complementary teal, good for success
    
    // Navigation
    card: palette.offWhite,
    borderNav: palette.goldenAmber,
    notification: palette.crimsonRed,
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 8,
    m: 12,
    l: 20,
    xl: 30,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' },
    h2: { fontSize: 24, fontWeight: '700' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 14, fontWeight: '400' },
  }
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.goldenAmber, // Gold pops on dark
    secondary: palette.brightOrange,
    accent: palette.crimsonRed,
    background: palette.deepNavy,
    surface: palette.darkNavy,
    surfaceElevated: palette.borderNavy,
    text: palette.softCream,
    textSecondary: palette.lightGray,
    textInverse: palette.deepNavy,
    border: palette.borderNavy,
    error: palette.crimsonRed,
    success: '#2A9D8F',

    // Navigation
    card: palette.darkNavy,
    borderNav: palette.borderNavy,
    notification: palette.crimsonRed,
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
};
