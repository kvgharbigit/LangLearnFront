// src/utils/initializeUserData.ts
import { supabase } from '../supabase/config';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDetailedDeviceInfo } from './deviceInfo';
import { captureDiagnostics, DiagnosticType } from './diagnostics';
import { API_URL } from './api';

/**
 * Configuration for initialization attempts
 */
const INIT_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  TIMEOUT_MS: 15000
};

/**
 * Helper for structured logging of initialization events
 */
const logInit = (level: 'info' | 'warn' | 'error', attempt: number, stage: string, message: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[Init ${timestamp}][Attempt ${attempt}][${stage}]`;
  
  if (level === 'info') {
    console.log(`${logPrefix} ${message}`, details !== undefined ? details : '');
  } else if (level === 'warn') {
    console.warn(`${logPrefix} ${message}`, details !== undefined ? details : '');
  } else if (level === 'error') {
    console.error(`${logPrefix} ${message}`, details !== undefined ? details : '');
  }
};

/**
 * Initializes user data in the backend by making API calls to ensure
 * database tables are created for the user.
 * 
 * This enhanced version includes:
 * - Multiple fallback methods
 * - Network state detection
 * - Timeout protection
 * - Exponential backoff for retries
 * 
 * @param userId The Supabase user ID
 * @returns A promise that resolves to true if initialization is successful, false otherwise
 */
export const initializeUserData = async (userId: string): Promise<boolean> => {
  const initStartTime = Date.now();
  const initialAttempt = 0;
  const deviceInfo = {
    ...getDetailedDeviceInfo(),
    connectionType: 'unknown'
  };
  
  logInit('info', initialAttempt, 'START', `Initializing user data for ID ${userId}`, { initStartTime, deviceInfo });
  
  // Check network connectivity first
  const networkState = await NetInfo.fetch();
  deviceInfo.connectionType = networkState.type;
  
  if (!networkState.isConnected || networkState.isInternetReachable === false) {
    logInit('error', initialAttempt, 'NETWORK', 'Cannot initialize user data while offline', {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
      type: networkState.type
    });
    return false;
  }
  
  logInit('info', initialAttempt, 'NETWORK', 'Network connectivity verified', {
    isConnected: networkState.isConnected,
    type: networkState.type
  });
  
  // Only use the direct initialization method with retries
  let attempts = 0;
  const methodResults: Record<string, any> = {
    existingUserCheck: { attempted: false, success: false, error: null },
    directInitialization: { attempted: false, success: false, error: null, status: null, response: null }
  };
  
  while (attempts < INIT_CONFIG.MAX_RETRIES) {
    attempts++;
    const attemptStartTime = Date.now();
    
    logInit('info', attempts, 'ATTEMPT', `Starting initialization attempt ${attempts}/${INIT_CONFIG.MAX_RETRIES}`, {
      attemptStartTime,
      previousResults: JSON.stringify(methodResults)
    });
    
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use the API URL from api.ts
      logInit('info', attempts, 'CONFIG', `Using backend URL for initialization`, { backendUrl: API_URL });
      
      // Method 1: First check if the user record already exists in our database
      logInit('info', attempts, 'METHOD1', `Checking if user already exists in database tables`);
      methodResults.existingUserCheck.attempted = true;
      
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      // If the user record exists, no need to initialize
      if (existingUser) {
        logInit('info', attempts, 'METHOD1', 'User data already exists in database, initialization complete', { 
          user_id: existingUser.user_id 
        });
        methodResults.existingUserCheck.success = true;
        
        // Log final success statistics
        const totalTime = Date.now() - initStartTime;
        logInit('info', attempts, 'SUCCESS', `User initialization succeeded via existing record check`, {
          totalTime,
          attempts,
          methodResults
        });
        
        return true;
      }
      
      if (checkError) {
        logInit('warn', attempts, 'METHOD1', 'Error checking user existence in database', { 
          error: checkError.message,
          code: checkError.code,
          details: checkError.details
        });
        methodResults.existingUserCheck.error = {
          message: checkError.message,
          code: checkError.code
        };
      } else {
        logInit('info', attempts, 'METHOD1', 'User does not exist in database, will try direct initialization');
      }
      
      // Method 2: Direct initialization with the correct endpoint and headers
      const endpoint = `${API_URL}/user/initialize-user`;
      logInit('info', attempts, 'METHOD2', 'Using direct initialization endpoint', {
        endpoint,
        method: 'POST'
      });
      
      methodResults.directInitialization.attempted = true;
      
      // Use seconds instead of milliseconds to avoid integer overflow
      const timestamp = Math.floor(Date.now() / 1000);
      const userData = {
        user_id: userId,
        subscription_tier: 'free',
        subscription_start: timestamp,
        billing_cycle_start: timestamp,
        billing_cycle_end: timestamp + (30 * 24 * 60 * 60), // 30 days in seconds
      };
      
      logInit('info', attempts, 'METHOD2', 'Prepared initialization data', { userData });
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          logInit('warn', attempts, 'METHOD2', 'Request timeout exceeded', { 
            timeoutMs: INIT_CONFIG.TIMEOUT_MS 
          });
        }, INIT_CONFIG.TIMEOUT_MS);
        
        const requestStartTime = Date.now();
        const headers = {
          'Content-Type': 'application/json',
          'X-Initialize-User': 'true',
          'X-User-Id': userId
        };
        
        if (session && session.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        logInit('info', attempts, 'METHOD2', 'Sending initialization request with headers', { headers });
        
        // Using the correct endpoint with proper headers - Use API_URL directly to avoid undefined issues
        const response = await fetch(`${API_URL}/user/initialize-user`, {
          method: 'POST',
          headers,
          body: JSON.stringify(userData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const requestDuration = Date.now() - requestStartTime;
        
        methodResults.directInitialization.status = response.status;
        methodResults.directInitialization.duration = requestDuration;
        
        if (response.ok) {
          methodResults.directInitialization.success = true;
          let result = null;
          
          try {
            result = await response.json();
            methodResults.directInitialization.response = result;
            
            logInit('info', attempts, 'METHOD2', 'User data initialized successfully via direct initialization endpoint', {
              status: response.status,
              duration: requestDuration,
              result
            });
          } catch (parseError) {
            logInit('info', attempts, 'METHOD2', 'User data initialized successfully (could not parse response)', {
              status: response.status,
              duration: requestDuration
            });
          }
          
          // Log final success statistics
          const totalTime = Date.now() - initStartTime;
          logInit('info', attempts, 'SUCCESS', `User initialization succeeded via direct initialization endpoint`, {
            totalTime,
            attempts,
            methodResults
          });
          
          return true;
        } else {
          let errorText = '';
          let errorDetail = null;
          
          try {
            errorText = await response.text();
            
            try {
              errorDetail = JSON.parse(errorText);
              methodResults.directInitialization.error = {
                status: response.status,
                statusText: response.statusText,
                json: errorDetail
              };
              
              logInit('error', attempts, 'METHOD2', 'Direct initialization failed with JSON error', {
                status: response.status,
                statusText: response.statusText,
                duration: requestDuration,
                errorDetail
              });
            } catch (parseError) {
              // If not JSON, just log the text
              methodResults.directInitialization.error = {
                status: response.status,
                statusText: response.statusText,
                text: errorText
              };
              
              logInit('error', attempts, 'METHOD2', 'Direct initialization failed with text error', {
                status: response.status,
                statusText: response.statusText,
                duration: requestDuration,
                errorText
              });
            }
          } catch (responseError) {
            methodResults.directInitialization.error = {
              status: response.status,
              statusText: response.statusText,
              message: 'Could not read error response'
            };
            
            logInit('error', attempts, 'METHOD2', 'Direct initialization failed (could not read error response)', {
              status: response.status,
              statusText: response.statusText,
              duration: requestDuration
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'Unknown error type';
        
        methodResults.directInitialization.error = {
          message: errorMessage,
          type: errorName
        };
        
        logInit('error', attempts, 'METHOD2', 'Error during direct initialization', {
          error: errorMessage,
          type: errorName,
          isAbortError: error instanceof Error && error.name === 'AbortError'
        });
      }
      
      // If we get here, all methods failed for this attempt
      // Wait with exponential backoff before next attempt
      if (attempts < INIT_CONFIG.MAX_RETRIES) {
        const delay = INIT_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempts - 1);
        logInit('info', attempts, 'RETRY', `All methods failed, retrying initialization`, {
          nextAttempt: attempts + 1,
          maxRetries: INIT_CONFIG.MAX_RETRIES,
          delay,
          methodResults
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Unknown error type';
      const errorStack = error instanceof Error ? error.stack : null;
      
      logInit('error', attempts, 'UNEXPECTED', 'Unexpected error during initialization', {
        error: errorMessage,
        type: errorName,
        stack: errorStack
      });
      
      // Wait before retry
      if (attempts < INIT_CONFIG.MAX_RETRIES) {
        const delay = INIT_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempts - 1);
        logInit('info', attempts, 'RETRY', `Retrying after unexpected error`, {
          nextAttempt: attempts + 1,
          maxRetries: INIT_CONFIG.MAX_RETRIES,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we get here, all initialization attempts failed
  const totalTime = Date.now() - initStartTime;
  
  logInit('error', INIT_CONFIG.MAX_RETRIES, 'FAILURE', 'All initialization attempts failed', {
    totalTime,
    attempts: INIT_CONFIG.MAX_RETRIES,
    methodResults
  });
  
  // Before throwing, collect diagnostic info for later debugging
  const diagnosticInfo = {
    userId,
    totalTime,
    attempts: INIT_CONFIG.MAX_RETRIES,
    methodResults,
    deviceInfo,
    timestamp: new Date().toISOString()
  };
  
  // Save diagnostic info using both old and new methods for compatibility
  try {
    // Legacy storage method (for backward compatibility)
    const key = '@confluency:last_init_failure';
    const failuresKey = '@confluency:init_failures';
    
    // Save most recent failure directly
    await AsyncStorage.setItem(key, JSON.stringify(diagnosticInfo));
    
    // Also append to history of failures (keeping last 3)
    try {
      const failuresJson = await AsyncStorage.getItem(failuresKey);
      let failures = failuresJson ? JSON.parse(failuresJson) : [];
      
      // Add new failure at the beginning
      failures.unshift({
        timestamp: new Date().toISOString(),
        userId,
        methods: Object.keys(methodResults).map(method => ({
          method,
          attempted: methodResults[method].attempted,
          success: methodResults[method].success,
          error: methodResults[method].error ? true : false
        }))
      });
      
      // Keep only last 3 failures
      if (failures.length > 3) {
        failures = failures.slice(0, 3);
      }
      
      await AsyncStorage.setItem(failuresKey, JSON.stringify(failures));
    } catch (historyError) {
      console.error('Failed to update initialization failure history:', historyError);
    }
    
    // New enhanced diagnostics method
    await captureDiagnostics(
      DiagnosticType.INIT_FAILURE,
      userId,
      {
        totalTime,
        attempts: INIT_CONFIG.MAX_RETRIES,
        methodResults: {
          existingUserCheck: {
            attempted: methodResults.existingUserCheck.attempted,
            success: methodResults.existingUserCheck.success,
            hasError: !!methodResults.existingUserCheck.error
          },
          subscriptionEndpoint: {
            attempted: methodResults.subscriptionEndpoint.attempted,
            success: methodResults.subscriptionEndpoint.success,
            hasError: !!methodResults.subscriptionEndpoint.error,
            status: methodResults.subscriptionEndpoint.status
          },
          directInitialization: {
            attempted: methodResults.directInitialization.attempted,
            success: methodResults.directInitialization.success,
            hasError: !!methodResults.directInitialization.error,
            status: methodResults.directInitialization.status
          }
        }
      }
    );
  } catch (e) {
    console.error('Failed to save diagnostic info:', e);
  }
  
  throw new Error(`Failed to initialize user data after ${INIT_CONFIG.MAX_RETRIES} attempts. User ID: ${userId}`);
};

export default initializeUserData;