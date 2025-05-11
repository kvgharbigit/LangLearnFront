// src/services/revenueCatService.ts
import { Platform } from 'react-native';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';
import { updateSubscriptionTier } from './supabaseUsageService';
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

// RevenueCat API keys
const API_KEYS = {
  ios: 'appl_UkqSKmpgpYcEwGsRLwROiWopqQj',
  android: 'goog_CqytRKXWMJjpxZrlAjZLycGdFHy'
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
    BASIC: 'basic_tier',
    PREMIUM: 'premium_tier',
    GOLD: 'gold_tier'
  },
  // Android product IDs (Play Store)
  android: {
    BASIC: 'basic_tier:monthly',
    PREMIUM: 'premium_tier:monthly',
    GOLD: 'gold_tier:monthly'
  }
}) || {
  // Default fallback if platform not detected
  BASIC: 'basic_tier',
  PREMIUM: 'premium_tier',
  GOLD: 'gold_tier'
};

// Map entitlement IDs to subscription tiers
const TIER_MAPPING = {
  [ENTITLEMENTS.BASIC]: 'basic',
  [ENTITLEMENTS.PREMIUM]: 'premium',
  [ENTITLEMENTS.GOLD]: 'gold'
};

// Whether we've logged the RevenueCat initialization info
let _hasLoggedRevenueCatInit = false;

// Function to determine if we should use simulated data
// Checks user preferences and environment settings
export const shouldUseSimulatedData = async (): Promise<boolean> => {
  // HIGHEST PRIORITY: If we're in production mode (__DEV__ is false), always use real data
  if (__DEV__ === false) {
    console.log('💰 Production environment detected via __DEV__ - forcing real RevenueCat');
    return false;
  }
  
  try {
    // SECONDARY CHECK: Check user preference (highest priority in development)
    const { getUseSimulatedRevenueCat } = await import('../utils/revenueCatConfig');
    const simulateFromPrefs = await getUseSimulatedRevenueCat();
    
    // Use the user preference if in dev mode
    if (__DEV__) {
      return simulateFromPrefs;
    }
    
    // FALLBACK CHECK: If we're in TestFlight or Production according to DEPLOY_ENV, NEVER use simulated data
    try {
      const deployEnv = process.env.DEPLOY_ENV;
      if (deployEnv === 'testflight' || deployEnv === 'production') {
        console.log('💰 TestFlight/Production environment detected via DEPLOY_ENV - forcing real RevenueCat');
        return false;
      }
    } catch (e) {
      // Ignore errors checking process.env
    }
    
    // In development mode, use the user preference
    return simulateFromPrefs;
  } catch (error) {
    console.error('Error checking simulation preference:', error);
    
    // Fallback to the legacy constant for backward compatibility
    return __DEV__ && USE_SIMULATED_REVENUECAT;
  }
};

// Synchronous version for backward compatibility
// This will eventually be deprecated in favor of the async version
export const shouldUseSimulatedDataSync = (): boolean => {
  // HIGHEST PRIORITY: If we're in production mode (__DEV__ is false), always use real data
  if (__DEV__ === false) {
    return false;
  }
  
  // SECONDARY CHECK: If manually set to false, always use real data
  if (USE_SIMULATED_REVENUECAT === false) {
    return false;
  }
  
  // FALLBACK CHECK: If we're in TestFlight or Production according to DEPLOY_ENV, NEVER use simulated data
  try {
    const deployEnv = process.env.DEPLOY_ENV;
    if (deployEnv === 'testflight' || deployEnv === 'production') {
      return false;
    }
  } catch (e) {
    // Ignore errors checking process.env
  }
  
  // In development mode with manual config set to true, use simulated data
  return __DEV__ && USE_SIMULATED_REVENUECAT;
};

