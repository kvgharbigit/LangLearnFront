import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import colors from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { isExpoGo } from '../utils/deviceInfo';

interface RevenueCatErrorDisplayProps {
  error: any;
  title?: string;
  onClear?: () => void;
}

/**
 * Component to display detailed RevenueCat errors for debugging purposes
 * This is intended to be used during development only and should not be visible in production or TestFlight
 */
const RevenueCatErrorDisplay: React.FC<RevenueCatErrorDisplayProps> = ({ 
  error, 
  title = 'RevenueCat Error',
  onClear
}) => {
  if (!error) return null;

  // Helper function to stringify the error object
  const stringifyError = (err: any): string => {
    try {
      const replacer = (key: string, value: any) => {
        // Handle circular references
        if (key === 'request' || key === 'response' || key === 'config') {
          return `[${key} object]`;
        }
        return value;
      };

      // If error is not an object, return as is
      if (typeof err !== 'object') {
        return String(err);
      }
      
      // If it's an Error object, get properties
      if (err instanceof Error) {
        const errorObj = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
        
        // Add additional properties that might be on the error
        for (const key in err) {
          if (Object.prototype.hasOwnProperty.call(err, key)) {
            (errorObj as any)[key] = (err as any)[key];
          }
        }
        
        return JSON.stringify(errorObj, replacer, 2);
      }
      
      // If it's a plain object
      return JSON.stringify(err, replacer, 2);
    } catch (e) {
      return `Error stringifying: ${e}`;
    }
  };

  // Extract useful RevenueCat error properties
  const errorMessage = error.message || 'Unknown error';
  const errorCode = error.code || '';
  const errorUnderlyingErrorMessage = error.underlyingErrorMessage || '';
  const errorReadableCode = error.readableErrorCode || '';
  
  // Full error details as JSON string
  const fullErrorDetails = stringifyError(error);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={24} color="#FFCC00" />
        <Text style={styles.title}>{title}</Text>
        {onClear && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={22} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.errorDetails}>
        <Text style={styles.errorLabel}>Error Message:</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        
        {errorCode && (
          <>
            <Text style={styles.errorLabel}>Error Code:</Text>
            <Text style={styles.errorText}>{errorCode}</Text>
          </>
        )}
        
        {errorReadableCode && (
          <>
            <Text style={styles.errorLabel}>Readable Error Code:</Text>
            <Text style={styles.errorText}>{errorReadableCode}</Text>
          </>
        )}
        
        {errorUnderlyingErrorMessage && (
          <>
            <Text style={styles.errorLabel}>Underlying Error:</Text>
            <Text style={styles.errorText}>{errorUnderlyingErrorMessage}</Text>
          </>
        )}
        
        <Text style={styles.errorLabel}>Full Error Details:</Text>
        <ScrollView style={styles.jsonContainer}>
          <Text style={styles.jsonText}>{fullErrorDetails}</Text>
        </ScrollView>
      </View>
      
      {isExpoGo() && (
        <Text style={styles.note}>
          Note: This error display is for debugging simulated RevenueCat operations in Expo Go.
        </Text>
      )}
      {!isExpoGo() && __DEV__ && (
        <Text style={styles.note}>
          Note: This error display is for debugging only and will not appear in production builds.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    paddingBottom: 8,
  },
  clearButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFCC00',
    marginLeft: 8,
  },
  errorDetails: {
    marginBottom: 12,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    marginBottom: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#CCC',
    marginBottom: 8,
  },
  jsonContainer: {
    backgroundColor: '#222',
    borderRadius: 6,
    padding: 8,
    maxHeight: 200,
  },
  jsonText: {
    color: '#AAA',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  note: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default RevenueCatErrorDisplay;