// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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

// Auth Navigator - Screens accessible before login
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
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
  const { isAuthenticated, loading } = useAuth();
  
  // Only check subscription status when authenticated
  // Check every 24 hours (86400000 ms)
  const subscription = isAuthenticated ? 
    useSubscriptionStatus(86400000) : 
    { tier: 'free', expirationDate: null, isActive: false, isCancelled: false, loading: false, error: null };

  // You might want to show a splash screen here while loading
  if (loading) {
    return null; // Replace with a proper splash/loading screen
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

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is signed in
          <Stack.Screen
            name="Main"
            component={MainNavigator}
          />
        ) : (
          // User is not signed in
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
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