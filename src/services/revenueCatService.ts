// src/services/revenueCatService.ts
import { Platform } from 'react-native';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';

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

// RevenueCat API keys (replace with your actual keys)
const API_KEYS = {
  ios: 'YOUR_IOS_API_KEY',
  android: 'goog_CqytRKXWMJjpxZrlAjZLycGdFHy'
};

// Map RevenueCat entitlement IDs to our subscription tiers
const ENTITLEMENT_ID = 'language_tutor_premium';
const TIER_MAPPING = {
  'free_tier': 'free',
  'basic_tier': 'basic',
  'premium_tier': 'premium',
  'pro_tier': 'pro'
};

// Helper to detect if running in Expo Go
const isExpoGo = () => {
  // In Expo Go, application is bundled differently
  const noBundleIdentifier = !Platform.constants.reactNativeVersion;
  return noBundleIdentifier || typeof Platform.constants.brand === 'undefined';
};

// Initialize RevenueCat
export const initializeRevenueCat = (userId?: string) => {
  // Import isExpoGo and isDevelopment from deviceInfo.ts to ensure we're using the updated detection
  const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
  
  // Skip initialization in Expo Go or development environment
  if (isExpoGo()) {
    console.log('RevenueCat initialization skipped in Expo Go');
    return;
  }

  try {
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    // Use Purchases SDK in production builds
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

// Get available packages
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  try {
    // Import isExpoGo and isDevelopment from deviceInfo.ts
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    
    // In Expo Go or development mode, return mock packages based on subscription plans
    if (isExpoGo() || isDevelopment()) {
      console.log('Returning mock subscription packages in development environment');
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
    // Import isExpoGo and isDevelopment from deviceInfo.ts
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    
    // In Expo Go or development environment, simulate a successful purchase
    if (isExpoGo() || isDevelopment()) {
      console.log('Simulating purchase in development environment for package:', pckg.identifier);
      
      // Create mock customerInfo response
      const mockTier = pckg.identifier.includes('basic_tier') ? 'basic' : 
                       pckg.identifier.includes('premium_tier') ? 'premium' : 
                       pckg.identifier.includes('pro_tier') ? 'pro' : 'free';
                       
      // Return a mock CustomerInfo object
      return {
        entitlements: {
          active: {
            [ENTITLEMENT_ID]: {
              productIdentifier: pckg.identifier,
              isSandbox: true,
              expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            }
          },
          all: {}
        },
        originalAppUserId: 'dev_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }

    // Use actual RevenueCat SDK for production builds
    try {
      const Purchases = require('react-native-purchases');
      console.log('Purchasing package from RevenueCat:', pckg.identifier);
      
      // Make the purchase with the SDK
      const purchaseResult = await Purchases.purchasePackage(pckg);
      console.log('Purchase successful');
      
      return purchaseResult.customerInfo;
    } catch (err) {
      console.error('Error with RevenueCat purchase:', err);
      throw err;
    }
  } catch (error) {
    // Import isExpoGo and isDevelopment from deviceInfo.ts again to ensure it's available in this scope
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    
    if (isExpoGo() || isDevelopment()) {
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
    // Import isExpoGo and isDevelopment from deviceInfo.ts
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    
    // In Expo Go or development environment, return simulated subscription
    if (isExpoGo() || isDevelopment()) {
      console.log('Returning mock subscription in development environment');
      // Check local storage for any mock subscription set during testing
      // In development, return a premium tier for testing
      console.log('Returning mock premium subscription for development');
      return {
        tier: 'premium',
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
      };
    }

    // In production, use the actual RevenueCat SDK
    try {
      const Purchases = require('react-native-purchases');
      const customerInfo = await Purchases.getCustomerInfo();
      
      if (customerInfo && customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        // User has an active subscription
        const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        const productId = activeEntitlement.productIdentifier;
        const tier = getTierFromProductIdentifier(productId);
        
        return {
          tier,
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
    // Import isExpoGo and isDevelopment from deviceInfo.ts
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    
    // In Expo Go or development environment, return a mock response
    if (isExpoGo() || isDevelopment()) {
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

    // In production, use the actual RevenueCat SDK
    try {
      const Purchases = require('react-native-purchases');
      const restoreResult = await Purchases.restorePurchases();
      
      console.log('Purchases restored successfully');
      return restoreResult.customerInfo;
    } catch (err) {
      console.error('Error restoring purchases with RevenueCat SDK:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error restoring purchases:', error);
    
    // In development, return a default mock instead of throwing
    const { isExpoGo, isDevelopment } = require('../utils/deviceInfo');
    if (isExpoGo() || isDevelopment()) {
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