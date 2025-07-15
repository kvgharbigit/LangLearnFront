// src/services/revenueCatService.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';
import { USE_SIMULATED_REVENUECAT } from '../utils/revenueCatConfig';

// Define types for RevenueCat APIs to maintain type safety
export type PurchasesPackage = {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
  offering: {
    identifier: string;
  };
};

export type CustomerInfo = {
  entitlements: {
    active: Record<string, any>;
    all: Record<string, any>;
  };
  originalAppUserId: string;
  managementURL: string | null;
  originalPurchaseDate: string;
};

// RevenueCat API keys - get from environment
const extraConfig = Constants.expoConfig?.extra || {};
const API_KEYS = {
  ios: extraConfig.revenueCatIosKey || process.env.REVENUECAT_IOS_KEY || 'appl_UkqSKmpgpYcEwGsRLwROiWopqQj',
  android: extraConfig.revenueCatAndroidKey || process.env.REVENUECAT_ANDROID_KEY || 'goog_CqytRKXWMJjpxZrlAjZLycGdFHy'
};

// Map RevenueCat entitlement IDs to our subscription tiers
const ENTITLEMENTS = {
  BASIC: 'basic_entitlement',
  PREMIUM: 'premium_entitlement',
  GOLD: 'gold_entitlement'
};

// Map product IDs to our subscription tiers - platform specific
const PRODUCT_IDS = Platform.select({
  // iOS product IDs (App Store)
  ios: {
    BASIC: 'basic_tier3',
    PREMIUM: 'premium_tier3',
    GOLD: 'gold_tier3'
  },
  // Android product IDs (Play Store)
  android: {
    BASIC: 'basic_tier:monthly',
    PREMIUM: 'premium_tier:monthly',
    GOLD: 'gold_tier:monthly'
  }
}) || {
  // Default fallback if platform not detected
  BASIC: 'basic_tier3',
  PREMIUM: 'premium_tier3',
  GOLD: 'gold_tier3'
};

// Log the product IDs being used
console.log('[RevenueCat] Product IDs configuration:', {
  platform: Platform.OS,
  isDevelopment: __DEV__,
  productIds: PRODUCT_IDS
});

// Map entitlement IDs to subscription tiers
const TIER_MAPPING = {
  [ENTITLEMENTS.BASIC]: 'basic',
  [ENTITLEMENTS.PREMIUM]: 'premium',
  [ENTITLEMENTS.GOLD]: 'gold'
};

// Whether we've logged the RevenueCat initialization info
let _hasLoggedRevenueCatInit = false;

// Function to determine if we should use simulated data
// Only checks user preferences, ignoring environment
export const shouldUseSimulatedData = async (): Promise<boolean> => {
  try {
    // Check user preference only - environment doesn't matter
    const { getUseSimulatedRevenueCat } = await import('../utils/revenueCatConfig');
    const simulateFromPrefs = await getUseSimulatedRevenueCat();
    
    console.log(`[RevenueCat] User preference: ${simulateFromPrefs ? 'SIMULATED' : 'REAL'}`);
    console.log(`[RevenueCat] Final simulation mode: ${simulateFromPrefs ? 'SIMULATED' : 'REAL'} (based on user preference)`);
    
    return simulateFromPrefs;
  } catch (error) {
    console.error('[RevenueCat.shouldUseSimulatedData] ❌ Error checking simulation preference:', error.message || error);
    console.error('[RevenueCat.shouldUseSimulatedData] Error details:', JSON.stringify(error, null, 2));
    
    // Important: Default to false (real data) if preferences can't be read
    // This ensures we never accidentally use simulated data in production
    console.warn('[RevenueCat.shouldUseSimulatedData] Defaulting to real data mode due to error');
    return false;
  }
};

// Synchronous version for backward compatibility
// This will eventually be deprecated in favor of the async version
export const shouldUseSimulatedDataSync = (): boolean => {
  try {
    // Use static config value only - environment doesn't matter
    console.log(`[RevenueCat sync] Using config value: ${USE_SIMULATED_REVENUECAT ? 'SIMULATED' : 'REAL'}`);
    return USE_SIMULATED_REVENUECAT;
  } catch (error) {
    console.error('[RevenueCat sync] Error checking simulation setting:', error);
    return false; // Default to real data on error
  }
};

