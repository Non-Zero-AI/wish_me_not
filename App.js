import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initLogger } from './src/services/logger';

// Initialize remote logging
initLogger();

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { getUser, saveUser, saveItems, saveFriends } from './src/services/storage';
import { fetchUserInfo, getUserWishlist, getUserFriends } from './src/services/api';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';

import OnboardingScreen from './src/screens/OnboardingScreen';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen'; 
import FriendsScreen from './src/screens/FriendsScreen';
import FriendWishlistScreen from './src/screens/FriendWishlistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import UserAgreementScreen from './src/screens/UserAgreementScreen';
import ThemesScreen from './src/screens/ThemesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const FriendsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

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
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      }}
    >
      <FriendsStack.Screen name="FriendsList" component={FriendsScreen} options={{ title: 'Friends' }} />
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
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      }}
    >
      <ProfileStack.Screen name="ProfileScreen" options={{ title: 'Profile' }}>
        {props => <ErrorBoundary><ProfileScreen {...props} /></ErrorBoundary>}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="Themes" component={ThemesScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
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
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          paddingTop: 5,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="FriendsStack" component={FriendsStackScreen} options={{ title: 'Friends' }} />
      
      <Tab.Screen 
        name="Add" 
        component={View} 
        listeners={({ navigation }) => ({
            tabPress: (e) => {
                e.preventDefault();
                navigation.navigate('ProfileStack', { 
                    screen: 'ProfileScreen', 
                    params: { openModal: true } 
                });
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
                    marginBottom: Platform.OS === 'ios' ? 30 : 20,
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

      <Tab.Screen 
        name="DMs" 
        component={View} 
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
  const { user, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(false);
  const [splashShown, setSplashShown] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
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
    <SafeAreaProvider style={{ backgroundColor: theme.colors.background }}>
      {showSplash && <SplashScreen dataReady={dataReady} onFinish={() => setShowSplash(false)} />}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <NavigationContainer 
          linking={linking} 
          theme={theme}
          documentTitle={{
            formatter: () => 'Wish Me Not',
          }}
        >
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              headerStyle: {
                backgroundColor: theme.colors.surface,
              },
              headerTintColor: theme.colors.text,
            }}
          >
            {user ? (
              <Stack.Screen name="Main" component={MainTabs} />
            ) : (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen 
              name="PrivacyPolicy" 
              component={PrivacyPolicyScreen} 
              options={{ headerShown: true, title: 'Privacy Policy' }}
            />
            <Stack.Screen 
              name="UserAgreement" 
              component={UserAgreementScreen} 
              options={{ headerShown: true, title: 'User Agreement' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
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
