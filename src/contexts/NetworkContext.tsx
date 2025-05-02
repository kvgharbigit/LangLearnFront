import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  lastChecked: number;
  checkConnection: () => Promise<NetInfoState>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown',
  lastChecked: Date.now(),
  checkConnection: async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    details: null
  } as NetInfoState)
});

export const NetworkProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [networkState, setNetworkState] = useState<{
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string | null;
    lastChecked: number;
  }>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    lastChecked: Date.now()
  });

  // Function to manually check connection status
  const checkConnection = async (): Promise<NetInfoState> => {
    const state = await NetInfo.fetch();
    
    // In development mode, always assume connected to avoid issues with Expo Go
    if (__DEV__) {
      const devState = {
        ...state,
        isConnected: true,
        isInternetReachable: true,
      };
      
      setNetworkState({
        isConnected: true,
        isInternetReachable: true,
        type: state.type || 'unknown',
        lastChecked: Date.now()
      });
      
      return devState as NetInfoState;
    } else {
      // In production, use actual network state
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        lastChecked: Date.now()
      });
      return state;
    }
  };

  useEffect(() => {
    // Initial connection check
    checkConnection();
    
    // Set up listener for network changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // In development mode, always assume connected to avoid issues with Expo Go
      if (__DEV__) {
        setNetworkState({
          isConnected: true,
          isInternetReachable: true,
          type: state.type || 'unknown',
          lastChecked: Date.now()
        });
        
        console.log('Development mode: Assuming network is connected for testing');
      } else {
        // In production, use actual network state
        setNetworkState({
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          lastChecked: Date.now()
        });
      }
      
      // Log network state changes in development
      if (__DEV__) {
        console.log('Network state changed:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{
      ...networkState,
      checkConnection
    }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);

export default NetworkContext;