// Initialize RevenueCat
export const initializeRevenueCat = async (userId?: string) => {
  try {
    const useSimulatedData = await shouldUseSimulatedData();
    
    console.log(`[RevenueCat] === Initialization Decision ===`);
    console.log(`[RevenueCat] Will use ${useSimulatedData ? 'SIMULATED' : 'REAL'} mode`);
    
    // Log product IDs during initialization
    console.log('[RevenueCat] Product IDs at initialization:', {
      platform: Platform.OS,
      isDevelopment: __DEV__,
      productIds: PRODUCT_IDS
    });
    
    // Only log initialization details once
    if (!_hasLoggedRevenueCatInit) {
      console.log('------ RevenueCat Initialization ------');
      console.log('[RevenueCat] Initialization started');
      console.log('[RevenueCat] User ID:', userId || 'anonymous');
      
      // Get the user preference for logging
      let userPref = "unknown";
      try {
        const { getUseSimulatedRevenueCat } = await import('../utils/revenueCatConfig');
        userPref = String(await getUseSimulatedRevenueCat());
      } catch (e) {
        console.error('[RevenueCat] Failed to read user preference:', e);
        userPref = "error";
      }
      
      console.log('[RevenueCat] User Preference:', userPref);
      console.log('[RevenueCat] Final decision: Using simulated data =', useSimulatedData);
      console.log('[RevenueCat] Platform:', Platform.OS, Platform.Version);
      
      _hasLoggedRevenueCatInit = true;
    }
    
    // Check if we should use simulated data (based on user preference only)
    if (useSimulatedData) {
      console.log('📱 [RevenueCat] SIMULATED MODE - Using user preference');
      console.log('📱 [RevenueCat] All operations will use mock data');
      return;
    }
    
    console.log(`📱 [RevenueCat] REAL MODE - Using actual RevenueCat API on ${Platform.OS}`); 

    // Get API key based on platform
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    console.log('[RevenueCat] Using API key for platform:', Platform.OS);
    console.log('[RevenueCat] API key prefix:', apiKey.substring(0, 8) + '...');
    
    // Load the RevenueCat SDK
    let Purchases;
    try {
      Purchases = require('react-native-purchases').default;
      console.log('[RevenueCat] SDK loaded successfully');
    } catch (sdkError) {
      // Handle case where SDK couldn't be loaded (e.g. in Expo Go)
      console.error('[RevenueCat] ❌ Failed to load SDK:', sdkError.message || sdkError);
      
      // Check if this is a native module error (common in Expo Go)
      if (sdkError.message?.includes('native module') || sdkError.message?.includes('doesn\'t exist')) {
        console.error('[RevenueCat] Native module not found - are you running in Expo Go?');
        console.error('[RevenueCat] RevenueCat requires native code and cannot run in Expo Go.');
        console.error('[RevenueCat] Please either:');
        console.error('[RevenueCat] 1. Create a development build with `eas build --platform ios --profile development`');
        console.error('[RevenueCat] 2. Enable simulated mode in app settings');
        
        // Check if we should be in simulated mode
        try {
          const { isExpoGo } = require('../utils/deviceInfo');
          if (isExpoGo()) {
            console.error('[RevenueCat] Detected Expo Go environment - simulated mode should have been enabled automatically');
          }
        } catch (e) {
          console.error('[RevenueCat] Failed to check Expo Go status:', e);
        }
      }
      
      console.error('[RevenueCat] SDK Error details:', JSON.stringify(sdkError, null, 2));
      // Return gracefully instead of throwing - app can still function without RevenueCat
      console.warn('[RevenueCat] Initialization failed but continuing in offline/fallback mode');
      return;
    }
      
    // Configure RevenueCat SDK
    try {
      // Set up cross-platform entitlements mapping (optional step)
      try {
        // Check if setPlatformInfo is available before calling it
        if (typeof Purchases.setPlatformInfo === 'function') {
          Purchases.setPlatformInfo(Platform.OS, Platform.Version);
          console.log('[RevenueCat] Platform info set for cross-platform sync');
        } else {
          // Skip setting platform info if the method doesn't exist
          console.log('[RevenueCat] setPlatformInfo method not available in this SDK version - skipping');
        }
      } catch (platformError) {
        console.warn('[RevenueCat] Error setting platform info (non-critical):', platformError);
        // Continue initialization - this is not a critical error
      }
      
      // Configure with proper API key and user ID
      const config = { 
        apiKey, 
        appUserID: userId,
        observerMode: false
      };
      console.log('[RevenueCat] Configuring with:', { ...config, apiKey: 'hidden' });
      
      // Configure RevenueCat with StoreKit mode in development (iOS only)
      if (__DEV__ && Platform.OS === 'ios' && typeof Purchases.setSimulatesAskToBuyInSandbox === 'function') {
        console.log('[RevenueCat] Development build detected, configuring StoreKit test mode');
        Purchases.setSimulatesAskToBuyInSandbox(false);
      }
      
      // Check if the configure method exists before calling it
      if (typeof Purchases.configure !== 'function') {
        throw new Error('Purchases.configure method is not available in this SDK version');
      }
      
      // Configure the SDK
      Purchases.configure(config);
      
      // Set debug logs only in development builds
      if (__DEV__ && Purchases.LOG_LEVEL && typeof Purchases.setLogLevel === 'function') {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.VERBOSE);
        console.log('[RevenueCat] Verbose logging enabled');
      } else if (Purchases.LOG_LEVEL && typeof Purchases.setLogLevel === 'function') {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
        console.log('[RevenueCat] Error-only logging enabled');
      }
      
      // Log the current bundle identifier for debugging
      let bundleId = null;
      try {
        // Try using expo-constants first
        const Constants = require('expo-constants').default;
        if (Constants.manifest2?.extra?.eas?.projectId) {
          console.log('[RevenueCat] EAS Project ID:', Constants.manifest2.extra.eas.projectId);
        }
        
        // Try to get bundle ID from app.json config
        if (Platform.OS === 'ios') {
          bundleId = Constants.expoConfig?.ios?.bundleIdentifier;
          console.log('[RevenueCat] Bundle ID from expoConfig:', bundleId);
        }
      } catch (configError) {
        console.log('[RevenueCat] Error getting bundle ID from config:', configError.message);
      }
      
      console.log('[RevenueCat] Bundle identifier detected:', bundleId || 'not found');
      
      // Since bundle ID detection is failing, let's manually set it for now
      if (!bundleId && Platform.OS === 'ios') {
        bundleId = 'io.github.kvgharbigit.langlearn';
        console.log('[RevenueCat] Using hardcoded bundle ID:', bundleId);
      }
      
      console.log('[RevenueCat] ✅ Initialization complete');
    } catch (configError) {
      console.error('[RevenueCat] ❌ Error during configuration:', configError.message || configError);
      console.error('[RevenueCat] Configuration error details:', JSON.stringify(configError, null, 2));
      
      console.warn('[RevenueCat] Initialization failed but continuing in fallback mode');
      // Don't throw here - allow the app to continue functioning without RevenueCat
    }
  } catch (error) {
    console.error('[RevenueCat] ❌ Critical initialization error:', error.message || error);
    console.error('[RevenueCat] Error details:', JSON.stringify(error, null, 2));
    
    // Don't throw the error - allow app to continue functioning
    console.warn('[RevenueCat] Continuing in offline/fallback mode due to initialization failure');
  }
};

