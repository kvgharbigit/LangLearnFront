import { Platform } from 'react-native';

/**
 * Detects if the app is running in Expo Go or another environment that should use simulated RevenueCat
 * This is the key check for determining whether to use real or simulated RevenueCat
 */

// Cache variable to store the detection result
let _isExpoGoCache: boolean | null = null;
let _hasLoggedEnvironment = false;

export const isExpoGo = (): boolean => {
  // Return cached result if available to avoid repeated checks and logs
  if (_isExpoGoCache !== null) {
    return _isExpoGoCache;
  }
  
  if (Platform.OS === 'web') {
    _isExpoGoCache = false;
    return false;
  }
  
  // Production builds CANNOT be running in Expo Go
  // This provides an absolute guarantee
  try {
    // Check for production build signals first
    if (process.env.DEPLOY_ENV === 'production') {
      _isExpoGoCache = false;
      return false;
    }
  } catch (e) {
    // Ignore errors checking process.env
  }
  
  try {
    // Method 1: Primary Check - Use the expo-constants package to check environment
    const Constants = require('expo-constants');
    
    // IMPORTANT: In Expo Go builds, appOwnership will be 'expo'
    // In standalone builds (TestFlight, App Store), it will be 'standalone'
    // In custom dev builds (expo run:ios), it will be 'guest'
    
    // Method 2: Secondary Check - Use DEPLOY_ENV environment variable from eas.json
    const deployEnv = process.env.DEPLOY_ENV;
    
    // Log environment details only once per app session
    if (!_hasLoggedEnvironment) {
      console.log('📱 Environment Detection:');
      console.log('- Constants.appOwnership:', Constants.appOwnership);
      console.log('- Constants.executionEnvironment:', Constants.executionEnvironment);
      console.log('- Expo SDK Version:', Constants.expoVersion || 'unknown');
      console.log('- App Version:', Constants.manifest?.version || Constants.manifest2?.version || 'unknown');
      console.log('- React Native Version:', Platform.constants?.reactNativeVersion?.version || 'unknown');
      console.log('- Is Device:', Constants.isDevice ? 'Yes' : 'No');
      console.log('- __DEV__:', __DEV__);
      console.log('- Device:', Platform.OS);
      console.log('- DEPLOY_ENV:', deployEnv || 'not set');
      _hasLoggedEnvironment = true;
    }
    
    // Direct check for Expo Go
    if (Constants.appOwnership === 'expo') {
      _isExpoGoCache = true;
      return true;
    }
    
    // If we have a deployment environment set by EAS, it's a reliable indicator
    if (deployEnv) {
      // If it's explicitly set to production or testflight, we're not in Expo Go
      if (deployEnv === 'production' || deployEnv === 'testflight') {
        _isExpoGoCache = false;
        return false;
      }
      // If it's set to dev, check if it's a development client
      if (deployEnv === 'dev' && Constants.appOwnership === 'guest') {
        _isExpoGoCache = false; // Custom dev client, not Expo Go
        return false;
      }
    }
    
    // Fallback checks
    // If appOwnership is standalone, we're definitely not in Expo Go
    if (Constants.appOwnership === 'standalone') {
      _isExpoGoCache = false;
      return false;
    }
    
    // If appOwnership is undefined and we're in dev mode, assume Expo Go
    if (Constants.appOwnership === undefined && __DEV__ === true) {
      // Only log the 'uncertain' message once, not on every check
      if (!_hasLoggedEnvironment) {
        console.log('📱 Environment uncertain, defaulting to Expo Go behavior');
        console.log('- This is likely an Expo Go session with incomplete environment data');
        console.log('- Using simulated RevenueCat to prevent native module errors');
      }
      _isExpoGoCache = true;
      return true;
    }
    
    // If nothing else matched, default based on appOwnership
    const result = Constants.appOwnership !== 'standalone' && Constants.appOwnership !== 'guest';
    _isExpoGoCache = result;
    return result;
  } catch (e) {
    // If we can't access Constants properly, assume we need to use mocks
    if (!_hasLoggedEnvironment) {
      console.log('📱 Error in environment detection:', e);
      console.log('- Defaulting to using simulated data');
    }
    _isExpoGoCache = true;
    return true;
  }
};

