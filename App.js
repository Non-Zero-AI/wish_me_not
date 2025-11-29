import React, { useState, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getUser } from './src/services/storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import OnboardingScreen from './src/screens/OnboardingScreen';
import MyListScreen from './src/screens/MyListScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendWishlistScreen from './src/screens/FriendWishlistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import UserAgreementScreen from './src/screens/UserAgreementScreen';
import ThemesScreen from './src/screens/ThemesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      Onboarding: '',
      Main: {
        path: 'app',
        screens: {
          MyList: 'mylist',
          Friends: 'friends',
          Profile: 'profile',
        },
      },
      FriendWishlist: 'wishlist/:userId',
      Themes: 'themes',
      PrivacyPolicy: 'privacy',
      UserAgreement: 'terms',
    },
  },
};

function MainTabs() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'MyList') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderNav,
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          paddingTop: 5,
        },
        tabBarButton: (props) => <TouchableOpacity {...props} />,
      })}
    >
      <Tab.Screen name="MyList" component={MyListScreen} options={{ title: 'My Wish List' }} />
      <Tab.Screen name="Friends" component={FriendsScreen} options={{ title: 'Friends' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { theme, isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
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
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen 
                  name="FriendWishlist" 
                  component={FriendWishlistScreen} 
                  options={{ headerShown: false }}
                />
              </>
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
            <Stack.Screen 
              name="Themes" 
              component={ThemesScreen} 
              options={{ headerShown: false }}
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
