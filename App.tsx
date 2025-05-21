import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
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
  const periodicCheckRef = React.useRef<NodeJS.Timeout | null>(null);

  // Set up a periodic check to detect authentication status
  React.useEffect(() => {
    // Only run periodic check if not already authenticated
    if (!isAuthenticated && !manualAuthStatus) {
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
  }, [isAuthenticated, manualAuthStatus]);

  if (loading && !manualAuthStatus) {
    console.log('RootNavigator: Loading auth state');
    // You could add a splash screen here
    return null;
  }

  // Use either the context auth state or our manual check
  const shouldShowMain = isAuthenticated || manualAuthStatus;
  console.log('RootNavigator: Navigation decision -', {
    isAuthenticated,
    manualAuthStatus,
    shouldShowMain,
    userId: user?.id
  });

  return (
    <NavigationContainer>
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