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
  if (isExpoGo()) {
    console.log('RevenueCat initialization skipped in Expo Go');
    return;
  }

  try {
    const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;
    
    // This would normally use the Purchases SDK but we skip it in Expo Go
    console.log('RevenueCat initialized with', apiKey);
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
  }
};

// Get available packages
export const getOfferings = async (): Promise<PurchasesPackage[]> => {
  try {
    // In Expo Go, return mock packages based on subscription plans
    if (isExpoGo()) {
      console.log('Returning mock subscription packages in Expo Go');
      // Create mock packages based on subscription plans
      return SUBSCRIPTION_PLANS
        .filter(plan => plan.tier !== 'free') // Exclude free tier
        .map(plan => ({
          identifier: plan.id,
          packageType: 'MONTHLY',
          product: {
            identifier: plan.id,
            title: `${plan.name} Plan`,
            description: `${plan.name} subscription with ${plan.monthlyCredits} credits per month`,
            price: plan.price,
            priceString: `$${plan.price.toFixed(2)}`,
            currencyCode: 'USD',
          },
          offering: {
            identifier: 'default'
          }
        })) as PurchasesPackage[];
    }

    // This would normally use the Purchases SDK but we skip it in Expo Go
    console.log('Would fetch offerings from RevenueCat');
    return [];
  } catch (error) {
    console.error('Error fetching offerings:', error);
    // Return empty array instead of throwing in Expo Go
    if (isExpoGo()) return [];
    throw error;
  }
};

// Purchase a package
export const purchasePackage = async (
  pckg: PurchasesPackage
): Promise<CustomerInfo> => {
  try {
    // In Expo Go, simulate a successful purchase
    if (isExpoGo()) {
      console.log('Simulating purchase in Expo Go for package:', pckg.identifier);
      
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
        originalAppUserId: 'expo_go_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }

    // This would normally use the Purchases SDK but we skip it in Expo Go
    console.log('Would purchase package from RevenueCat:', pckg.identifier);
    throw new Error('Real purchases not available in Expo Go');
  } catch (error) {
    if (isExpoGo()) {
      // In Expo Go, return a mock response instead of throwing
      return {
        entitlements: {
          active: {},
          all: {}
        },
        originalAppUserId: 'expo_go_mock_user',
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
    // In Expo Go, return simulated subscription
    if (isExpoGo()) {
      console.log('Returning mock subscription in Expo Go');
      // Check local storage for any mock subscription set during testing
      // For simplicity, we'll just return the free tier here
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }

    // This would normally use the Purchases SDK but we skip it in Expo Go
    console.log('Would get customer info from RevenueCat');
    
    // Default to free tier if no active entitlements
    return {
      tier: 'free',
      expirationDate: null,
      isActive: false
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    // Return default free tier in case of errors, especially in Expo Go
    if (isExpoGo()) {
      return {
        tier: 'free',
        expirationDate: null,
        isActive: false
      };
    }
    throw error;
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
    // In Expo Go, return a mock response
    if (isExpoGo()) {
      console.log('Simulating restore purchases in Expo Go');
      // Return a mock CustomerInfo object
      return {
        entitlements: {
          active: {},
          all: {}
        },
        originalAppUserId: 'expo_go_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }

    // This would normally use the Purchases SDK but we skip it in Expo Go
    console.log('Would restore purchases from RevenueCat');
    throw new Error('Restore purchases not available in Expo Go');
  } catch (error) {
    console.error('Error restoring purchases:', error);
    
    // In Expo Go, return a default mock instead of throwing
    if (isExpoGo()) {
      return {
        entitlements: { active: {}, all: {} },
        originalAppUserId: 'expo_go_mock_user',
        managementURL: null,
        originalPurchaseDate: new Date().toISOString(),
      } as CustomerInfo;
    }
    
    throw error;
  }
};