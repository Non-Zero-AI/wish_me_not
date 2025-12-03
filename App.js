import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Disable native screens for now to avoid Web crashes
enableScreens(false);

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { createDrawerNavigator } from '@react-navigation/drawer';
import { ActivityIndicator, View, Text, StyleSheet, StatusBar, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Font from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { getUser, saveUser, saveItems, saveFriends, clearUser } from './src/services/storage';
import { fetchUserInfo, getUserWishlist, getUserFriends } from './src/services/api';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ModalProvider, useModal } from './src/context/ModalContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AddWishModal from './src/components/AddWishModal';
import SideMenu from './src/components/SideMenu';
import WebSidebar from './src/components/WebSidebar';

import OnboardingScreen from './src/screens/OnboardingScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import UpdatePasswordScreen from './src/screens/UpdatePasswordScreen';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen'; 
import FriendsScreen from './src/screens/FriendsScreen';
import FriendWishlistScreen from './src/screens/FriendWishlistScreen';
import FriendRequestsScreen from './src/screens/FriendRequestsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import UserAgreementScreen from './src/screens/UserAgreementScreen';
import ThemesScreen from './src/screens/ThemesScreen';
import DMScreen from './src/screens/DMScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ListsScreen from './src/screens/ListsScreen';
import CommunitiesScreen from './src/screens/CommunitiesScreen';

const RootTabs = createBottomTabNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();
// const FriendsStack = createStackNavigator(); // Will replace with Tabs too if needed, but let's try just Root first.
// const ProfileStack = createStackNavigator(); 

// Actually, let's make ALL stacks into Tabs for safety, or just Root.
// FriendsStack and ProfileStack are nested. If Stack is broken, they will break too.
// So I should replace them or verify if nested stacks work.
// But let's start with Root.

const FriendsStack = createBottomTabNavigator();
const ProfileStack = createBottomTabNavigator();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      Onboarding: '',
      Main: {
        path: 'app',
        screens: {
          Home: 'home',
          FriendsStack: {
            path: 'friends',
            screens: {
              FriendsList: '',
              FriendWishlist: 'wishlist/:userId',
            }
          },
          ProfileStack: {
            path: 'profile',
            screens: {
              ProfileScreen: '',
              Themes: 'themes',
            }
          },
        },
      },
      PrivacyPolicy: 'privacy',
      UserAgreement: 'terms',
    },
  },
};

function FriendsStackScreen() {
  const { theme } = useTheme();
  return (
    <FriendsStack.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide tab bar to mimic Stack
        // headerStyle: { backgroundColor: theme.colors.surface },
        // headerTintColor: theme.colors.text,
      }}
    >
      <FriendsStack.Screen name="FriendsList" component={FriendsScreen} options={{ title: 'Friends' }} />
      <FriendsStack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ title: 'Requests' }} />
      <FriendsStack.Screen name="FriendWishlist" component={FriendWishlistScreen} />
    </FriendsStack.Navigator>
  );
}

