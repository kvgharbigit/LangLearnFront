/**
 * Configuration for RevenueCat behavior
 * 
 * This file provides functions to determine whether to use real RevenueCat data
 * or simulated data. It can be controlled by the user preference or by environment.
 */

import { getSingleSetting, saveSingleAudioSetting } from './userPreferences';
import { PREFERENCE_KEYS } from './userPreferences';
import Constants from 'expo-constants';

// Default value - should be true in Expo Go to avoid native module errors
const DEFAULT_SIMULATE_VALUE = false;

// Check if we're running in Expo Go (which doesn't support native modules)
const isExpoGo = (): boolean => {
  // Multiple checks for Expo Go environment
  const isExpoOwnership = Constants.appOwnership === 'expo';
  const isStoreClient = Constants.executionEnvironment === 'storeClient';
  const isExpoURL = Constants.expoConfig?.slug || Constants.manifest?.slug;
  const isDevelopment = __DEV__;
  
  // In development or if any Expo Go indicators are present, use simulation
  const result = isDevelopment || isExpoOwnership || isStoreClient || !!isExpoURL;
  
  console.log('[RevenueCat Config] Expo Go detection:', {
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    expoSlug: Constants.expoConfig?.slug,
    manifestSlug: Constants.manifest?.slug,
    isDev: isDevelopment,
    result: result
  });
  
  return result;
};

// Determine if we should force simulation mode
const shouldForceSimulation = (): boolean => {
  const inExpoGo = isExpoGo();
  console.log('[RevenueCat Config] Environment check:', {
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    isDev: __DEV__,
    isExpoGo: inExpoGo
  });
  return inExpoGo;
};

/**
 * Get whether to simulate RevenueCat based on user preferences and environment
 * This is the main function that should be used to determine simulation mode
 */
export const getUseSimulatedRevenueCat = async (): Promise<boolean> => {
  try {
    // Force simulation in Expo Go to prevent native module errors
    if (shouldForceSimulation()) {
      console.log('[RevenueCat Config] Forcing simulation mode due to Expo Go environment');
      return true;
    }
    
    // Check user preferences for production builds
    const simulateFromPrefs = await getSingleSetting('SIMULATE_REVENUECAT', DEFAULT_SIMULATE_VALUE);
    
    // Log for debugging
    console.log(`RevenueCat simulation setting from preferences: ${simulateFromPrefs}`);
    
    return simulateFromPrefs;
  } catch (error) {
    console.error('Error getting RevenueCat simulation preference:', error);
    // Default to simulation in case of error to be safe
    return shouldForceSimulation() || DEFAULT_SIMULATE_VALUE;
  }
};

/**
 * Set whether to simulate RevenueCat
 * This function updates the user preference setting
 */
export const setUseSimulatedRevenueCat = async (value: boolean): Promise<void> => {
  try {
    // Save to user preferences
    await saveSingleAudioSetting('SIMULATE_REVENUECAT', value);
    
    // Log for debugging
    console.log(`RevenueCat simulation setting saved: ${value}`);
  } catch (error) {
    console.error('Error saving RevenueCat simulation preference:', error);
  }
};

/**
 * Legacy constant for backward compatibility - will be deprecated
 * New code should use getUseSimulatedRevenueCat() instead
 * Force true in development/Expo Go environments
 */
export const USE_SIMULATED_REVENUECAT = shouldForceSimulation() || DEFAULT_SIMULATE_VALUE;

// Explanation of settings:
// 
// simulateRevenueCat = true
// - Uses mock data for all RevenueCat operations (subscriptions, purchases, etc.)
// - No native RevenueCat SDK calls will be made
// - Safe to use in any environment, including Expo Go
// - Shows yellow warning box about simulated purchases
// - For testing UI without real payments
// 
// simulateRevenueCat = false
// - Uses real RevenueCat API calls
// - Requires native modules to be available
// - Will crash if used in Expo Go
// - Connects to RevenueCat sandbox in dev, real service in production
// - For testing real purchase flow