/**
 * Returns the deployment environment based on EAS build configuration
 * This is useful for different behaviors in different environments
 */
export const getDeploymentEnvironment = (): 'development' | 'testflight' | 'production' | 'unknown' => {
  try {
    // Check for environment variable from eas.json
    const deployEnv = process.env.DEPLOY_ENV;
    
    if (deployEnv === 'dev') return 'development';
    if (deployEnv === 'testflight') return 'testflight';
    if (deployEnv === 'production') return 'production';
    
    // Fallback to checking Constants.appOwnership
    const Constants = require('expo-constants');
    
    if (Constants.appOwnership === 'expo') return 'development';
    if (Constants.appOwnership === 'guest') return 'development';
    if (Constants.appOwnership === 'standalone') {
      // If we can't distinguish between TestFlight and App Store, default to production
      return 'production';
    }
    
    return 'unknown';
  } catch (e) {
    console.log('Error determining deployment environment:', e);
    return 'unknown';
  }
};

/**
 * Detects if the app is running on a physical device (vs simulator/emulator)
 * This is used to enable RevenueCat on physical devices even in development
 */
export const isPhysicalDevice = (): boolean => {
  try {
    if (Platform.OS === 'ios') {
      const Constants = require('expo-constants');
      // On physical iOS devices, deviceName is typically "iPhone" or similar
      // while simulator has names like "iPhone Simulator"
      return !Constants.deviceName?.includes('Simulator');
    } else if (Platform.OS === 'android') {
      // For Android, check for emulator characteristics
      const Constants = require('expo-constants');
      
      // Check for common emulator indicators
      const brand = Constants.deviceName?.toLowerCase() || '';
      const model = Constants.modelName?.toLowerCase() || '';
      
      // Common emulator identifiers
      const emulatorIdentifiers = ['emulator', 'sdk', 'android sdk', 'genymotion', 'sdk_phone', 'sdk_gphone'];
      
      // Return true if none of the emulator identifiers are found in brand or model
      return !emulatorIdentifiers.some(id => brand.includes(id) || model.includes(id));
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Checks if the app is running in a production build
 * Production builds will NEVER be running in Expo Go
 */
export const isProductionBuild = (): boolean => {
  try {
    // Process.env.DEPLOY_ENV from EAS.json is the most reliable way to check
    if (process.env.DEPLOY_ENV === 'production') {
      return true;
    }
    
    // Check Constants.appOwnership - 'standalone' means App Store or TestFlight
    const Constants = require('expo-constants');
    if (Constants.appOwnership === 'standalone') {
      return true;
    }
    
    // If __DEV__ is false, we're almost certainly in a production build
    if (__DEV__ === false) {
      return true;
    }
    
    return false;
  } catch (e) {
    // If we can't check, assume based on __DEV__
    return __DEV__ === false;
  }
};

/**
 * Returns if the app is running in a development environment
 * This is the opposite of isProductionBuild
 */
export const isDevelopment = (): boolean => {
  return !isProductionBuild();
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

/**
 * Gets the app version (returns '1.0.0' as fallback)
 */
export const getVersion = (): string => {
  try {
    const Constants = require('expo-constants');
    return Constants.manifest?.version || Constants.manifest2?.version || '1.0.0';
  } catch (e) {
    return '1.0.0';
  }
};

/**
 * Gets detailed device info for logging purposes
 */
export const getDetailedDeviceInfo = () => {
  const platformInfo = getPlatformInfo();
  
  return {
    platform: platformInfo.platform,
    version: platformInfo.version,
    isIOS: platformInfo.isIOS,
    isAndroid: platformInfo.isAndroid,
    appVersion: getVersion(),
    isDevelopment: isDevelopment(),
    isExpoGo: isExpoGo(),
    timestamp: new Date().toISOString()
  };
};

export default {
  isExpoGo,
  isDevelopment,
  isProductionBuild,
  isPhysicalDevice,
  getPlatformInfo,
  getStoreText,
  getVersion,
  getDetailedDeviceInfo,
  getDeploymentEnvironment
};