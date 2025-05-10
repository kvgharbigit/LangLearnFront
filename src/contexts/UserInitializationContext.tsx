// src/contexts/UserInitializationContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { initializeUserData } from '../utils/initializeUserData';
import { verifyUserDataExists } from '../utils/verifyUserData';

// Key for storing initialization status
const INIT_STATUS_KEY = '@confluency:user_initialization_status';

// Enum for initialization states
export enum InitializationStatus {
  UNKNOWN = 'unknown',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  REQUIRES_RETRY = 'requires_retry'
}

// Define context type
interface UserInitContextType {
  initStatus: InitializationStatus;
  initError: string | null;
  isInitialized: boolean;
  isInitializing: boolean;
  hasInitFailed: boolean;
  initializeUser: (userId: string) => Promise<boolean>;
  verifyAndInitUser: (userId: string) => Promise<boolean>;
  resetInitStatus: () => void;
  isOffline: boolean;
  lastInitAttempt: number | null;
}

// Create context with default values
const UserInitializationContext = createContext<UserInitContextType>({
  initStatus: InitializationStatus.UNKNOWN,
  initError: null,
  isInitialized: false,
  isInitializing: false,
  hasInitFailed: false,
  initializeUser: async () => false,
  verifyAndInitUser: async () => false,
  resetInitStatus: () => {},
  isOffline: false,
  lastInitAttempt: null
});

// Props for the provider component
interface UserInitializationProviderProps {
  children: ReactNode;
}

