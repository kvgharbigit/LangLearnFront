// src/utils/diagnostics.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    
    // Get existing diagnostics
    const key = `@confluency:diagnostics_${type}`;
    const existingData = await AsyncStorage.getItem(key);
    const diagnostics = existingData ? JSON.parse(existingData) : [];
    
    // Add new diagnostic to beginning of array
    diagnostics.unshift(diagnostic);
    
    // Keep up to 10 diagnostics per type
    if (diagnostics.length > 10) {
      diagnostics.length = 10;
    }
    
    // Save back to storage
    await AsyncStorage.setItem(key, JSON.stringify(diagnostics));
    
    // Also save to the all diagnostics key for easy access
    const allKey = '@confluency:all_diagnostics';
    const allDiagnosticsJson = await AsyncStorage.getItem(allKey);
    const allDiagnostics = allDiagnosticsJson ? JSON.parse(allDiagnosticsJson) : [];
    
    // Add to all diagnostics
    allDiagnostics.unshift({
      type,
      userId,
      timestamp: new Date().toISOString(),
      detailsSize: JSON.stringify(details).length
    });
    
    // Keep last 20 items
    if (allDiagnostics.length > 20) {
      allDiagnostics.length = 20;
    }
    
    await AsyncStorage.setItem(allKey, JSON.stringify(allDiagnostics));
    
    console.log(`Diagnostic information captured for ${type}`);
  } catch (error) {
    console.error('Failed to capture diagnostic information:', error);
  }
};

/**
 * Retrieve diagnostic information for a specific type
 */
export const getDiagnostics = async (type: DiagnosticType): Promise<any[]> => {
  try {
    const key = `@confluency:diagnostics_${type}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve diagnostic information:', error);
    return [];
  }
};

/**
 * Retrieve all diagnostic events (condensed format)
 */
export const getAllDiagnostics = async (): Promise<any[]> => {
  try {
    const key = '@confluency:all_diagnostics';
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve all diagnostic information:', error);
    return [];
  }
};

/**
 * Clears all diagnostic data
 */
export const clearDiagnostics = async (): Promise<void> => {
  try {
    // Clear specific types
    for (const type of Object.values(DiagnosticType)) {
      await AsyncStorage.removeItem(`@confluency:diagnostics_${type}`);
    }
    
    // Clear all diagnostics list
    await AsyncStorage.removeItem('@confluency:all_diagnostics');
    
    console.log('All diagnostic information cleared');
  } catch (error) {
    console.error('Failed to clear diagnostic information:', error);
  }
};

export default {
  DiagnosticType,
  captureDiagnostics,
  getDiagnostics,
  getAllDiagnostics,
  clearDiagnostics
};