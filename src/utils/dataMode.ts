/**
 * Controls data source mode (real vs mock) for development environments
 * 
 * This utility enables easily switching between real and mock data
 * sources during development without modifying service code.
 */

// Environment detection functions
export const isDevelopment = (): boolean => {
  // React Native __DEV__ global
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  
  // Node.js environment variable
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV === 'development';
  }
  
  return false;
};

// Expo Go detection - can be implemented if needed
// export const isExpoGo = (): boolean => {
//   // Implementation depends on your setup
//   return false;
// };

/**
 * CONFIGURATION:
 * Set this to true to use real data in development mode
 * This overrides all mock data in the app
 * 
 * NOTE: RevenueCat will always use mock data in development
 * regardless of this setting due to SDK limitations
 */
const USE_REAL_DATA = true;

/**
 * Determines if the app should use mock data
 * 
 * @returns true if mock data should be used, false to use real data
 */
export const shouldUseMockData = (): boolean => {
  // In production, never use mock data
  if (!isDevelopment()) {
    return false;
  }
  
  // In development, use real data if configured
  if (USE_REAL_DATA) {
    return false;
  }
  
  // Default to using mock data in development
  return true;
};

// Helper for logging consistent data source messages
export const logDataSource = (serviceName: string, isUsingMock: boolean): void => {
  if (isUsingMock) {
    console.log(`[${serviceName}] Using mock data in development mode`);
  } else {
    console.log(`[${serviceName}] Using real data from Supabase`);
  }
};