import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

interface OfflineWarningProps {
  retryAction?: () => void;
  message?: string;
  showRetry?: boolean;
  style?: any;
}

const OfflineWarning: React.FC<OfflineWarningProps> = ({ 
  retryAction,
  message = "You're offline. Please check your internet connection.",
  showRetry = true,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name="cloud-offline" size={54} color={colors.gray600} />
      <Text style={styles.message}>{message}</Text>
      {showRetry && retryAction && (
        <TouchableOpacity style={styles.retryButton} onPress={retryAction}>
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    margin: 16,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray700,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  }
});

export default OfflineWarning;