import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { syncSubscriptionOnAppResume } from '../services/revenueCatService';
import { triggerHybridSync } from '../utils/api';
import { getCurrentUser } from '../services/supabaseAuthService';

/**
 * Development component for testing hybrid sync functionality
 * This should only be used in development builds
 */
const HybridSyncStatus: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string>('');

  const handleManualSync = async () => {
    setSyncing(true);
    setLastSyncResult('');
    
    try {
      console.log('[HybridSyncStatus] Manual sync triggered');
      await syncSubscriptionOnAppResume();
      
      setLastSyncResult('✅ Manual sync successful');
      Alert.alert('Success', 'Subscription synced successfully');
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      setLastSyncResult(`❌ Manual sync failed: ${errorMsg}`);
      Alert.alert('Error', `Failed to sync subscription: ${errorMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestHybridSync = async () => {
    setSyncing(true);
    setLastSyncResult('');
    
    try {
      const user = getCurrentUser();
      if (!user?.id) {
        throw new Error('No authenticated user');
      }

      console.log('[HybridSyncStatus] Testing hybrid sync directly');
      
      // Create mock customer info for testing
      const mockCustomerInfo = {
        entitlements: {
          active: {
            'gold_entitlement': {
              productIdentifier: 'gold_tier_monthly',
              expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        }
      };

      const result = await triggerHybridSync(user.id, mockCustomerInfo);
      
      if (result.success) {
        setLastSyncResult(`✅ Hybrid sync test successful: ${result.tier}`);
        Alert.alert('Success', `Hybrid sync test completed. Tier: ${result.tier}`);
      } else {
        setLastSyncResult(`❌ Hybrid sync test failed: ${result.message}`);
        Alert.alert('Error', `Hybrid sync test failed: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      setLastSyncResult(`❌ Hybrid sync test failed: ${errorMsg}`);
      Alert.alert('Error', `Hybrid sync test failed: ${errorMsg}`);
    } finally {
      setSyncing(false);
    }
  };

  // Only show in development
  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔄 Hybrid Sync Status</Text>
      
      <TouchableOpacity 
        onPress={handleManualSync}
        disabled={syncing}
        style={[styles.button, syncing && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {syncing ? 'Syncing...' : 'Manual Sync'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={handleTestHybridSync}
        disabled={syncing}
        style={[styles.button, styles.testButton, syncing && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {syncing ? 'Testing...' : 'Test Hybrid Sync'}
        </Text>
      </TouchableOpacity>
      
      {lastSyncResult ? (
        <Text style={styles.result}>{lastSyncResult}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginVertical: 5,
  },
  testButton: {
    backgroundColor: '#FF9500',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  result: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

export default HybridSyncStatus;