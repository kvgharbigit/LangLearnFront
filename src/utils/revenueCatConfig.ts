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
  // Very strict detection - only trigger in actual Expo Go development client
  // Err on the side of production to avoid simulation mode in real apps
  const isExpoOwnership = Constants.appOwnership === 'expo';
  const isExpoDevClient = Constants.executionEnvironment === 'bare' || Constants.executionEnvironment === 'storeClient';
  const hasExpoDevHost = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri;
  
  // Only simulate if ALL conditions are met for true Expo Go environment
  const result = isExpoOwnership && isExpoDevClient && !!hasExpoDevHost;
  
  console.log('[RevenueCat Config] Expo Go detection (strict):', {
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    hostUri: Constants.expoConfig?.hostUri || Constants.manifest?.hostUri,
    isExpoOwnership,
    isExpoDevClient,
    hasExpoDevHost: !!hasExpoDevHost,
    isDev: __DEV__,
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