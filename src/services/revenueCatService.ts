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
// Only checks user preferences (ignores environment)
export const shouldUseSimulatedData = async (): Promise<boolean> => {
  try {
    // Check user preference only
    const { getUseSimulatedRevenueCat } = await import('../utils/revenueCatConfig');
    const simulateFromPrefs = await getUseSimulatedRevenueCat();
    
    console.log(`RevenueCat simulation mode: ${simulateFromPrefs ? 'SIMULATED' : 'REAL'} (user preference)`);
    
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
  // Since we can't check async preferences here, use the static config value
  console.log(`RevenueCat simulation mode (sync): ${USE_SIMULATED_REVENUECAT ? 'SIMULATED' : 'REAL'} (legacy config)`);
  return USE_SIMULATED_REVENUECAT;
};

// Initialize RevenueCat
export const initializeRevenueCat = async (userId?: string) => {
  const useSimulatedData = await shouldUseSimulatedData();
  const { getDeploymentEnvironment } = require('../utils/deviceInfo');
  const deployEnv = getDeploymentEnvironment();
  
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
    console.log('[RevenueCat] Fallback Config (USE_SIMULATED_REVENUECAT):', USE_SIMULATED_REVENUECAT);
    console.log('[RevenueCat] Final decision: Using simulated data =', useSimulatedData);
    
    try {
      const Constants = require('expo-constants');
      console.log('[RevenueCat] App ownership:', Constants.appOwnership);
      console.log('[RevenueCat] Execution environment:', Constants.executionEnvironment);
      console.log('[RevenueCat] Platform:', Platform.OS, Platform.Version);

      const appVersion = Constants.manifest?.version || Constants.manifest2?.version || 'unknown';
      console.log('[RevenueCat] App Version:', appVersion);
    } catch (e) {
      console.error('[RevenueCat] Error accessing expo-constants:', e);
    }
    
    _hasLoggedRevenueCatInit = true;
  }
  
  // Check if we should use simulated data (based on user preference)
  if (useSimulatedData) {
    console.log('📱 [RevenueCat] SIMULATED MODE - Using user preference');
    console.log('📱 [RevenueCat] All operations will use mock data');
    return;
  }
  
  console.log(`📱 [RevenueCat] REAL MODE - Using actual RevenueCat API on ${Platform.OS}`); 

  try {
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    console.log('[RevenueCat] Using API key for platform:', Platform.OS);
    
    try {
      const Purchases = require('react-native-purchases');
      console.log('[RevenueCat] SDK loaded successfully');
      
      // Configure with proper API key and user ID
      const config = { 
        apiKey, 
        appUserID: userId,
        observerMode: false
      };
      console.log('[RevenueCat] Configuring with:', { ...config, apiKey: 'hidden' });
      
      Purchases.configure(config);
      
      // Set debug logs only in development builds
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        console.log('[RevenueCat] Debug logging enabled');
      } else {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
        console.log('[RevenueCat] Error-only logging enabled');
      }
      
      console.log('[RevenueCat] ✅ Initialization complete');
    } catch (err) {
      console.error('[RevenueCat] ❌ Failed to load SDK:', err.message || err);
      console.error('[RevenueCat] SDK Error details:', JSON.stringify(err, null, 2));
      throw err;
    }
  } catch (error) {
    console.error('[RevenueCat] ❌ Initialization failed:', error.message || error);
    console.error('[RevenueCat] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

// Import utilities at the top level
import { shouldUseMockData, logDataSource } from '../utils/dataMode';

// Flag to track if we've logged the offerings info
let _hasLoggedOfferingsInfo = false;

// Get available packages
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  console.log('[RevenueCat.getOfferings] Starting to fetch available packages...');
  
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
    const Purchases = require('react-native-purchases');
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
      const Purchases = require('react-native-purchases');
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
          
          // Update the usage limits for the new tier
          await updateSubscriptionTier(newTier);
          console.log(`[RevenueCat.purchasePackage] ✅ Usage limits updated for tier: ${newTier}`);
        } catch (err) {
          console.error('[RevenueCat.purchasePackage] ⚠️ Failed to update usage limits:', err.message || err);
          console.error('[RevenueCat.purchasePackage] Will continue despite usage update failure');
          // Continue with the purchase flow even if updating usage limits fails
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

// Get current subscription info
export const getCurrentSubscription = async (): Promise<{
  tier: SubscriptionTier;
  expirationDate: Date | null;
  isActive: boolean;
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

    // Use the actual RevenueCat SDK
    const Purchases = require('react-native-purchases');
    console.log('[RevenueCat.getCurrentSubscription] Calling SDK getCustomerInfo...');
    const customerInfo = await Purchases.getCustomerInfo();
    
    if (!customerInfo) {
      const error = new Error('No customer info returned from RevenueCat SDK');
      console.error('[RevenueCat.getCurrentSubscription] ❌ No customer info');
      throw error;
    }
    
    console.log('[RevenueCat.getCurrentSubscription] Customer info received:', {
      userId: customerInfo.originalAppUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
      allEntitlements: Object.keys(customerInfo.entitlements.all || {})
    });
    
    // Check for active entitlements starting with the highest tier
    if (customerInfo.entitlements.active[ENTITLEMENTS.GOLD]) {
      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.GOLD];
      console.log('[RevenueCat.getCurrentSubscription] Found GOLD tier:', {
        productId: activeEntitlement.productIdentifier,
        expires: activeEntitlement.expirationDate
      });
      return {
        tier: 'gold',
        expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
        isActive: true
      };
    } else if (customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM]) {
      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM];
      console.log('[RevenueCat.getCurrentSubscription] Found PREMIUM tier:', {
        productId: activeEntitlement.productIdentifier,
        expires: activeEntitlement.expirationDate
      });
      return {
        tier: 'premium',
        expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
        isActive: true
      };
    } else if (customerInfo.entitlements.active[ENTITLEMENTS.BASIC]) {
      const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.BASIC];
      console.log('[RevenueCat.getCurrentSubscription] Found BASIC tier:', {
        productId: activeEntitlement.productIdentifier,
        expires: activeEntitlement.expirationDate
      });
      return {
        tier: 'basic',
        expirationDate: activeEntitlement.expirationDate ? new Date(activeEntitlement.expirationDate) : null,
        isActive: true
      };
    }
    
    // No active subscription - return free tier
    // Note: This is NOT a fallback - it's the legitimate case where user has no active subscription
    console.log('[RevenueCat.getCurrentSubscription] No active subscription, user is on free tier');
    return {
      tier: 'free',
      expirationDate: null,
      isActive: false
    };
  } catch (error) {
    console.error('[RevenueCat.getCurrentSubscription] ❌ Fatal error:', error.message || error);
    console.error('[RevenueCat.getCurrentSubscription] Error type:', error.constructor.name);
    console.error('[RevenueCat.getCurrentSubscription] Full error:', JSON.stringify(error, null, 2));
    console.error('[RevenueCat.getCurrentSubscription] Stack trace:', error.stack);
    
    // Don't hide errors in real mode - throw them so they can be properly handled
    const useSimulatedData = await shouldUseSimulatedData();
    if (!useSimulatedData) {
      console.error('[RevenueCat.getCurrentSubscription] In real mode, propagating error');
      throw error;
    }
    
    // Only return default in simulated mode
    console.warn('[RevenueCat.getCurrentSubscription] In simulated mode, returning free tier');
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
      const Purchases = require('react-native-purchases');
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