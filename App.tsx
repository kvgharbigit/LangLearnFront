import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { UserInitializationProvider } from './src/contexts/UserInitializationContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkStatusBar from './src/components/NetworkStatusBar';
import InitializationGate from './src/components/InitializationGate';
import 'react-native-url-polyfill/auto'; // Required for Supabase

// Import auth screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import AppLanguageScreen from './src/screens/AppLanguageScreen';

// Import existing screens
import LanguageLanding from './src/screens/LanguageLanding';
import LanguageTutor from './src/screens/LanguageTutor';
import AudioTestScreen from './src/screens/AudioTestScreen';

// Import types
import { RootStackParamList, AuthStackParamList } from './src/types/navigation';

// Create the navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// Auth Navigator - Screens accessible before login
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Main Navigator - Authenticated screens with Initialization Gate
const MainNavigator = () => {
  return (
    <InitializationGate>
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
      </Stack.Navigator>
    </InitializationGate>
  );
};

// Root Navigator with Authentication Flow
const RootNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [manualAuthStatus, setManualAuthStatus] = React.useState(false);
  const [shouldShowResetPassword, setShouldShowResetPassword] = React.useState(false);
  const [resetTokenHash, setResetTokenHash] = React.useState<string>('');
  const periodicCheckRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle deep links
  React.useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link received in RootNavigator:', event.url);
      
      if (event.url.includes('auth/reset-password')) {
        console.log('Reset password deep link detected');
        
        // Extract the hash from the URL
        const urlParts = event.url.split('#');
        if (urlParts.length > 1) {
          const hash = '#' + urlParts[1];
          console.log('Extracted hash for reset:', hash);
          
          // Store the hash in a ref or state to pass to the screen
          setResetTokenHash(hash);
        }
        
        setShouldShowResetPassword(true);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('auth/reset-password')) {
        console.log('App opened with reset password link:', url);
        
        // Extract the hash from the URL
        const urlParts = url.split('#');
        if (urlParts.length > 1) {
          const hash = '#' + urlParts[1];
          console.log('Extracted initial hash for reset:', hash);
          setResetTokenHash(hash);
        }
        
        setShouldShowResetPassword(true);
      }
    });

    return () => subscription?.remove();
  }, []);

  // Don't automatically clear reset password flag when user becomes authenticated
  // Let the ResetPasswordScreen handle clearing the flag after successful password update

  // Set up a periodic check to detect authentication status
  React.useEffect(() => {
    // Only run periodic check if not already authenticated
    if (!isAuthenticated && !manualAuthStatus && !shouldShowResetPassword) {
      console.log('RootNavigator: Setting up periodic auth check');
      
      // Define the check function
      const checkAuth = async () => {
        try {
          const { supabase } = await import('./src/supabase/config');
          const { data } = await supabase.auth.getSession();
          const hasSession = !!data.session;
          
          if (hasSession) {
            console.log('RootNavigator: Periodic check found active session');
            setManualAuthStatus(true);
            
            // Clear interval once authenticated
            if (periodicCheckRef.current) {
              clearInterval(periodicCheckRef.current);
              periodicCheckRef.current = null;
            }
          }
        } catch (error) {
          console.error('RootNavigator: Periodic auth check error:', error);
        }
      };
      
      // Run immediately
      checkAuth();
      
      // Set up interval
      periodicCheckRef.current = setInterval(checkAuth, 1000);
      
      // Clean up interval on unmount
      return () => {
        if (periodicCheckRef.current) {
          clearInterval(periodicCheckRef.current);
          periodicCheckRef.current = null;
        }
      };
    } else if (isAuthenticated || manualAuthStatus) {
      // If we're already authenticated, clear any existing interval
      if (periodicCheckRef.current) {
        clearInterval(periodicCheckRef.current);
        periodicCheckRef.current = null;
      }
    }
  }, [isAuthenticated, manualAuthStatus, shouldShowResetPassword]);

  if (loading && !manualAuthStatus && !shouldShowResetPassword) {
    console.log('RootNavigator: Loading auth state');
    // You could add a splash screen here
    return null;
  }

  // Special case: if reset password was triggered, always show auth navigator
  if (shouldShowResetPassword) {
    console.log('RootNavigator: Showing reset password screen with hash:', resetTokenHash);
    return (
      <NavigationContainer linking={linking}>
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

  // Use either the context auth state or our manual check
  const shouldShowMain = isAuthenticated || manualAuthStatus;
  console.log('RootNavigator: Navigation decision -', {
    isAuthenticated,
    manualAuthStatus,
    shouldShowMain,
    shouldShowResetPassword,
    userId: user?.id
  });

  // Deep linking configuration
  const linking = {
    prefixes: [Linking.createURL('/'), 'confluency://'],
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
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      {/* Always show network status */}
      <NetworkStatusBar />
      
      {/* Main navigation based on authentication state */}
      {shouldShowMain ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// Import API preconnection
import { preconnectToAPI } from './src/utils/api';
import { initializeApp } from './src/utils/appInitializer';

// Main App component
export default function App() {
  // Preconnect to API on app startup and initialize app
  useEffect(() => {
    // Initialize application
    initializeApp()
      .then(() => console.log('✅ App initialized successfully'))
      .catch(err => console.warn('❌ App initialization error:', err));
      
    // Warm up API connection
    preconnectToAPI()
      .then(() => console.log('🔌 API connection prewarmed successfully'))
      .catch(err => console.warn('⚠️ API prewarm error (non-critical):', err));
  }, []);

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <UserInitializationProvider>
            <AuthProvider>
              <LanguageProvider>
                <RootNavigator />
              </LanguageProvider>
            </AuthProvider>
          </UserInitializationProvider>
        </SafeAreaProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}