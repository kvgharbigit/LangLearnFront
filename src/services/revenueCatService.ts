// src/services/revenueCatService.ts
import { Platform } from 'react-native';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';
import { updateSubscriptionTier } from './supabaseUsageService';

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

// Map product IDs to our subscription tiers
const PRODUCT_IDS = {
  BASIC: 'basic_tier:monthly',
  PREMIUM: 'premium_tier:monthly',
  GOLD: 'gold_tier:monthly'
};

// Map entitlement IDs to subscription tiers
const TIER_MAPPING = {
  [ENTITLEMENTS.BASIC]: 'basic',
  [ENTITLEMENTS.PREMIUM]: 'premium',
  [ENTITLEMENTS.GOLD]: 'gold'
};

// Helper to detect if running in Expo Go
const isExpoGo = () => {
  // In Expo Go, application is bundled differently
  const noBundleIdentifier = !Platform.constants.reactNativeVersion;
  return noBundleIdentifier || typeof Platform.constants.brand === 'undefined';
};

// Initialize RevenueCat
export const initializeRevenueCat = (userId?: string) => {
  // Import isExpoGo and isPhysicalDevice from deviceInfo.ts
  const { isExpoGo, isPhysicalDevice } = require('../utils/deviceInfo');
  
  // Skip initialization in Expo Go
  if (isExpoGo()) {
    console.log('📱 RevenueCat: DISABLED - Running in Expo Go');
    return;
  }

  // Initialize on physical devices, skip on simulators/emulators
  const isPhysical = isPhysicalDevice();
  if (!isPhysical) {
    console.log('📱 RevenueCat: DISABLED - Not running on physical device');
    return;
  }
  
  console.log(`📱 RevenueCat: ENABLED - Running on physical ${Platform.OS} device`);

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

// Detect if running in TestFlight
const isTestFlight = (): boolean => {
  if (Platform.OS === 'ios') {
    try {
      const Constants = require('expo-constants');
      // Test if it's a standalone app (not Expo Go)
      return Constants.appOwnership === 'standalone' && 
             Constants.executionEnvironment === 'standalone';
    } catch (e) {
      return false;
    }
  }
  return false;
};

// Get available packages
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  try {
    // Check if we should be using mock data
    const { isExpoGo, isPhysicalDevice } = require('../utils/deviceInfo');
    
    // Only use RevenueCat on physical devices that are not running in Expo Go
    const isExpoGoRunning = isExpoGo();
    const isPhysicalDeviceRunning = isPhysicalDevice();
    const useMockData = isExpoGoRunning || !isPhysicalDeviceRunning;
    
    // In Expo Go or when configured to use mock data, return mock packages
    if (useMockData) {
      logDataSource('SubscriptionService', true);
      if (isExpoGoRunning) {
        console.warn('📱 RevenueCat getOfferings: MOCK DATA - Running in Expo Go');
      } else if (!isPhysicalDeviceRunning) {
        console.warn('📱 RevenueCat getOfferings: MOCK DATA - Not running on physical device');
      }
      console.warn('⚠️ Using mock subscription packages');
      
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
    console.log('📱 RevenueCat getOfferings: REAL DATA - Using actual RevenueCat SDK');

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
    const { isExpoGo } = require('../utils/deviceInfo');
    if (isExpoGo()) return [];
    throw error;
  }
};

// Purchase a package
export const purchasePackage = async (
  pckg: PurchasesPackage
): Promise<CustomerInfo> => {
  try {
    // Import isExpoGo and isPhysicalDevice from deviceInfo.ts
    const { isExpoGo, isPhysicalDevice } = require('../utils/deviceInfo');
    
    // Only use RevenueCat on physical devices that are not running in Expo Go
    const isExpoGoRunning = isExpoGo();
    const isPhysicalDeviceRunning = isPhysicalDevice();
    
    if (isExpoGoRunning || !isPhysicalDeviceRunning) {
      if (isExpoGoRunning) {
        console.warn('📱 RevenueCat purchasePackage: MOCK DATA - Running in Expo Go');
      } else if (!isPhysicalDeviceRunning) {
        console.warn('📱 RevenueCat purchasePackage: MOCK DATA - Not running on physical device');
      }
      console.log('Simulating purchase in development environment for package:', pckg.identifier);
      
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
      console.log('📱 RevenueCat purchasePackage: REAL DATA - Using actual RevenueCat SDK');
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
    // Import isExpoGo and isPhysicalDevice from deviceInfo.ts
    const { isExpoGo, isPhysicalDevice } = require('../utils/deviceInfo');
    
    // Only use RevenueCat on physical devices that are not running in Expo Go
    const isExpoGoRunning = isExpoGo();
    const isPhysicalDeviceRunning = isPhysicalDevice();
    
    if (isExpoGoRunning || !isPhysicalDeviceRunning) {
      if (isExpoGoRunning) {
        console.warn('📱 RevenueCat restorePurchases (error handler): MOCK DATA - Running in Expo Go');
      } else if (!isPhysicalDeviceRunning) {
        console.warn('📱 RevenueCat restorePurchases (error handler): MOCK DATA - Not running on physical device');
      }
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
    console.error('Error purchasing package:', error);
    throw error;
  }
};

// Get current subscription info
export const getCurrentSubscription = async (): Promise<{
  tier: SubscriptionTier;
  expirationDate: Date | null;
  isActive: boolean;
}> => {
  try {
    // Check if we should be using mock data
    const { isExpoGo, isPhysicalDevice } = require('../utils/deviceInfo');
    
    // Only use RevenueCat on physical devices that are not running in Expo Go
    const isExpoGoRunning = isExpoGo();
    const isPhysicalDeviceRunning = isPhysicalDevice();
    const useMockData = isExpoGoRunning || !isPhysicalDeviceRunning;
    
    // In Expo Go or when configured to use mock data, return simulated subscription
    if (useMockData) {
      logDataSource('SubscriptionService', true);
      if (isExpoGoRunning) {
        console.warn('📱 RevenueCat getCurrentSubscription: MOCK DATA - Running in Expo Go');
      } else if (!isPhysicalDeviceRunning) {
        console.warn('📱 RevenueCat getCurrentSubscription: MOCK DATA - Not running on physical device');
      }
      console.warn('⚠️ Using mock free subscription');
      return {
        tier: 'free',
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      };
    }
    
    logDataSource('SubscriptionService', false);
    console.log('📱 RevenueCat getCurrentSubscription: REAL DATA - Using actual RevenueCat SDK');

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
  for (const [key, value] of Object.entries(TIER_MAPPING)) {
    if (productId.includes(key)) {
      return value as SubscriptionTier;
    }
  }
  return 'free'; // Default to free tier
};

// Restore purchases
export const restorePurchases = async (): Promise<CustomerInfo> => {
  try {
    // Import isExpoGo and isPhysicalDevice from deviceInfo.ts
    const { isExpoGo, isPhysicalDevice } = require('../utils/deviceInfo');
    
    // Only use RevenueCat on physical devices that are not running in Expo Go
    const isExpoGoRunning = isExpoGo();
    const isPhysicalDeviceRunning = isPhysicalDevice();
    
    if (isExpoGoRunning || !isPhysicalDeviceRunning) {
      if (isExpoGoRunning) {
        console.warn('📱 RevenueCat restorePurchases: MOCK DATA - Running in Expo Go');
      } else if (!isPhysicalDeviceRunning) {
        console.warn('📱 RevenueCat restorePurchases: MOCK DATA - Not running on physical device');
      }
      console.log('Simulating restore purchases in development environment');
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
      console.log('📱 RevenueCat restorePurchases: REAL DATA - Using actual RevenueCat SDK');
      const restoreResult = await Purchases.restorePurchases();
      
      console.log('Purchases restored successfully');
      return restoreResult.customerInfo;
    } catch (err) {
      console.error('Error restoring purchases with RevenueCat SDK:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error restoring purchases:', error);
    
    // In development (but not TestFlight), return a default mock instead of throwing
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    if (isExpoGo() || (isDevelopment() && !isTestFlight())) {
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