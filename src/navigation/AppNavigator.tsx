// src/navigation/AppNavigator.tsx
import React, { useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef, setNavigationReady } from './NavigationService';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Main App Screens
import LanguageLanding from '../screens/LanguageLanding';
import LanguageTutor from '../screens/LanguageTutorScreen'; // Updated to use the refactored component
import AudioTestScreen from '../screens/AudioTestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import AppLanguageScreen from '../screens/AppLanguageScreen';

// Contexts
import { useAuth } from '../contexts/AuthContext';

// Components
import NetworkStatusBar from '../components/NetworkStatusBar';
import InitializationGate from '../components/InitializationGate';

// Types
import {
  RootStackParamList,
  AuthStackParamList
} from '../types/navigation';

// Create the navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['confluency://'],
  config: {
    screens: {
      Login: 'auth/login',
      Register: 'auth/register',
      ResetPassword: 'auth/reset-password',
      LanguageLanding: 'main/landing',
      LanguageTutor: 'main/tutor',
      AudioTest: 'main/audio-test',
      Profile: 'main/profile',
      EditProfile: 'main/edit-profile',
      Subscription: 'main/subscription',
      AppLanguage: 'main/app-language',
      PrivacyPolicy: 'main/privacy',
      TermsOfService: 'main/terms',
    },
  },
};

// Auth Navigator - Screens accessible before login
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
      initialRouteName="Login"
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Main App Navigator - Uses single Stack Navigator
const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="LanguageLanding"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="LanguageLanding"
        component={LanguageLanding}
      />
      <Stack.Screen
        name="LanguageTutor"
        component={LanguageTutor}
      />
      <Stack.Screen
        name="AudioTest"
        component={AudioTestScreen}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
      />
      <Stack.Screen
        name="AppLanguage"
        component={AppLanguageScreen}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
      />
    </Stack.Navigator>
  );
};

// Main App Navigator - Switches between Auth and Main based on login state
const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [shouldShowResetPassword, setShouldShowResetPassword] = useState(false);
  const [resetTokenHash, setResetTokenHash] = useState<string>('');
  const [navigationReady, setNavigationReady] = useState(false);

  // Check for reset password deep link on app start
  useEffect(() => {
    const checkInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('auth/reset-password')) {
          console.log('App opened with reset password link:', initialUrl);
          
          // Extract the hash from the URL
          const urlParts = initialUrl.split('#');
          if (urlParts.length > 1) {
            const hash = '#' + urlParts[1];
            console.log('Extracted initial hash for reset:', hash);
            setResetTokenHash(hash);
          }
          setShouldShowResetPassword(true);
        }
      } catch (error) {
        console.log('Error checking initial URL:', error);
      }
    };

    checkInitialURL();

    // Listen for incoming URLs while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link received:', event.url);
      if (event.url.includes('auth/reset-password')) {
        console.log('Reset password deep link detected');
        
        // Extract the hash from the URL
        const urlParts = event.url.split('#');
        if (urlParts.length > 1) {
          const hash = '#' + urlParts[1];
          console.log('Extracted hash for reset:', hash);
          setResetTokenHash(hash);
        }
        setShouldShowResetPassword(true);
      }
    });

    return () => subscription?.remove();
  }, []);
  
  // Show a splash screen or loading indicator while auth state is being determined
  if (loading && !shouldShowResetPassword) {
    console.log('AppNavigator: Loading auth state, showing loading screen');
    // TODO: Replace with a proper splash/loading screen component
    return null;
  }
  
  // Special case: if reset password was triggered, always show auth navigator
  if (shouldShowResetPassword) {
    console.log('AppNavigator: Showing reset password screen with hash:', resetTokenHash);
    return (
      <NavigationContainer linking={linking} ref={navigationRef}>
        <NetworkStatusBar />
        <AuthStack.Navigator 
          screenOptions={{ headerShown: false }}
          initialRouteName="ResetPassword"
        >
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen 
            name="ResetPassword" 
            children={() => (
              <ResetPasswordScreen 
                hash={resetTokenHash}
                onResetComplete={() => setShouldShowResetPassword(false)}
              />
            )}
          />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  // Simplified navigation state logic
  const shouldShowMain = isAuthenticated && !shouldShowResetPassword;
  
  console.log('AppNavigator: Navigation decision -', {
    isAuthenticated,
    loading,
    shouldShowResetPassword,
    shouldShowMain,
    userId: user?.id
  });

  return (
    <NavigationContainer 
      linking={linking} 
      ref={navigationRef}
      onReady={() => {
        console.log('AppNavigator: Navigation container ready');
        setNavigationReady(true);
      }}
      onStateChange={() => {
        // Ensure we stay ready even after state changes
        if (!navigationReady) {
          setNavigationReady(true);
        }
      }}
    >
      <NetworkStatusBar />
      {/* 
        Main navigation based on authentication state
        MainNavigator is wrapped with InitializationGate to handle user data verification
      */}
      {shouldShowMain ? (
        <InitializationGate>
          <MainNavigator />
        </InitializationGate>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;