// Import utilities at the top level
let shouldUseMockData: any;
let logDataSource: any;

try {
  const dataMode = require('../utils/dataMode');
  shouldUseMockData = dataMode.shouldUseMockData;
  logDataSource = dataMode.logDataSource;
} catch (error) {
  console.error('[RevenueCat] Failed to import dataMode utilities:', error);
  // Provide fallback implementations
  shouldUseMockData = () => false;
  logDataSource = () => {};
}

// Flag to track if we've logged the offerings info
let _hasLoggedOfferingsInfo = false;

// Get available packages
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  console.log('[RevenueCat.getOfferings] Starting to fetch available packages...');
  console.log('[RevenueCat.getOfferings] Current product IDs:', {
    platform: Platform.OS,
    isDevelopment: __DEV__,
    productIds: PRODUCT_IDS
  });
  
  try {
    // Use mock data based on user preference or environment
    const useSimulatedData = await shouldUseSimulatedData();
    
    if (useSimulatedData) {
      logDataSource('SubscriptionService', true);
      // Log only the first time
      if (!_hasLoggedOfferingsInfo) {
        console.warn('📱 [RevenueCat.getOfferings] MOCK DATA - Using simulated mode');
        console.warn('⚠️ [RevenueCat.getOfferings] Returning mock subscription packages');
        _hasLoggedOfferingsInfo = true;
      }
      
      // Create mock packages based on subscription plans
      const mockPackages = SUBSCRIPTION_PLANS
        .filter(plan => plan.tier !== 'free')
        .map(plan => ({
          identifier: plan.id,
          packageType: 'MONTHLY',
          product: {
            identifier: plan.id,
            title: `${plan.name} Plan`,
            description: `${plan.name} subscription with ${plan.monthlyTokens} tokens per month`,
            price: plan.price,
            priceString: `$${plan.price.toFixed(2)}`,
            currencyCode: 'USD',
          },
          offering: {
            identifier: 'default'
          }
        }));
      
      console.log(`[RevenueCat.getOfferings] Created ${mockPackages.length} mock packages:`, 
        mockPackages.map(p => ({ id: p.identifier, price: p.product.priceString })));
      return mockPackages as PurchasesPackage[];
    }
    
    logDataSource('SubscriptionService', false);
    // Log only the first time
    if (!_hasLoggedOfferingsInfo) {
      console.log('📱 [RevenueCat.getOfferings] REAL DATA - Using actual RevenueCat SDK');
      _hasLoggedOfferingsInfo = true;
    }

    // Use actual RevenueCat SDK for production builds
    const Purchases = require('react-native-purchases').default;
    console.log('[RevenueCat.getOfferings] Calling SDK getOfferings...');
    const offerings = await Purchases.getOfferings();
    
    if (offerings) {
      console.log('[RevenueCat.getOfferings] Raw offerings response:', {
        hasCurrentOffering: !!offerings.current,
        currentOfferingId: offerings.current?.identifier || 'none',
        allOfferingsCount: Object.keys(offerings.all || {}).length
      });
      
      if (offerings.current && offerings.current.availablePackages) {
        const packages = offerings.current.availablePackages;
        console.log(`[RevenueCat.getOfferings] ✅ Found ${packages.length} packages in offering "${offerings.current.identifier}"`);
        packages.forEach((pkg, index) => {
          console.log(`[RevenueCat.getOfferings] Package ${index + 1}:`, {
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            price: pkg.product.priceString,
            type: pkg.packageType
          });
        });
        return packages;
      } else {
        // This is a legitimate case - no packages configured in RevenueCat
        console.warn('[RevenueCat.getOfferings] ⚠️ No current offering or packages available');
        console.warn('[RevenueCat.getOfferings] All offerings:', Object.keys(offerings.all || {}));
        return [];
      }
    } else {
      // This is also a legitimate case - no offerings configured
      console.warn('[RevenueCat.getOfferings] ⚠️ No offerings returned from SDK');
      return [];
    }
  } catch (error) {
    console.error('[RevenueCat.getOfferings] ❌ Fatal error:', error.message || error);
    console.error('[RevenueCat.getOfferings] Error type:', error.constructor.name);
    console.error('[RevenueCat.getOfferings] Full error:', JSON.stringify(error, null, 2));
    
    // Check if this is a configuration error (no products set up)
    const isConfigurationError = 
      error?.message?.includes('configuration') || 
      error?.message?.includes('products registered') ||
      error?.code === '23' ||
      error?.code === 23;
    
    if (isConfigurationError) {
      console.warn('[RevenueCat.getOfferings] Configuration error detected - no products configured in RevenueCat/App Store');
      console.warn('[RevenueCat.getOfferings] This is expected in development or when products are not yet set up');
    }
    
    // Only return empty array if we're in simulated mode
    // Otherwise, throw the error so it's properly handled upstream
    const useSimulatedData = await shouldUseSimulatedData();
    if (useSimulatedData) {
      console.log('[RevenueCat.getOfferings] In simulated mode, returning empty array');
      return [];
    }
    
    // In real mode, always throw the error
    console.error('[RevenueCat.getOfferings] In real mode, propagating error');
    throw error;
  }
};

