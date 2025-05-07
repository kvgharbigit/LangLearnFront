// src/utils/appInitializer.ts
import { initializeUser } from '../services/supabaseAuthService';
import { supabase } from '../supabase/config';
import { Platform } from 'react-native';

/**
 * Initializes the app with all required services and data
 * This should be called as early as possible in the app startup process
 */
export const initializeApp = async (): Promise<void> => {
  console.log('🚀 Initializing application...');
  
  try {
    // Set up Supabase auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`);
      
      // Auto-initialize user when auth state changes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        initializeUser()
          .then(user => {
            if (user) {
              console.log('✅ User initialized:', user.id);
            } else {
              console.warn('⚠️ Failed to initialize user after auth event');
            }
          })
          .catch(err => {
            console.error('❌ Error initializing user after auth event:', err);
          });
      }
    });
    
    // Initialize user on app start
    const user = await initializeUser();
    if (user) {
      console.log('✅ App initialized with user:', user.id);
    } else {
      console.log('✅ App initialized without user - authentication required');
    }
    
    // Log initialization details
    console.log(`📱 Platform: ${Platform.OS}, Version: ${Platform.Version}`);
    console.log('🔌 Initialization complete');
    
  } catch (error) {
    console.error('❌ Error during app initialization:', error);
  }
};

export default {
  initializeApp
};