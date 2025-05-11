// src/utils/diagnostics.ts
import { getDetailedDeviceInfo } from './deviceInfo';
import NetInfo from '@react-native-community/netinfo';

/**
 * Records of different diagnostic events for troubleshooting
 */
export enum DiagnosticType {
  INIT_FAILURE = 'init_failure',
  VERIFY_FAILURE = 'verify_failure',
  AUTH_FAILURE = 'auth_failure',
  NETWORK_ISSUE = 'network_issue',
  API_ERROR = 'api_error'
}

/**
 * Captures diagnostic information for troubleshooting
 * Modified to only log to console and not store in AsyncStorage to prevent iOS CFNetwork.StorageDB assertion timeouts
 */
export const captureDiagnostics = async (
  type: DiagnosticType,
  userId: string | null,
  details: Record<string, any>
): Promise<void> => {
  try {
    // Get current network info
    const networkState = await NetInfo.fetch();
    const networkInfo = {
      isConnected: networkState.isConnected,
      type: networkState.type,
      isInternetReachable: networkState.isInternetReachable
    };
    
    // Get device info
    const deviceInfo = getDetailedDeviceInfo();
    
    // Create diagnostic entry
    const diagnostic = {
      type,
      userId,
      timestamp: new Date().toISOString(),
      details,
      device: deviceInfo,
      network: networkInfo
    };
    
    // Just log to console instead of storing in AsyncStorage
    console.log(`Diagnostic [${type}]:`, JSON.stringify(diagnostic, null, 2));
  } catch (error) {
    console.error('Failed to capture diagnostic information:', error);
  }
};

/**
 * Retrieve diagnostic information for a specific type
 * No longer retrieves from AsyncStorage
 */
export const getDiagnostics = async (type: DiagnosticType): Promise<any[]> => {
  console.log(`getDiagnostics called for type ${type} - AsyncStorage storage disabled`);
  return [];
};

/**
 * Retrieve all diagnostic events (condensed format)
 * No longer retrieves from AsyncStorage
 */
export const getAllDiagnostics = async (): Promise<any[]> => {
  console.log('getAllDiagnostics called - AsyncStorage storage disabled');
  return [];
};

/**
 * Clears all diagnostic data
 * No longer clears AsyncStorage keys
 */
export const clearDiagnostics = async (): Promise<void> => {
  console.log('clearDiagnostics called - AsyncStorage storage disabled');
};

export default {
  DiagnosticType,
  captureDiagnostics,
  getDiagnostics,
  getAllDiagnostics,
  clearDiagnostics
};