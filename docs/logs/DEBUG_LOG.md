# Debugging Log - November 30, 2025

## Objective
Fix persistent `TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration'` crash on React Native Web build (Vercel).

## Current Status
- **Crash:** Persists on app load (White screen).
- **Suspects:** `react-native-gesture-handler`, `react-native-reanimated`, `@react-navigation/stack` (JS or Native), `react-native-screens`, or `NavigationContainer` theme/props.

## Change History & Experiments

### 1. Remove Reanimated & Drawer
- **Action:** Removed `react-native-reanimated` and `@react-navigation/drawer` from `package.json` and `App.js`.
- **Result:** Crash persisted.
- **Conclusion:** Reanimated itself wasn't the sole cause, or artifacts remained.

### 2. Remove Gesture Handler & Switch to View
- **Action:** Replaced `GestureHandlerRootView` with `View` in `App.js`. Removed top-level imports.
- **Result:** Crash persisted.

### 3. Isolation Tests (The "DebugNav" Breakthrough)
- **Test A:** Render simple `View` ("System Check"). -> **WORKED**.
- **Test B:** Wrap in `SafeAreaProvider`. -> **WORKED**.
- **Test C:** Wrap in `NavigationContainer` + `Stack.Navigator` (JS). -> **FAILED** (Crash).
- **Test D:** Wrap in `NavigationContainer` + `Tab.Navigator`. -> **WORKED**.
    - *Crucial Finding:* `Tab.Navigator` works on Web. `Stack.Navigator` (JS) crashes (likely due to missing/broken Gesture Handler on Web).

### 4. Switch to Native Stack
- **Action:** Migrated to `@react-navigation/native-stack`.
- **Result:** Crash persisted.
- **Conclusion:** `native-stack` relies on `react-native-screens`, which can be buggy on Web even with `enableScreens(false)`.

### 5. "Tabs-as-Stack" Workaround (Current Strategy)
- **Action:** Replaced ALL `Stack.Navigator` instances (Root, Friends, Profile) with `Tab.Navigator` configured with `tabBarStyle: { display: 'none' }`.
- **Reason:** Since `Tab.Navigator` is verified to work, this mocks stack behavior without the crashing dependencies.
- **Current State:** 
    - `App.js` uses `RootTabs`.
    - `GestureHandlerRootView` is REMOVED.
    - `OnboardingScreen` is SIMPLIFIED (dummy view).
    - `theme` prop on `NavigationContainer` is COMMENTED OUT (pending verification).

## Next Steps
1. Verify if removing `theme` prop fixes the crash with `RootTabs`.
2. If fixed, restore `OnboardingScreen` content.
3. If fixed, verify `MainTabs` (Home/Friends/Profile) functionality.
4. Re-enable features one by one.
