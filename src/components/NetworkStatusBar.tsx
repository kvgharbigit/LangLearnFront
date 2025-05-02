import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';
import colors from '../styles/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NetworkStatusBar: React.FC = () => {
  const { isConnected, isInternetReachable } = useNetwork();
  const insets = useSafeAreaInsets();
  const visible = useRef(new Animated.Value(0)).current;
  const lastOnlineStatus = useRef<boolean>(true);
  
  // Determine if the device is actually online
  const isOnline = isConnected && isInternetReachable !== false;
  
  // Check if online status changed
  const onlineStatusChanged = isOnline !== lastOnlineStatus.current;
  
  useEffect(() => {
    // Update last status
    lastOnlineStatus.current = isOnline;
    
    // Animate visibility based on connection status
    if (!isOnline) {
      // Show immediately when offline
      Animated.timing(visible, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else if (onlineStatusChanged) {
      // First show the "back online" message
      Animated.timing(visible, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
      
      // Then hide after a delay
      setTimeout(() => {
        Animated.timing(visible, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }).start();
      }, 3000);
    }
  }, [isConnected, isInternetReachable, onlineStatusChanged]);

  // Calculate top position based on safe area insets
  const topPosition = Platform.OS === 'ios' ? insets.top : 0;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: visible,
          top: topPosition,
          backgroundColor: isOnline ? colors.success : colors.danger,
        }
      ]}
      pointerEvents="none"
    >
      <Ionicons 
        name={isOnline ? "checkmark-circle" : "cloud-offline"} 
        size={18} 
        color="#fff" 
      />
      <Text style={styles.text}>
        {isOnline 
          ? "Back online" 
          : !isConnected 
            ? "No network connection" 
            : "Internet connection unavailable"}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  }
});

export default NetworkStatusBar;