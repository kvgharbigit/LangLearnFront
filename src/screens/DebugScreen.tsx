import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const DebugScreen = () => {
  const [results, setResults] = useState<string[]>([]);
  
  const log = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, message]);
  };
  
  useEffect(() => {
    const testImports = async () => {
      log('=== Testing RevenueCat Imports ===');
      
      try {
        // Test 1: Direct import
        log('Test 1: Importing revenueCatService...');
        const revenueCatService = await import('../services/revenueCatService');
        log(`Success! Exports: ${Object.keys(revenueCatService).join(', ')}`);
        
        // Test 2: Check getCurrentSubscription
        log('\nTest 2: Checking getCurrentSubscription...');
        log(`getCurrentSubscription type: ${typeof revenueCatService.getCurrentSubscription}`);
        log(`Is function? ${typeof revenueCatService.getCurrentSubscription === 'function'}`);
        
        // Test 3: Named import
        log('\nTest 3: Testing named import...');
        const { getCurrentSubscription } = await import('../services/revenueCatService');
        log(`Named import type: ${typeof getCurrentSubscription}`);
        
        // Test 4: Try calling it
        log('\nTest 4: Attempting to call getCurrentSubscription...');
        try {
          const result = await getCurrentSubscription();
          log(`Call successful! Result: ${JSON.stringify(result)}`);
        } catch (error) {
          log(`Call failed: ${error.message}`);
        }
        
        // Test 5: Check other functions
        log('\nTest 5: Checking other functions...');
        const funcs = ['initializeRevenueCat', 'getOfferings', 'purchasePackage', 'shouldUseSimulatedData'];
        for (const func of funcs) {
          log(`${func}: ${typeof revenueCatService[func]}`);
        }
        
      } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack: ${error.stack}`);
      }
    };
    
    testImports();
  }, []);
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>RevenueCat Import Debug</Text>
      {results.map((result, index) => (
        <Text key={index} style={styles.result}>{result}</Text>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  result: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});

export default DebugScreen;