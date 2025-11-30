# Debugging Log - November 30, 2025

## Objective

Fix persistent `TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration'` crash on React Native Web build (Vercel).

## Current Status

- **Crash:** RESOLVED.
- **Cause:** Incompatibility between `react-native-web` and `@react-navigation/stack` (JS) or `@react-navigation/native-stack` (Native) when combined with `GestureHandlerRootView` or custom `theme` props in `NavigationContainer`.

## Change History & Experiments

### 1. Remove Reanimated & Drawer

- **Action:** Removed `react-native-reanimated` and `@react-navigation/drawer` from `package.json` and `App.js`.
- **Result:** Crash persisted.

### 2. Remove Gesture Handler & Switch to View

- **Action:** Replaced `GestureHandlerRootView` with `View` in `App.js`. Removed top-level imports.
- **Result:** Crash persisted.

### 3. Isolation Tests (The "DebugNav" Breakthrough)

- **Test A:** Render simple `View` ("System Check"). -> **WORKED**.
- **Test B:** Wrap in `SafeAreaProvider`. -> **WORKED**.
- **Test C:** Wrap in `NavigationContainer` + `Stack.Navigator` (JS). -> **FAILED** (Crash).
- **Test D:** Wrap in `NavigationContainer` + `Tab.Navigator`. -> **WORKED**.
  - *Crucial Finding:* `Tab.Navigator` works on Web. `Stack.Navigator` (JS) crashes.

### 4. Switch to Native Stack

- **Action:** Migrated to `@react-navigation/native-stack`.
- **Result:** Crash persisted.

### 5. "Tabs-as-Stack" Workaround (SUCCESS)

- **Action:** Replaced ALL `Stack.Navigator` instances (Root, Friends, Profile) with `Tab.Navigator` configured with `tabBarStyle: { display: 'none' }`.
- **Action:** Removed `GestureHandlerRootView` wrapper from `App.js`.
- **Action:** Removed `theme` prop from `NavigationContainer` (used default theme, components use `useTheme` context).
- **Result:** App works on Desktop Web and Mobile Web!

## Final Configuration

- **Navigators:** All `Tab.Navigator`.
- **Wrapper:** `SafeAreaProvider` -> `View` -> `NavigationContainer`.
- **Theme:** `NavigationContainer` uses default theme; App components use custom `ThemeContext`.
