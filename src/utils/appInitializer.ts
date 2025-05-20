// src/utils/appInitializer.ts
import { initializeUser } from '../services/supabaseAuthService';
import { supabase } from '../supabase/config';
import { Platform } from 'react-native';
import { 
  initializeRevenueCat, 
  syncSubscriptionWithDatabase,
  syncCrossPlatformEntitlements
} from '../services/revenueCatService';

/**
 * Initializes the app with all required services and data
 * This should be called as early as possible in the app startup process
 */
export const initializeApp = async (): Promise<void> => {
  console.log('🚀 Initializing application...');
  
  try {
    // Set up Supabase auth listener - only for logging purposes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`);
      // User initialization is now handled by AuthContext
    });
    
    // Initialize user on app start
    const user = await initializeUser();
    if (user) {
      console.log('✅ App initialized with user:', user.id);
      
      // Initialize RevenueCat with user ID
      console.log('🛒 Initializing RevenueCat for user:', user.id);
      try {
        await initializeRevenueCat(user.id);
        console.log('✅ RevenueCat initialized successfully');
        
        // Sync cross-platform entitlements
        console.log('🔄 Syncing cross-platform entitlements...');
        try {
          await syncCrossPlatformEntitlements();
          console.log('✅ Cross-platform entitlements synced successfully');
        } catch (syncError) {
          console.error('❌ Failed to sync cross-platform entitlements:', syncError);
          // Continue with app initialization even if sync fails
        }
        
        // Sync subscription data with database
        console.log('🔄 Syncing subscription data with database...');
        try {
          const syncResult = await syncSubscriptionWithDatabase();
          if (syncResult) {
            console.log('✅ Subscription data synchronized with database (updates applied)');
          } else {
            console.log('✅ Subscription data already in sync (no updates needed)');
          }
        } catch (syncError) {
          console.error('❌ Failed to sync subscription data:', syncError);
          // Continue with app initialization even if sync fails
        }
      } catch (revenueCatError) {
        console.error('❌ Failed to initialize RevenueCat:', revenueCatError);
        // Continue with app initialization even if RevenueCat fails
      }
    } else {
      console.log('✅ App initialized without user - authentication required');
      
      // Initialize RevenueCat without user ID for anonymous users
      console.log('🛒 Initializing RevenueCat for anonymous user');
      try {
        await initializeRevenueCat();
        console.log('✅ RevenueCat initialized successfully for anonymous user');
      } catch (revenueCatError) {
        console.error('❌ Failed to initialize RevenueCat:', revenueCatError);
        // Continue with app initialization even if RevenueCat fails
      }
    }
    
    // Log initialization details
    console.log(`📱 Platform: ${Platform.OS}, Version: ${Platform.Version}`);
    console.log('🔌 Initialization complete');
    
  } catch (error) {
    console.error('❌ Error during app initialization:', error);
  }
};

/**
 * Syncs subscription data with RevenueCat
 * This can be called anytime to ensure database and RevenueCat are in sync
 * Useful after restoring purchases or when app comes to foreground
 */
export const syncSubscriptionData = async (): Promise<boolean> => {
  try {
    console.log('🔄 Manual subscription sync requested');
    return await syncSubscriptionWithDatabase();
  } catch (error) {
    console.error('❌ Error during manual subscription sync:', error);
    return false;
  }
};

export default {
  initializeApp,
  syncSubscriptionData
};