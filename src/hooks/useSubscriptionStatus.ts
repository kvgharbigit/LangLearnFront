import { useState, useEffect } from 'react';
import { getCurrentSubscription } from '../services/revenueCatService';

export type SubscriptionStatus = {
  tier: string;
  expirationDate: Date | null;
  isActive: boolean;
  isCancelled?: boolean;
  isInGracePeriod?: boolean;
  loading: boolean;
  error: Error | null;
};

const initialState: SubscriptionStatus = {
  tier: 'free',
  expirationDate: null,
  isActive: false,
  isCancelled: false,
  isInGracePeriod: false,
  loading: true,
  error: null
};

/**
 * A hook to retrieve and monitor subscription status
 * including cancellation status
 * 
 * @param refreshInterval Optional: time in milliseconds to periodically refresh status (default: null = don't refresh)
 * @returns SubscriptionStatus object with current subscription information and refresh function
 */
export const useSubscriptionStatus = (refreshInterval: number | null = null): SubscriptionStatus & { refresh: (forceFresh?: boolean) => Promise<void> } => {
  const [status, setStatus] = useState<SubscriptionStatus>(initialState);
  
  const checkStatus = async (forceFresh = false) => {
    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      
      // Clear cache if forceFresh is requested
      if (forceFresh) {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('cached_subscription');
          console.log('Cleared subscription cache in useSubscriptionStatus');
        } catch (e) {
          console.warn('Error clearing subscription cache in hook:', e);
        }
      }
      
      const subscriptionData = await getCurrentSubscription();
      const { tier, expirationDate, isActive, isCancelled = false, isInGracePeriod = false } = subscriptionData;
      
      setStatus({
        tier,
        expirationDate,
        isActive,
        isCancelled,
        isInGracePeriod,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setStatus(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('Unknown error checking subscription')
      }));
    }
  };
  
  // Initial check on mount
  useEffect(() => {
    checkStatus();
    
    // Set up interval for periodic checks if requested
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(() => checkStatus(), refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval]);
  
  // Return status with refresh function
  return {
    ...status,
    refresh: checkStatus
  };
};

export default useSubscriptionStatus;