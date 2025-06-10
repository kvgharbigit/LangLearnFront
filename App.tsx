import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { UserInitializationProvider } from './src/contexts/UserInitializationContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkStatusBar from './src/components/NetworkStatusBar';
import 'react-native-url-polyfill/auto'; // Required for Supabase

// Import API preconnection
import { preconnectToAPI } from './src/utils/api';
import { initializeApp } from './src/utils/appInitializer';

// Import AppNavigator
import AppNavigator from './src/navigation/AppNavigator';

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
                <AppNavigator />
              </LanguageProvider>
            </AuthProvider>
          </UserInitializationProvider>
        </SafeAreaProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}