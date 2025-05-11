/**
 * Configuration for RevenueCat behavior
 * 
 * This file provides functions to determine whether to use real RevenueCat data
 * or simulated data. It can be controlled by the user preference or by environment.
 */

import { getSingleSetting, saveSingleAudioSetting } from './userPreferences';
import { PREFERENCE_KEYS } from './userPreferences';

// Default value - can be overridden by user preferences
const DEFAULT_SIMULATE_VALUE = false;

/**
 * Get whether to simulate RevenueCat based on user preferences
 * This is the main function that should be used to determine simulation mode
 */
export const getUseSimulatedRevenueCat = async (): Promise<boolean> => {
  try {
    // Check user preferences first
    const simulateFromPrefs = await getSingleSetting('SIMULATE_REVENUECAT', DEFAULT_SIMULATE_VALUE);
    
    // Log for debugging
    console.log(`RevenueCat simulation setting from preferences: ${simulateFromPrefs}`);
    
    return simulateFromPrefs;
  } catch (error) {
    console.error('Error getting RevenueCat simulation preference:', error);
    return DEFAULT_SIMULATE_VALUE;
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
 */
export const USE_SIMULATED_REVENUECAT = DEFAULT_SIMULATE_VALUE;

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