// Flag to track if we've logged purchase info
let _hasLoggedPurchaseInfo = false;

// Purchase a package
export const purchasePackage = async (
  pckg: PurchasesPackage
): Promise<CustomerInfo> => {
  console.log('[RevenueCat.purchasePackage] Starting purchase for package:', {
    identifier: pckg.identifier,
    productId: pckg.product.identifier,
    price: pckg.product.priceString
  });
  
  try {
    // Use mock data based on user preference or environment
    const useSimulatedData = await shouldUseSimulatedData();
    
    if (useSimulatedData) {
      // Log only the first time, plus the specific package ID
      if (!_hasLoggedPurchaseInfo) {
        console.warn('📱 [RevenueCat.purchasePackage] MOCK DATA - Using simulated mode');
        _hasLoggedPurchaseInfo = true;
      }
      console.log('[RevenueCat.purchasePackage] Simulating purchase for:', pckg.identifier);
      
      // Create mock customerInfo response
      const mockTier = pckg.identifier === PRODUCT_IDS.BASIC ? 'basic' : 
                       pckg.identifier === PRODUCT_IDS.PREMIUM ? 'premium' : 
                       pckg.identifier === PRODUCT_IDS.GOLD ? 'gold' : 'free';
                       
      console.log('[RevenueCat.purchasePackage] Mock tier determined:', mockTier);
                       
      // Determine which entitlement to use based on the tier
      const entitlementToUse = mockTier === 'basic' ? ENTITLEMENTS.BASIC :
                               mockTier === 'premium' ? ENTITLEMENTS.PREMIUM :
                               mockTier === 'gold' ? ENTITLEMENTS.GOLD : null;
      
      const mockResult = {
        entitlements: {
          active: entitlementToUse ? {
            [entitlementToUse]: {
              productIdentifier: pckg.identifier,
              isSandbox: true,
              expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            }
          } : {},
          all: {}
        },
        originalAppUserId: 'dev_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      };
      
      console.log('[RevenueCat.purchasePackage] Mock purchase complete:', {
        tier: mockTier,
        entitlement: entitlementToUse,
        hasActiveEntitlements: Object.keys(mockResult.entitlements.active).length > 0
      });
      
      return mockResult as CustomerInfo;
    }

    // Use actual RevenueCat SDK 
    try {
      const Purchases = require('react-native-purchases').default;
      // Log only the first time, plus the specific package ID
      if (!_hasLoggedPurchaseInfo) {
        console.log('📱 [RevenueCat.purchasePackage] REAL DATA - Using actual RevenueCat SDK');
        _hasLoggedPurchaseInfo = true;
      }
      console.log('[RevenueCat.purchasePackage] Starting SDK purchase for:', pckg.identifier);
      
      // Make the purchase with the SDK
      const purchaseResult = await Purchases.purchasePackage(pckg);
      console.log('[RevenueCat.purchasePackage] ✅ Purchase successful');
      console.log('[RevenueCat.purchasePackage] Customer info:', {
        userId: purchaseResult.customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(purchaseResult.customerInfo.entitlements.active)
      });
      
      // If successful purchase, update the subscription tier in our usage tracking system
      if (purchaseResult.customerInfo) {
        try {
          // Determine the tier from the purchased package
          const newTier = getTierFromProductIdentifier(pckg.product.identifier);
          console.log('[RevenueCat.purchasePackage] Updating usage limits for tier:', newTier);
          
          // Update the usage limits for the new tier - use safe wrapper to handle race conditions
          const { updateSubscriptionTierSafe } = await import('./subscriptionUpdateSafe');
          await updateSubscriptionTierSafe(newTier);
          console.log(`[RevenueCat.purchasePackage] ✅ Usage limits updated for tier: ${newTier}`);
        } catch (err) {
          console.error('[RevenueCat.purchasePackage] ⚠️ Failed to update usage limits:', err.message || err);
          console.error('[RevenueCat.purchasePackage] Will try syncing subscription with database as a fallback');
          
          // As a fallback, try to sync with database to ensure consistency
          try {
            const syncResult = await syncSubscriptionWithDatabase();
            if (syncResult) {
              console.log('[RevenueCat.purchasePackage] ✅ Database synced successfully as fallback');
            } else {
              console.log('[RevenueCat.purchasePackage] ✓ Database already in sync with RevenueCat');
            }
          } catch (syncError) {
            console.error('[RevenueCat.purchasePackage] ❌ Both direct update and sync failed:', syncError);
            // Continue with the purchase flow even if both update methods fail
          }
        }
      }
      
      return purchaseResult.customerInfo;
    } catch (err) {
      console.error('[RevenueCat.purchasePackage] ❌ SDK purchase failed:', err.message || err);
      console.error('[RevenueCat.purchasePackage] Error code:', err.code);
      console.error('[RevenueCat.purchasePackage] Error details:', JSON.stringify(err, null, 2));
      throw err;
    }
  } catch (error) {
    console.error('[RevenueCat.purchasePackage] ❌ Fatal error:', error.message || error);
    console.error('[RevenueCat.purchasePackage] Error type:', error.constructor.name);
    console.error('[RevenueCat.purchasePackage] Full error:', JSON.stringify(error, null, 2));
    
    // Only use mock data if we're explicitly in simulated mode
    // Otherwise, throw the error so it's properly handled upstream
    const useSimulatedData = await shouldUseSimulatedData();
    if (useSimulatedData) {
      console.warn('[RevenueCat.purchasePackage] In simulated mode, returning mock data');
      return {
        entitlements: {
          active: {},
          all: {}
        },
        originalAppUserId: 'dev_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }
    
    // In real mode, always throw the error
    console.error('[RevenueCat.purchasePackage] In real mode, propagating error');
    throw error;
  }
};

// Flag to track if we've logged subscription info
let _hasLoggedSubscriptionInfo = false;

/**
 * Cache subscription data locally for offline access
 * Uses AsyncStorage to store subscription details
 */
const cacheSubscriptionData = async (subscription: {
  tier: SubscriptionTier;
  expirationDate: Date | null;
  isActive: boolean;
}): Promise<void> => {
  try {
    // Correctly import AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    if (!AsyncStorage) {
      throw new Error('AsyncStorage not available');
    }
    
    // Store data with expiration timestamp and current time
    const cacheData = {
      subscription,
      cachedAt: Date.now(),
      // Add subscription validation info
      validUntil: subscription.expirationDate ? new Date(subscription.expirationDate).getTime() : null
    };
    
    await AsyncStorage.setItem('cached_subscription', JSON.stringify(cacheData));
    console.log('[RevenueCat] Cached subscription data:', subscription.tier);
  } catch (error) {
    console.error('[RevenueCat] Error caching subscription data:', error);
    // Non-critical error - continue execution
  }
};

/**
 * Get cached subscription data with validation
 * Returns null if cache is invalid or expired
 */
const getCachedSubscriptionData = async (): Promise<{
  tier: SubscriptionTier;
  expirationDate: Date | null;
  isActive: boolean;
  isCancelled?: boolean;
  isInGracePeriod?: boolean;
} | null> => {
  try {
    // Import AsyncStorage correctly
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    if (!AsyncStorage) {
      console.error('[RevenueCat] AsyncStorage not available for getting cached data');
      return null;
    }
    
    const cachedData = await AsyncStorage.getItem('cached_subscription');
    if (!cachedData) {
      console.log('[RevenueCat] No cached subscription data found');
      return null;
    }
    
    const data = JSON.parse(cachedData);
    const now = Date.now();
    
    // Validate cache
    if (data.validUntil && data.validUntil < now) {
      // Subscription has expired according to the cache
      console.log('[RevenueCat] Cached subscription has expired');
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false,
        isInGracePeriod: false
      };
    }
    
    // If cache is too old (more than 24 hours), consider it invalid
    const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    if (now - data.cachedAt > MAX_CACHE_AGE) {
      console.log('[RevenueCat] Cached subscription is too old (>24h)');
      return null;
    }
    
    // Fix date format if needed
    if (data.subscription && data.subscription.expirationDate) {
      data.subscription.expirationDate = new Date(data.subscription.expirationDate);
    }
    
    // Make sure we have a valid subscription object
    if (!data.subscription || !data.subscription.tier) {
      console.error('[RevenueCat] Cached subscription data is malformed');
      return null;
    }
    
    console.log('[RevenueCat] Using cached subscription data:', data.subscription.tier);
    return data.subscription;
  } catch (error) {
    console.error('[RevenueCat] Error getting cached subscription data:', error);
    return null;
  }
};

// Get current subscription info directly from RevenueCat
export const getCurrentSubscription = async (): Promise<{
  tier: SubscriptionTier;
  expirationDate: Date | null;
  isActive: boolean;
  isCancelled?: boolean; // Flag to indicate cancelled but not yet expired subscription
  isInGracePeriod?: boolean; // Flag to indicate subscription is in billing grace period
}> => {
  console.log('[RevenueCat.getCurrentSubscription] Fetching subscription status...');
  
  try {
    // Use mock data based on manual configuration
    const useSimulatedData = await shouldUseSimulatedData();
    
    if (useSimulatedData) {
      logDataSource('SubscriptionService', true);
      // Log only the first time
      if (!_hasLoggedSubscriptionInfo) {
        console.warn('📱 [RevenueCat.getCurrentSubscription] MOCK DATA - Using simulated mode');
        console.warn('⚠️ [RevenueCat.getCurrentSubscription] Returning mock free subscription');
        _hasLoggedSubscriptionInfo = true;
      }
      
      const mockSubscription = {
        tier: 'free' as SubscriptionTier,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      };
      
      console.log('[RevenueCat.getCurrentSubscription] Mock subscription:', {
        tier: mockSubscription.tier,
        expires: mockSubscription.expirationDate.toISOString(),
        isActive: mockSubscription.isActive
      });
      
      return mockSubscription;
    }
    
    logDataSource('SubscriptionService', false);
    // Log only the first time
    if (!_hasLoggedSubscriptionInfo) {
      console.log('📱 [RevenueCat.getCurrentSubscription] REAL DATA - Using actual RevenueCat SDK');
      _hasLoggedSubscriptionInfo = true;
    }

    // Try to get cached subscription data first
    const cachedData = await getCachedSubscriptionData();
    if (cachedData) {
      console.log('[RevenueCat.getCurrentSubscription] Using cached subscription data from AsyncStorage');
      return cachedData;
    }

    // Load RevenueCat SDK
    let Purchases;
    try {
      Purchases = require('react-native-purchases').default;
    } catch (sdkError) {
      console.error('[RevenueCat.getCurrentSubscription] Failed to load SDK:', sdkError.message);
      // Return free tier if SDK can't be loaded
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }

    // Check if getCustomerInfo method exists
    if (typeof Purchases.getCustomerInfo !== 'function') {
      console.error('[RevenueCat.getCurrentSubscription] getCustomerInfo method not available');
      // Return free tier if method not available
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }

    // Get customer info from RevenueCat
    console.log('[RevenueCat.getCurrentSubscription] Calling SDK getCustomerInfo...');
    let customerInfo;
    try {
      customerInfo = await Purchases.getCustomerInfo();
    } catch (apiError) {
      console.error('[RevenueCat.getCurrentSubscription] API error:', apiError.message);
      // Return free tier on API error
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }
    
    if (!customerInfo) {
      console.error('[RevenueCat.getCurrentSubscription] ❌ No customer info returned');
      // Return free tier if no customer info
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }
    
    console.log('[RevenueCat.getCurrentSubscription] Customer info received:', {
      userId: customerInfo.originalAppUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements?.active || {}),
      allEntitlements: Object.keys(customerInfo.entitlements?.all || {})
    });
    
    // Safety check for entitlements object
    if (!customerInfo.entitlements || !customerInfo.entitlements.active) {
      console.error('[RevenueCat.getCurrentSubscription] Entitlements object missing or malformed');
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }
    
    // Check if any subscription has expired
    const now = new Date();
    const hasExpiredSubscription = Object.values(customerInfo.entitlements.all || {}).some(entitlement => {
      // Check if this entitlement has an expiration date in the past
      return entitlement.expirationDate && new Date(entitlement.expirationDate) < now;
    });
    
    if (hasExpiredSubscription) {
      console.log('[RevenueCat.getCurrentSubscription] Found expired subscription, reverting to free tier');
      return {
        tier: 'free' as SubscriptionTier,
        expirationDate: null,
        isActive: false
      };
    }
    
    // Check for active entitlements starting with the highest tier
    if (customerInfo.entitlements.active[ENTITLEMENTS.GOLD]) {
      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.GOLD];
      
      // Check if subscription is cancelled but not yet expired
      const isCancelled = activeEntitlement.willRenew === false;
      // We no longer use grace period - users go directly to free tier
      const isInGracePeriod = false;
      
      console.log('[RevenueCat.getCurrentSubscription] Found GOLD tier:', {
        productId: activeEntitlement.productIdentifier,
        expires: activeEntitlement.expirationDate,
        willRenew: activeEntitlement.willRenew,
        isCancelled,
        isInGracePeriod
      });
      
      const subscription = {
        tier: 'gold' as SubscriptionTier,
        expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
        isActive: true,
        isCancelled,
        isInGracePeriod
      };
      
      // Cache the subscription data for offline access
      await cacheSubscriptionData(subscription);
      
      return subscription;
    } else if (customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM]) {
      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
      
      // Check if subscription is cancelled but not yet expired
      const isCancelled = activeEntitlement.willRenew === false;
      // We no longer use grace period - users go directly to free tier
      const isInGracePeriod = false;
      
      console.log('[RevenueCat.getCurrentSubscription] Found PREMIUM tier:', {
        productId: activeEntitlement.productIdentifier,
        expires: activeEntitlement.expirationDate,
        willRenew: activeEntitlement.willRenew,
        isCancelled,
        isInGracePeriod
      });
      
      const subscription = {
        tier: 'premium' as SubscriptionTier,
        expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
        isActive: true,
        isCancelled,
        isInGracePeriod
      };
      
      // Cache the subscription data for offline access
      await cacheSubscriptionData(subscription);
      
      return subscription;
    } else if (customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.BASIC];
      
      // Check if subscription is cancelled but not yet expired
      const isCancelled = activeEntitlement.willRenew === false;
      // We no longer use grace period - users go directly to free tier
      const isInGracePeriod = false;
      
      console.log('[RevenueCat.getCurrentSubscription] Found BASIC tier:', {
        productId: activeEntitlement.productIdentifier,
        expires: activeEntitlement.expirationDate,
        willRenew: activeEntitlement.willRenew,
        isCancelled,
        isInGracePeriod
      });
      
      const subscription = {
        tier: 'basic' as SubscriptionTier,
        expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
        isActive: true,
        isCancelled,
        isInGracePeriod
      };
      
      // Cache the subscription data for offline access
      await cacheSubscriptionData(subscription);
      
      return subscription;
    }
    
    // No active subscription - return free tier
    // Note: This is NOT a fallback - it's the legitimate case where user has no active subscription
    console.log('[RevenueCat.getCurrentSubscription] No active subscription, user is on free tier');
    
    const freeSubscription = {
      tier: 'free' as SubscriptionTier,
      expirationDate: null,
      isActive: false
    };
    
    // Cache free tier status too
    await cacheSubscriptionData(freeSubscription);
    
    return freeSubscription;
  } catch (error) {
    console.error('[RevenueCat.getCurrentSubscription] ❌ Fatal error:', error.message || error);
    console.error('[RevenueCat.getCurrentSubscription] Error type:', error.constructor.name);
    console.error('[RevenueCat.getCurrentSubscription] Stack trace:', error.stack);
    
    // Try to get cached data as fallback
    try {
      const cachedData = await getCachedSubscriptionData();
      if (cachedData) {
        console.log('[RevenueCat.getCurrentSubscription] Using cached subscription data after error');
        return cachedData;
      }
    } catch (cacheError) {
      console.error('[RevenueCat.getCurrentSubscription] Failed to get cached data:', cacheError);
    }
    
    // Return free tier as final fallback
    console.warn('[RevenueCat.getCurrentSubscription] Returning free tier as fallback due to error');
    return {
      tier: 'free',
      expirationDate: null,
      isActive: false
    };
  }
};

