import { Platform } from 'react-native';

/**
 * Detects if the app is running in Expo Go
 * This can be used to provide alternate implementations for features that
 * require native modules not available in Expo Go
 */
export const isExpoGo = (): boolean => {
  // More reliable way to detect Expo Go environment
  if (Platform.OS === 'web') return false;
  
  try {
    // Check for Expo Constants
    const Constants = require('expo-constants');
    // executionEnvironment will be 'storeClient' if it's a production build from store
    return Constants.executionEnvironment !== 'storeClient' && 
           Constants.executionEnvironment !== 'standalone';
  } catch (e) {
    // Fallback method for detection (less reliable)
    const noBundleIdentifier = !Platform.constants.reactNativeVersion;
    return noBundleIdentifier || typeof Platform.constants.brand === 'undefined';
  }
};

/**
 * Returns if the app is running in a development environment
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Returns platform-specific information
 */
export const getPlatformInfo = (): {
  platform: string;
  isIOS: boolean;
  isAndroid: boolean;
  version: string | number;
} => {
  return {
    platform: Platform.OS,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
    version: Platform.Version,
  };
};

/**
 * Returns a formatted string for displaying subscription-related text
 * based on the platform (iOS or Android)
 */
export const getStoreText = (): string => {
  return Platform.OS === 'ios' ? 'App Store' : 'Google Play Store';
};

export default {
  isExpoGo,
  isDevelopment,
  getPlatformInfo,
  getStoreText,
};