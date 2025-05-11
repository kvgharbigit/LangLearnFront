// src/hooks/useRevenueCatSettings.ts
import { useEffect } from 'react';
import { getSingleSetting, saveSingleAudioSetting } from '../utils/userPreferences';
import { USE_SIMULATED_REVENUECAT } from '../utils/revenueCatConfig';

/**
 * This hook synchronizes the RevenueCat settings between:
 * 1. The static config in revenueCatConfig.ts
 * 2. The persisted user preference setting
 * 
 * This allows the toggle in the UI to control the actual behavior of RevenueCat
 */
export const useRevenueCatSettings = () => {
  // On initial load, sync the settings
  useEffect(() => {
    const syncSettings = async () => {
      try {
        // Get the current user preference setting
        const simulateRevenueCat = await getSingleSetting('SIMULATE_REVENUECAT', false);
        
        // Log the settings for debugging
        console.log('RevenueCat Settings - From preferences:', simulateRevenueCat);
        console.log('RevenueCat Settings - From config:', USE_SIMULATED_REVENUECAT);
        
        // At this point, we can't directly modify the USE_SIMULATED_REVENUECAT constant
        // as it's imported from a module. However, the shouldUseSimulatedData function
        // in revenueCatService.ts will check both this value and the user preference.
        
        // We can log the effective setting
        console.log('RevenueCat Settings - Effective setting will respect preference value:', simulateRevenueCat);
      } catch (err) {
        console.error('Error synchronizing RevenueCat settings:', err);
      }
    };
    
    syncSettings();
  }, []);
};

/**
 * Get the effective RevenueCat simulation setting
 * This is exposed for components that need to know the current setting
 */
export const getEffectiveRevenueCatSetting = async (): Promise<boolean> => {
  try {
    const simulateRevenueCat = await getSingleSetting('SIMULATE_REVENUECAT', false);
    return simulateRevenueCat;
  } catch (err) {
    console.error('Error getting effective RevenueCat setting:', err);
    return USE_SIMULATED_REVENUECAT; // Fall back to the static config
  }
};

export default useRevenueCatSettings;