/**
 * Ensures that subscriptions purchased on one platform (iOS/Android) are recognized on other platforms
 * This should be called when a user logs in or when the app starts
 */
export const syncCrossPlatformEntitlements = async (): Promise<void> => {
  try {
    // Skip if using simulated data
    const useSimulatedData = await shouldUseSimulatedData();
    if (useSimulatedData) {
      console.log('[RevenueCat] Skipping cross-platform sync - using simulated data');
      return;
    }
    
    const Purchases = require('react-native-purchases').default;
    
    // Check if RevenueCat SDK has required methods
    if (!Purchases.getAppUserID || !Purchases.syncPurchases) {
      console.warn('[RevenueCat] Required methods not available in SDK - skipping cross-platform sync');
      return;
    }
    
    try {
      // Get the user ID from RevenueCat
      const currentAppUserID = await Purchases.getAppUserID();
      console.log('[RevenueCat] Current AppUserID:', currentAppUserID);
    
      // Only attempt to sync if syncPurchases method exists
      if (typeof Purchases.syncPurchases === 'function') {
        // Sync purchases across platforms
        const customerInfo = await Purchases.syncPurchases();
        console.log('[RevenueCat] Successfully synced purchases across platforms');
        
        if (customerInfo) {
          console.log('[RevenueCat] Active entitlements after sync:', 
            Object.keys(customerInfo.entitlements.active || {})
          );
        }
      } else {
        console.log('[RevenueCat] syncPurchases method not available in this SDK version - skipping');
      }
    } catch (syncError) {
      console.error('[RevenueCat] Failed to sync purchases:', syncError);
      // Continue - this is not a critical error
    }
  } catch (error) {
    console.error('[RevenueCat] Error in cross-platform sync:', error);
  }
};