// Initialize RevenueCat
export const initializeRevenueCat = async (userId?: string) => {
  const useSimulatedData = await shouldUseSimulatedData();
  const { getDeploymentEnvironment } = require('../utils/deviceInfo');
  const deployEnv = getDeploymentEnvironment();
  
  // Only log initialization details once
  if (!_hasLoggedRevenueCatInit) {
    console.log('------ RevenueCat Initialization ------');
    console.log('Environment detection priority:');
    console.log('1. __DEV__ =', __DEV__, '(primary check)');
    
    // Get the user preference for logging
    let userPref = "unknown";
    try {
      const { getUseSimulatedRevenueCat } = await import('../utils/revenueCatConfig');
      userPref = String(await getUseSimulatedRevenueCat());
    } catch (e) {
      userPref = "error";
    }
    
    console.log('2. User Preference =', userPref, '(secondary check - development only)');
    console.log('3. Manual Config (USE_SIMULATED_REVENUECAT) =', USE_SIMULATED_REVENUECAT, '(fallback check)');
    console.log('4. Deployment Environment =', deployEnv, '(safety check)');
    console.log('Final decision: Using simulated data =', useSimulatedData);
    
    try {
      const Constants = require('expo-constants');
      console.log('Constants.appOwnership =', Constants.appOwnership);
      console.log('Constants.executionEnvironment =', Constants.executionEnvironment);
      console.log('process.env.DEPLOY_ENV =', process.env.DEPLOY_ENV || 'not set');

      // 🧪 More specific debugging for environment detection
      const expoSDKVersion = Constants.expoVersion || 'unknown';
      const appVersion = Constants.manifest?.version || Constants.manifest2?.version || 'unknown';
      console.log('SDK Version:', expoSDKVersion);
      console.log('App Version:', appVersion);
    } catch (e) {
      console.log('Error accessing expo-constants:', e);
    }
    
    _hasLoggedRevenueCatInit = true;
  }
  
  // Check if we should use simulated data (based on user preference)
  if (useSimulatedData) {
    console.log('📱 RevenueCat: SIMULATED MODE - Using user preference or config');
    console.log('📱 Using mock data for purchases and subscriptions');
    return;
  }
  
  const modeDesc = deployEnv === 'production' ? 'PRODUCTION' : 
                   deployEnv === 'testflight' ? 'TESTFLIGHT' : 
                   'DEVELOPMENT';
  
  console.log(`📱 RevenueCat: ${modeDesc} MODE - Using real RevenueCat API on ${Platform.OS}`); 

  try {
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    try {
      const Purchases = require('react-native-purchases');
      
      // Configure with proper API key and user ID
      Purchases.configure({ 
        apiKey, 
        appUserID: userId,
        observerMode: false  // Ensure observer mode is off in production
      });
      
      // Set debug logs only in development builds
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      } else {
        // In production, use minimal logging
        Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
      }
      
      console.log('RevenueCat initialized with SDK and api key');
    } catch (err) {
      console.error('Failed to load RevenueCat SDK:', err);
    }
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
  }
};

// Import utilities at the top level
import { shouldUseMockData, logDataSource } from '../utils/dataMode';

// Flag to track if we've logged the offerings info
let _hasLoggedOfferingsInfo = false;

// Get available packages
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  try {
    // Use mock data based on user preference or environment
    const useSimulatedData = await shouldUseSimulatedData();
    
    if (useSimulatedData) {
      logDataSource('SubscriptionService', true);
      // Log only the first time
      if (!_hasLoggedOfferingsInfo) {
        console.warn('📱 RevenueCat getOfferings: MOCK DATA - Using simulated mode');
        console.warn('⚠️ Using mock subscription packages');
        _hasLoggedOfferingsInfo = true;
      }
      
      // Create mock packages based on subscription plans
      return SUBSCRIPTION_PLANS
        .filter(plan => plan.tier !== 'free') // Exclude free tier
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
        })) as PurchasesPackage[];
    }
    
    logDataSource('SubscriptionService', false);
    // Log only the first time
    if (!_hasLoggedOfferingsInfo) {
      console.log('📱 RevenueCat getOfferings: REAL DATA - Using actual RevenueCat SDK');
      _hasLoggedOfferingsInfo = true;
    }

    // Use actual RevenueCat SDK for production builds
    try {
      const Purchases = require('react-native-purchases');
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current && offerings.current.availablePackages) {
        console.log('Received offerings from RevenueCat:', offerings.current.identifier);
        return offerings.current.availablePackages;
      } else {
        console.warn('No offerings available from RevenueCat');
        return [];
      }
    } catch (err) {
      console.error('Failed to get offerings from RevenueCat SDK:', err);
      return [];
    }
  } catch (error) {
    console.error('Error fetching offerings:', error);
    // Return empty array instead of throwing in Expo Go
    try {
      // Check if we should use simulated data as a fallback
      if (await shouldUseSimulatedData()) return [];
    } catch {
      // If that fails, use the sync version as a last resort
      if (shouldUseSimulatedDataSync()) return [];
    }
    throw error;
  }
};