// Create provider
export const UserInitializationProvider: React.FC<UserInitializationProviderProps> = ({ children }) => {
  // State for tracking initialization
  const [initStatus, setInitStatus] = useState<InitializationStatus>(InitializationStatus.UNKNOWN);
  const [initError, setInitError] = useState<string | null>(null);
  const [lastInitAttempt, setLastInitAttempt] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Computed state
  const isInitialized = initStatus === InitializationStatus.SUCCESS;
  const isInitializing = initStatus === InitializationStatus.IN_PROGRESS;
  const hasInitFailed = initStatus === InitializationStatus.FAILED;

  // Load previous initialization status on mount
  useEffect(() => {
    const loadInitStatus = async () => {
      try {
        const savedStatus = await AsyncStorage.getItem(INIT_STATUS_KEY);
        if (savedStatus) {
          const { status, error, timestamp } = JSON.parse(savedStatus);
          setInitStatus(status);
          setInitError(error);
          setLastInitAttempt(timestamp);
        }
      } catch (error) {
        console.error('Error loading initialization status:', error);
      }
    };

    loadInitStatus();
  }, []);

  // Setup network state monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected || state.isInternetReachable === false);
    });

    return () => unsubscribe();
  }, []);

  // Function to save current status
  const saveInitStatus = async (status: InitializationStatus, error: string | null = null) => {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(
        INIT_STATUS_KEY,
        JSON.stringify({
          status,
          error,
          timestamp
        })
      );
      setLastInitAttempt(timestamp);
    } catch (storageError) {
      console.error('Error saving initialization status:', storageError);
    }
  };

  // Function to initialize user data
  const initializeUser = async (userId: string): Promise<boolean> => {
    // Don't attempt initialization if offline
    if (isOffline) {
      setInitStatus(InitializationStatus.REQUIRES_RETRY);
      setInitError('Cannot initialize user data while offline');
      await saveInitStatus(InitializationStatus.REQUIRES_RETRY, 'Cannot initialize user data while offline');
      return false;
    }

    try {
      // Mark as in progress
      setInitStatus(InitializationStatus.IN_PROGRESS);
      setInitError(null);
      await saveInitStatus(InitializationStatus.IN_PROGRESS);

      // Attempt initialization with the utility function
      console.log('UserInitContext: Initializing user data for ID:', userId);
      const success = await initializeUserData(userId);

      if (success) {
        // Mark as successful
        setInitStatus(InitializationStatus.SUCCESS);
        setInitError(null);
        await saveInitStatus(InitializationStatus.SUCCESS);
        return true;
      } else {
        // Mark as failed
        setInitStatus(InitializationStatus.FAILED);
        setInitError('User data initialization failed');
        await saveInitStatus(InitializationStatus.FAILED, 'User data initialization failed');
        return false;
      }
    } catch (error) {
      // Handle errors
      console.error('UserInitContext: Error during user initialization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';

      setInitStatus(InitializationStatus.FAILED);
      setInitError(errorMessage);
      await saveInitStatus(InitializationStatus.FAILED, errorMessage);
      return false;
    }
  };

  /**
   * Verify user data exists in tables and re-initialize if needed.
   * This is used after authentication to ensure tables contain required data.
   * Enhanced with detailed logging and error tracking.
   */
  const verifyAndInitUser = async (userId: string): Promise<boolean> => {
    if (!userId) {
      console.error('UserInitContext: Cannot verify user: No user ID provided');
      
      // Record this error for diagnostics
      try {
        const errorsKey = '@confluency:initialization_errors';
        const errorsJson = await AsyncStorage.getItem(errorsKey);
        const errors = errorsJson ? JSON.parse(errorsJson) : [];
        
        errors.unshift({
          type: 'missing_user_id',
          timestamp: new Date().toISOString(),
          context: 'verifyAndInitUser'
        });
        
        // Keep only the last 5 errors
        if (errors.length > 5) {
          errors.length = 5;
        }
        
        await AsyncStorage.setItem(errorsKey, JSON.stringify(errors));
      } catch (e) {
        // Ignore storage errors
      }
      
      return false;
    }

    const verifyStartTime = Date.now();
    console.log(`UserInitContext: Starting user verification for ID ${userId} at ${new Date().toISOString()}`);
    
    try {
      // First check if user data exists in both tables
      console.log(`UserInitContext: Checking if user data exists in tables for user ${userId}`);
      const userDataExists = await verifyUserDataExists(userId);
      
      if (userDataExists) {
        const verifyDuration = Date.now() - verifyStartTime;
        console.log(`UserInitContext: User data verification successful in ${verifyDuration}ms - data exists in tables`);
        
        // Save this successful verification with timestamp
        try {
          const successKey = '@confluency:verification_success';
          await AsyncStorage.setItem(successKey, JSON.stringify({
            userId,
            timestamp: new Date().toISOString(),
            duration: verifyDuration
          }));
        } catch (e) {
          // Ignore storage errors
        }
        
        setInitStatus(InitializationStatus.SUCCESS);
        await saveInitStatus(InitializationStatus.SUCCESS);
        return true;
      }
      
      console.log(`UserInitContext: User data verification revealed missing data for user ${userId}. Starting re-initialization...`);
      
      // Track verification to initialization transition time
      const reInitStartTime = Date.now();
      const verifyDuration = reInitStartTime - verifyStartTime;
      
      console.log(`UserInitContext: Verification took ${verifyDuration}ms before determining re-initialization is needed`);
      
      // If data is missing, attempt initialization
      const initSuccess = await initializeUser(userId);
      
      // Record final outcome
      const totalDuration = Date.now() - verifyStartTime;
      const initDuration = Date.now() - reInitStartTime;
      
      if (initSuccess) {
        console.log(`UserInitContext: Re-initialization successful for user ${userId} in ${initDuration}ms (total: ${totalDuration}ms)`);
      } else {
        console.error(`UserInitContext: Re-initialization failed for user ${userId} after ${initDuration}ms (total: ${totalDuration}ms)`);
        
        // Record this error for diagnostics
        try {
          const errorsKey = '@confluency:initialization_errors';
          const errorsJson = await AsyncStorage.getItem(errorsKey);
          const errors = errorsJson ? JSON.parse(errorsJson) : [];
          
          errors.unshift({
            type: 'reinit_failed',
            userId,
            timestamp: new Date().toISOString(),
            verifyDuration,
            initDuration,
            totalDuration
          });
          
          // Keep only the last 5 errors
          if (errors.length > 5) {
            errors.length = 5;
          }
          
          await AsyncStorage.setItem(errorsKey, JSON.stringify(errors));
        } catch (e) {
          // Ignore storage errors
        }
      }
      
      return initSuccess;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Unknown error type';
      
      console.error(`UserInitContext: Error in verifyAndInitUser:`, {
        message: errorMessage,
        type: errorName,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Record this error for diagnostics
      try {
        const errorsKey = '@confluency:initialization_errors';
        const errorsJson = await AsyncStorage.getItem(errorsKey);
        const errors = errorsJson ? JSON.parse(errorsJson) : [];
        
        errors.unshift({
          type: 'verify_init_exception',
          userId,
          timestamp: new Date().toISOString(),
          error: {
            message: errorMessage,
            type: errorName
          },
          duration: Date.now() - verifyStartTime
        });
        
        // Keep only the last 5 errors
        if (errors.length > 5) {
          errors.length = 5;
        }
        
        await AsyncStorage.setItem(errorsKey, JSON.stringify(errors));
      } catch (e) {
        // Ignore storage errors
      }
      
      return false;
    }
  };

  // Function to reset initialization status
  const resetInitStatus = async () => {
    setInitStatus(InitializationStatus.UNKNOWN);
    setInitError(null);
    setLastInitAttempt(null);
    await AsyncStorage.removeItem(INIT_STATUS_KEY);
  };

  // Context value
  const value: UserInitContextType = {
    initStatus,
    initError,
    isInitialized,
    isInitializing,
    hasInitFailed,
    initializeUser,
    verifyAndInitUser,
    resetInitStatus,
    isOffline,
    lastInitAttempt
  };

  return (
    <UserInitializationContext.Provider value={value}>
      {children}
    </UserInitializationContext.Provider>
  );
};

// Custom hook to use the context
export const useUserInitialization = (): UserInitContextType => {
  const context = useContext(UserInitializationContext);
  if (context === undefined) {
    throw new Error('useUserInitialization must be used within a UserInitializationProvider');
  }
  return context;
};