/**
 * Syncs the subscription data from RevenueCat to Supabase database
 * Returns true if a sync occurred (data was updated), false otherwise
 */
export const syncSubscriptionWithDatabase = async (): Promise<boolean> => {
  try {
    console.log('[RevenueCat] Starting subscription sync with database...');
    
    // Skip sync if using simulated data
    const useSimulatedData = await shouldUseSimulatedData();
    if (useSimulatedData) {
      console.log('[RevenueCat] Skipping sync with database - using simulated data');
      return false;
    }
    
    // Import required functions from other services
    const { updateSubscriptionTier } = await import('./supabaseUsageService');
    const { getCurrentUser } = await import('./supabaseAuthService');
    const { supabase } = await import('../supabase/config');
    
    // Get current user
    const user = getCurrentUser();
    if (!user) {
      console.log('[RevenueCat] No authenticated user, skipping sync');
      return false;
    }
    
    // Try to get current subscription from RevenueCat
    let revenueCatSubscription;
    try {
      revenueCatSubscription = await getCurrentSubscription();
      console.log('[RevenueCat] RevenueCat subscription:', revenueCatSubscription);
      
      // Cache subscription data locally for offline access
      await cacheSubscriptionData(revenueCatSubscription);
    } catch (error) {
      console.error('[RevenueCat] Error getting current subscription, trying cached data:', error);
      // Try to get cached subscription data
      revenueCatSubscription = await getCachedSubscriptionData();
      
      if (!revenueCatSubscription) {
        console.error('[RevenueCat] No cached subscription data available');
        return false;
      }
      console.log('[RevenueCat] Using cached subscription data:', revenueCatSubscription);
    }
    
    // Get current subscription from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();
      
    if (userError) {
      console.error('[RevenueCat] Error fetching user data:', userError);
      return false;
    }
    
    const dbTier = userData?.subscription_tier || 'free';
    console.log(`[RevenueCat] Database subscription tier: ${dbTier}`);
    console.log(`[RevenueCat] RevenueCat subscription tier: ${revenueCatSubscription.tier}`);
    
    // If tiers are different, update database
    if (dbTier !== revenueCatSubscription.tier) {
      console.log(`[RevenueCat] Subscription tier mismatch. Updating database from '${dbTier}' to '${revenueCatSubscription.tier}'`);
      // Use safe update to handle race conditions
      const { updateSubscriptionTierSafe } = await import('./subscriptionUpdateSafe');
      await updateSubscriptionTierSafe(revenueCatSubscription.tier);
      console.log('[RevenueCat] Database updated with current subscription tier');
      return true;
    } else {
      console.log('[RevenueCat] Subscription tiers match, no update needed');
      return false;
    }
  } catch (error) {
    console.error('[RevenueCat] Error syncing subscription with database:', error);
    return false;
  }
};