// Flag to track if we've logged purchase info
let _hasLoggedPurchaseInfo = false;

// Purchase a package
export const purchasePackage = async (
  pckg: PurchasesPackage
): Promise<CustomerInfo> => {
  try {
    // Use mock data based on user preference or environment
    const useSimulatedData = await shouldUseSimulatedData();
    
    if (useSimulatedData) {
      // Log only the first time, plus the specific package ID
      if (!_hasLoggedPurchaseInfo) {
        console.warn('📱 RevenueCat purchasePackage: MOCK DATA - Using simulated mode');
        _hasLoggedPurchaseInfo = true;
      }
      console.log('Simulating purchase for package:', pckg.identifier);
      
      // Create mock customerInfo response
      const mockTier = pckg.identifier === PRODUCT_IDS.BASIC ? 'basic' : 
                       pckg.identifier === PRODUCT_IDS.PREMIUM ? 'premium' : 
                       pckg.identifier === PRODUCT_IDS.GOLD ? 'gold' : 'free';
                       
      // Determine which entitlement to use based on the tier
      const entitlementToUse = mockTier === 'basic' ? ENTITLEMENTS.BASIC :
                               mockTier === 'premium' ? ENTITLEMENTS.PREMIUM :
                               mockTier === 'gold' ? ENTITLEMENTS.GOLD : null;
      
      // Return a mock CustomerInfo object
      return {
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
      } as CustomerInfo;
    }

    // Use actual RevenueCat SDK 
    try {
      const Purchases = require('react-native-purchases');
      // Log only the first time, plus the specific package ID
      if (!_hasLoggedPurchaseInfo) {
        console.log('📱 RevenueCat purchasePackage: REAL DATA - Using actual RevenueCat SDK');
        _hasLoggedPurchaseInfo = true;
      }
      console.log('Purchasing package from RevenueCat:', pckg.identifier);
      
      // Make the purchase with the SDK
      const purchaseResult = await Purchases.purchasePackage(pckg);
      console.log('Purchase successful');
      
      // If successful purchase, update the subscription tier in our usage tracking system
      if (purchaseResult.customerInfo) {
        try {
          // Determine the tier from the purchased package
          const newTier = getTierFromProductIdentifier(pckg.product.identifier);
          
          // Update the usage limits for the new tier
          await updateSubscriptionTier(newTier);
          console.log(`Usage limits updated for new tier: ${newTier}`);
        } catch (err) {
          console.error('Error updating usage limits after purchase:', err);
          // Continue with the purchase flow even if updating usage limits fails
        }
      }
      
      return purchaseResult.customerInfo;
    } catch (err) {
      console.error('Error with RevenueCat purchase:', err);
      throw err;
    }
  } catch (error) {
    // Check if we should use simulated data in the error handler
    try {
      const useSimulatedData = await shouldUseSimulatedData();
      
      // Use mock data when in simulated mode
      if (useSimulatedData) {
        console.warn('📱 RevenueCat error handler: MOCK DATA - Using simulated mode');
        // In development, return a mock response instead of throwing
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
    } catch (e) {
      // If checking simulation mode fails, use the sync version as fallback
      if (shouldUseSimulatedDataSync()) {
        console.warn('📱 RevenueCat error handler: MOCK DATA (fallback) - Using simulated mode');
        return {
          entitlements: { active: {}, all: {} },
          originalAppUserId: 'dev_mock_user',
          managementURL: null,
          originalPurchaseDate: new Date().toISOString(),
        } as CustomerInfo;
      }
    }
    
    console.error('Error purchasing package:', error);
    throw error;
  }
};

// Flag to track if we've logged subscription info
let _hasLoggedSubscriptionInfo = false;

// Get current subscription info
export const getCurrentSubscription = async (): Promise<{
  tier: SubscriptionTier;
  expirationDate: Date | null;
  isActive: boolean;
}> => {
  try {
    // Use mock data based on manual configuration
    if (shouldUseSimulatedData()) {
      logDataSource('SubscriptionService', true);
      // Log only the first time
      if (!_hasLoggedSubscriptionInfo) {
        console.warn('📱 RevenueCat getCurrentSubscription: MOCK DATA - Using simulated mode');
        console.warn('⚠️ Using mock free subscription');
        _hasLoggedSubscriptionInfo = true;
      }
      return {
        tier: 'free',
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      };
    }
    
    logDataSource('SubscriptionService', false);
    // Log only the first time
    if (!_hasLoggedSubscriptionInfo) {
      console.log('📱 RevenueCat getCurrentSubscription: REAL DATA - Using actual RevenueCat SDK');
      _hasLoggedSubscriptionInfo = true;
    }

    // Use the actual RevenueCat SDK
    try {
      const Purchases = require('react-native-purchases');
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check for active entitlements starting with the highest tier
      if (customerInfo && customerInfo.entitlements.active[ENTITLEMENTS.GOLD]) {
        const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.GOLD];
        return {
          tier: 'gold',
          expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
          isActive: true
        };
      } else if (customerInfo && customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM]) {
        const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
        return {
          tier: 'premium',
          expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
          isActive: true
        };
      } else if (customerInfo && customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
        const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.BASIC];
        return {
          tier: 'basic',
          expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
          isActive: true
        };
      }
      
      // No active subscription - return free tier
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    } catch (err) {
      console.error('Error getting customer info from RevenueCat:', err);
      // Default to free tier if SDK fails
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }
  } catch (error) {
    console.error('Error getting subscription info:', error);
    // Return default free tier in case of errors
    return {
      tier: 'free',
      expirationDate: null,
      isActive: false
    };
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
  const tierIds = ['basic_tier', 'premium_tier', 'gold_tier'];
  for (const tierId of tierIds) {
    if (productId.toLowerCase().includes(tierId.toLowerCase())) {
      // Extract the tier name from the ID
      const tier = tierId.split('_')[0] as SubscriptionTier;
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
  try {
    // Use mock data based on manual configuration
    if (shouldUseSimulatedData()) {
      // Log only the first time
      if (!_hasLoggedRestorePurchasesInfo) {
        console.warn('📱 RevenueCat restorePurchases: MOCK DATA - Using simulated mode');
        console.log('Simulating restore purchases in development environment');
        _hasLoggedRestorePurchasesInfo = true;
      }
      // Return a mock CustomerInfo object
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

    // Use the actual RevenueCat SDK
    try {
      const Purchases = require('react-native-purchases');
      // Log only the first time
      if (!_hasLoggedRestorePurchasesInfo) {
        console.log('📱 RevenueCat restorePurchases: REAL DATA - Using actual RevenueCat SDK');
        _hasLoggedRestorePurchasesInfo = true;
      }
      const restoreResult = await Purchases.restorePurchases();
      
      console.log('Purchases restored successfully');
      return restoreResult.customerInfo;
    } catch (err) {
      console.error('Error restoring purchases with RevenueCat SDK:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error restoring purchases:', error);
    
    // In simulated mode, return a default mock instead of throwing
    if (shouldUseSimulatedData()) {
      return {
        entitlements: { active: {}, all: {} },
        originalAppUserId: 'dev_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }
    
    throw error;
  }
};