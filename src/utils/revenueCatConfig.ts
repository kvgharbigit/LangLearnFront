/**
 * Manual configuration for RevenueCat behavior
 * 
 * This file allows explicit control over whether to use real RevenueCat data
 * or simulated data, bypassing the automatic environment detection.
 */

// Set this to true to force using simulated RevenueCat data
// Set this to false to force using real RevenueCat data
export const USE_SIMULATED_REVENUECAT = true;

// Explanation of settings:
// 
// USE_SIMULATED_REVENUECAT = true
// - Uses mock data for all RevenueCat operations (subscriptions, purchases, etc.)
// - No native RevenueCat SDK calls will be made
// - Safe to use in any environment, including Expo Go
// - Shows yellow warning box about simulated purchases
// - For testing UI without real payments
// 
// USE_SIMULATED_REVENUECAT = false
// - Uses real RevenueCat API calls
// - Requires native modules to be available
// - Will crash if used in Expo Go
// - Connects to RevenueCat sandbox in dev, real service in production
// - For testing real purchase flow