// Helper function to determine tier from product ID
const getTierFromProductIdentifier = (productId: string): SubscriptionTier => {
  // Log for debugging
  console.log(`Trying to determine tier from product identifier: ${productId}`);
  
  // Check if productId directly contains a tier name
  const tierNames: SubscriptionTier[] = ['basic', 'premium', 'gold'];
  for (const tier of tierNames) {
    if (productId.toLowerCase().includes(tier.toLowerCase())) {
      console.log(`Found tier "${tier}" in product identifier`);
      return tier;
    }
  }
  
  // Check if productId contains one of our known tier IDs
  const tierIds = ['basic_tier', 'premium_tier', 'gold_tier', 'basic_tier3', 'premium_tier3', 'gold_tier3'];
  for (const tierId of tierIds) {
    if (productId.toLowerCase().includes(tierId.toLowerCase())) {
      // Extract the tier name from the ID - handle both formats
      const tier = tierId.startsWith('basic') ? 'basic' : 
                   tierId.startsWith('premium') ? 'premium' : 
                   tierId.startsWith('gold') ? 'gold' : 
                   tierId.split('_')[0] as SubscriptionTier;
      console.log(`Found tier ID "${tierId}" in product identifier, mapping to tier "${tier}"`);
      return tier;
    }
  }
  
  // Fallback: Check entitlement mapping
  for (const [key, value] of Object.entries(TIER_MAPPING)) {
    if (productId.includes(key)) {
      console.log(`Found entitlement key "${key}" in product identifier, mapping to tier "${value}"`);
      return value as SubscriptionTier;
    }
  }
  
  console.log(`Could not determine tier from product identifier, defaulting to free tier`);
  return 'free'; // Default to free tier
};