function ProfileStackScreen() {
  const { theme } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide tab bar
        // headerStyle: { backgroundColor: theme.colors.surface },
        // headerTintColor: theme.colors.text,
      }}
    >
      <ProfileStack.Screen name="ProfileScreen" options={{ title: 'Profile' }}>
        {props => <ErrorBoundary><ProfileScreen {...props} /></ErrorBoundary>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Themes" component={ThemesScreen} />
    </ProfileStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  const { setAddModalVisible } = useModal();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      initialRouteName="ProfileStack"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'FriendsStack') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'ProfileStack') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'DMs') {
            iconName = focused ? 'mail' : 'mail-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          display: isDesktop ? 'none' : 'flex',
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: insets.bottom || 6,
          paddingTop: 4,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="FriendsStack" component={FriendsStackScreen} options={{ title: 'Friends' }} />
      
      {!isDesktop && (
        <Tab.Screen 
          name="Add" 
          component={View} 
          listeners={() => ({
              tabPress: (e) => {
                  e.preventDefault();
                  setAddModalVisible(true);
              },
          })}
          options={{
              tabBarIcon: ({ focused }) => (
                  <View style={{
                      width: 56, 
                      height: 56, 
                      borderRadius: 28, 
                      backgroundColor: theme.colors.primary, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginBottom: Platform.OS === 'ios' ? (insets.bottom || 10) : 16,
                      shadowColor: '#000',
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 5,
                      borderWidth: 4,
                      borderColor: theme.colors.surface
                  }}>
                      <Ionicons name="add" size={32} color="#fff" />
                  </View>
              ),
              tabBarLabel: () => null,
          }}
        />
      )}

      <Tab.Screen 
        name="DMs" 
        component={DMScreen} 
        options={{ 
            title: 'Messages',
            tabBarIcon: ({ focused, color, size }) => (
                <Ionicons name={focused ? "mail" : "mail-outline"} size={size} color={color} />
            )
        }} 
      />

      <Tab.Screen name="ProfileStack" component={ProfileStackScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading, passwordRecovery } = useAuth();
  const { theme, isDark } = useTheme();
  const { isAddModalVisible, setAddModalVisible } = useModal();
  const [showSplash, setShowSplash] = useState(false);
  const [splashShown, setSplashShown] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Adamina': require('./assets/Fonts/Adamina/Adamina-Regular.ttf'),
  });

  useEffect(() => {
    if (!isLoading && user && !splashShown) {
        setShowSplash(true); 
        setSplashShown(true);
        
        const runSequence = async () => {
            const minDelay = new Promise(resolve => setTimeout(resolve, 3500));
            
            const loadData = async () => {
                try {
                    console.log('Preloading data...');
                    const timeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Data load timeout')), 10000)
                    );

                    // Clear any cached data from a previous user/session
                    await clearUser();
                    await saveItems([]);
                    await saveFriends([]);

                    const fetchData = Promise.all([
                        fetchUserInfo(user.email).catch(() => null),
                        getUserWishlist(user.email).catch(() => []),
                        getUserFriends(user.email).catch(() => [])
                    ]);

                    const [userInfo, wishlist, friends] = await Promise.race([fetchData, timeout]);

                    if (userInfo) await saveUser({ ...userInfo, email: user.email });
                    if (wishlist) await saveItems(wishlist);
                    if (friends) await saveFriends(friends);
                    console.log('Preloading complete');
                } catch (e) {
                    console.warn('Preload failed', e);
                }
            };

            await Promise.all([minDelay, loadData()]);
            setDataReady(true);
        };

        runSequence();
    }
  }, [user, isLoading]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {showSplash && <SplashScreen dataReady={dataReady} onFinish={() => setShowSplash(false)} />}
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <NavigationContainer 
          // linking={linking} // Disabling linking to prevent URL updates and browser bar appearance
          // theme={theme} // Disabling theme prop to fix Web crash
          documentTitle={{
            formatter: () => 'Wish Me Not',
          }}
        >
          <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
             {isDesktop && user && <WebSidebar />}
             <View
               style={{ flex: 1 }}
               accessibilityRole={Platform.OS === 'web' ? 'main' : undefined}
             >
                <RootTabs.Navigator 
                  screenOptions={{ 
                    headerShown: false,
                    tabBarStyle: { display: 'none' }, // Hide tab bar for Root
                  }}
                >
                  {passwordRecovery ? (
                    <RootTabs.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
                  ) : user ? (
                    <RootTabs.Screen name="Main" component={MainTabs} />
                  ) : (
                    <RootTabs.Screen name="Auth" component={AuthNavigator} />
                  )}
                  <RootTabs.Screen 
                    name="PrivacyPolicy" 
                    component={PrivacyPolicyScreen} 
                  />
                  <RootTabs.Screen 
                    name="UserAgreement" 
                    component={UserAgreementScreen} 
                  />
                  <RootTabs.Screen name="Settings" component={SettingsScreen} />
                  <RootTabs.Screen name="Lists" component={ListsScreen} />
                  <RootTabs.Screen name="Communities" component={CommunitiesScreen} />
                </RootTabs.Navigator>
             </View>
          </View>

          {user && !isDesktop && (
            <>
                <AddWishModal 
                    visible={isAddModalVisible} 
                    onClose={() => setAddModalVisible(false)}
                    user={user}
                />
                <SideMenu />
            </>
          )}
          
          {user && isDesktop && (
               <AddWishModal 
                    visible={isAddModalVisible} 
                    onClose={() => setAddModalVisible(false)}
                    user={user}
                />
          )}
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModalProvider>
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
        </ModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
