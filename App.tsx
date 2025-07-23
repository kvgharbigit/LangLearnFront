import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
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

  // NEW: Add app state listener for hybrid sync
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - sync subscription
        console.log('[App] App became active - triggering subscription sync');
        
        // Import and call the sync function
        import('./src/services/revenueCatService')
          .then(({ syncSubscriptionOnAppResume }) => {
            syncSubscriptionOnAppResume().catch(error => {
              console.error('[App] App resume sync failed:', error);
            });
          })
          .catch(error => {
            console.error('[App] Failed to import RevenueCat service:', error);
          });
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial sync when app loads (after a short delay to let initialization complete)
    setTimeout(() => {
      console.log('[App] Initial subscription sync on app load');
      import('./src/services/revenueCatService')
        .then(({ syncSubscriptionOnAppResume }) => {
          syncSubscriptionOnAppResume().catch(error => {
            console.error('[App] Initial sync failed:', error);
          });
        })
        .catch(error => {
          console.error('[App] Failed to import RevenueCat service for initial sync:', error);
        });
    }, 2000); // 2 second delay

    // Cleanup
    return () => {
      subscription?.remove();
    };
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