// Flag to track if we've logged restore purchases info
let _hasLoggedRestorePurchasesInfo = false;

// Restore purchases
export const restorePurchases = async (): Promise<CustomerInfo> => {
  console.log('[RevenueCat.restorePurchases] Starting to restore purchases...');
  
  try {
    // Use mock data based on manual configuration
    const useSimulatedData = await shouldUseSimulatedData();
    
    if (useSimulatedData) {
      // Log only the first time
      if (!_hasLoggedRestorePurchasesInfo) {
        console.warn('📱 [RevenueCat.restorePurchases] MOCK DATA - Using simulated mode');
        console.log('[RevenueCat.restorePurchases] Simulating restore in mock environment');
        _hasLoggedRestorePurchasesInfo = true;
      }
      
      const mockResult = {
        entitlements: {
          active: {},
          all: {}
        },
        originalAppUserId: 'dev_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      };
      
      console.log('[RevenueCat.restorePurchases] Mock restore complete:', {
        userId: mockResult.originalAppUserId,
        activeEntitlements: Object.keys(mockResult.entitlements.active),
        hasActiveSubscriptions: Object.keys(mockResult.entitlements.active).length > 0
      });
      
      return mockResult as CustomerInfo;
    }

    // Use the actual RevenueCat SDK
    try {
      const Purchases = require('react-native-purchases').default;
      // Log only the first time
      if (!_hasLoggedRestorePurchasesInfo) {
        console.log('📱 [RevenueCat.restorePurchases] REAL DATA - Using actual RevenueCat SDK');
        _hasLoggedRestorePurchasesInfo = true;
      }
      
      console.log('[RevenueCat.restorePurchases] Calling SDK restorePurchases...');
      const restoreResult = await Purchases.restorePurchases();
      
      if (!restoreResult || !restoreResult.customerInfo) {
        console.warn('[RevenueCat.restorePurchases] No customer info in restore result');
        throw new Error('Restore purchases returned no customer info');
      }
      
      console.log('[RevenueCat.restorePurchases] ✅ Restore successful:', {
        userId: restoreResult.customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(restoreResult.customerInfo.entitlements.active || {}),
        allEntitlements: Object.keys(restoreResult.customerInfo.entitlements.all || {}),
        hasActiveSubscriptions: Object.keys(restoreResult.customerInfo.entitlements.active || {}).length > 0
      });
      
      // After successful restore, sync subscription data with database
      try {
        console.log('[RevenueCat.restorePurchases] Syncing restored purchases with database...');
        const wasUpdated = await syncSubscriptionWithDatabase();
        if (wasUpdated) {
          console.log('[RevenueCat.restorePurchases] ✅ Database updated with restored subscription');
        } else {
          console.log('[RevenueCat.restorePurchases] ✓ No database update needed after restore');
        }
      } catch (syncError) {
        console.error('[RevenueCat.restorePurchases] ⚠️ Failed to sync with database after restore:', syncError);
        // Continue despite sync error - we'll try again later
      }
      
      return restoreResult.customerInfo;
    } catch (err) {
      console.error('[RevenueCat.restorePurchases] ❌ SDK restore failed:', err.message || err);
      console.error('[RevenueCat.restorePurchases] Error type:', err.constructor.name);
      console.error('[RevenueCat.restorePurchases] Error code:', err.code);
      console.error('[RevenueCat.restorePurchases] Stack trace:', err.stack);
      throw err;
    }
  } catch (error) {
    console.error('[RevenueCat.restorePurchases] ❌ Fatal error:', error.message || error);
    console.error('[RevenueCat.restorePurchases] Error type:', error.constructor.name);
    console.error('[RevenueCat.restorePurchases] Full error:', JSON.stringify(error, null, 2));
    console.error('[RevenueCat.restorePurchases] Stack trace:', error.stack);
    
    // Only return mock data if we're explicitly in simulated mode
    const useSimulatedData = await shouldUseSimulatedData();
    if (useSimulatedData) {
      console.warn('[RevenueCat.restorePurchases] In simulated mode, returning mock data');
      return {
        entitlements: { active: {}, all: {} },
        originalAppUserId: 'dev_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }
    
    // In real mode, always throw the error
    console.error('[RevenueCat.restorePurchases] In real mode, propagating error');
    throw error;
  }
};