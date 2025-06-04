// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from './NavigationService';
import SubscriptionCancelledBanner from '../components/SubscriptionCancelledBanner';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Modal Screens are now handled via component modals, not navigation

// Main App Screens
import LanguageLanding from '../screens/LanguageLanding';
import LanguageTutor from '../screens/LanguageTutorScreen'; // Updated to use the refactored component
import AudioTestScreen from '../screens/AudioTestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';

// Contexts
import { useAuth } from '../contexts/AuthContext';

// Types
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  ProfileStackParamList
} from '../types/navigation';
import colors from '../styles/colors';

// Create the navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['confluency://'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'auth/reset-password',
          Login: 'auth/login',
          Register: 'auth/register',
        },
      },
      Main: {
        screens: {
          Home: {
            screens: {
              LanguageLanding: 'home',
              LanguageTutor: 'tutor',
              AudioTest: 'audio-test',
            },
          },
          Profile: {
            screens: {
              ProfileMain: 'profile',
              EditProfile: 'profile/edit',
              Subscription: 'profile/subscription',
              PrivacyPolicy: 'profile/privacy',
              TermsOfService: 'profile/terms',
            },
          },
        },
      },
    },
  },
};

// Auth Navigator - Screens accessible before login
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Home Stack Navigator - Language learning screens
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="LanguageLanding" component={LanguageLanding} />
      <HomeStack.Screen name="LanguageTutor" component={LanguageTutor} />
      <HomeStack.Screen name="AudioTest" component={AudioTestScreen} />
    </HomeStack.Navigator>
  );
};

// Profile Stack Navigator - Profile-related screens
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Subscription" component={SubscriptionScreen} />
      <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <ProfileStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </ProfileStack.Navigator>
  );
};

// Main Tab Navigator - Main app tabs after login
const MainNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
        },
      })}
    >
      <MainTab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: 'Learn' }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </MainTab.Navigator>
  );
};

// Main App Navigator - Switches between Auth and Main based on login state
const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [shouldShowResetPassword, setShouldShowResetPassword] = useState(false);

  // Function to clear reset password flag - can be called by ResetPasswordScreen
  const clearResetPasswordFlag = () => {
    console.log('Clearing reset password flag');
    setShouldShowResetPassword(false);
  };

  // Check for reset password deep link on app start
  useEffect(() => {
    const checkInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('auth/reset-password')) {
          setShouldShowResetPassword(true);
        }
      } catch (error) {
        console.log('Error checking initial URL:', error);
      }
    };

    checkInitialURL();

    // Listen for incoming URLs while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url.includes('auth/reset-password')) {
        setShouldShowResetPassword(true);
      }
    });

    return () => subscription?.remove();
  }, []);
  
  // Only check subscription status when authenticated
  // Check every 24 hours (86400000 ms)
  const subscription = isAuthenticated ? 
    useSubscriptionStatus(86400000) : 
    { tier: 'free', expirationDate: null, isActive: false, isCancelled: false, loading: false, error: null };

  // Show a splash screen or loading indicator while auth state is being determined
  if (loading) {
    // You should replace this with a proper splash/loading screen
    return null;
  }
  
  // Helper to render the global subscription banner
  const renderNavigatorWithBanner = (navigator: React.ReactNode) => {
    const showBanner = subscription.isCancelled && subscription.expirationDate;
    
    if (!showBanner) {
      return navigator;
    }
    
    return (
      <View style={styles.container}>
        {/* Only show banner if subscription is cancelled but not expired */}
        <SubscriptionCancelledBanner
          expirationDate={subscription.expirationDate!}
          tier={subscription.tier}
        />
        {navigator}
      </View>
    );
  };

  // Navigation state logic:
  // 1. If reset password flow is active, always show Auth stack
  // 2. Otherwise, show Main if authenticated, Auth if not
  const shouldShowMain = isAuthenticated && !shouldShowResetPassword;
  
  console.log('RootNavigator: Navigation decision -', {
    isAuthenticated,
    shouldShowResetPassword,
    shouldShowMain,
    userId: user?.id
  });

  // Handle navigation based on auth state changes
  useEffect(() => {
    if (!loading && navigationRef.current) {
      const currentRoute = navigationRef.current.getCurrentRoute();
      
      if (shouldShowMain && currentRoute?.name !== 'Main') {
        // Only navigate to Main if not in reset password flow
        if (!shouldShowResetPassword) {
          console.log('Navigating to Main - user authenticated');
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }
      } else if (!shouldShowMain && currentRoute?.name !== 'Auth') {
        console.log('Navigating to Auth - user not authenticated');
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }
  }, [shouldShowMain, shouldShowResetPassword, loading]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName="Auth"
      >
        {/* Always include both screens but control navigation via initialRouteName */}
        <Stack.Screen 
          name="Main" 
          component={MainNavigator} 
          options={{
            animationEnabled: false
          }}
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          options={{
            animationEnabled: false
          }}
        />
        
        {/* Modal screens are now handled via component modals rather than navigation */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppNavigator;