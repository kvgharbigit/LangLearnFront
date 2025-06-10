/**
 * EmptyConversation.tsx
 * 
 * Component displayed when there are no messages in the conversation yet.
 * Shows welcome information and a start button.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../../../styles/colors';

interface EmptyConversationProps {
  welcomeIcon: string;
  welcomeTitle: string;
  welcomeMessage: string;
  onStartPress: () => void;
  isLoading: boolean;
}

/**
 * Component shown when no conversation has been started yet
 */
const EmptyConversation: React.FC<EmptyConversationProps> = ({
  welcomeIcon,
  welcomeTitle,
  welcomeMessage,
  onStartPress,
  isLoading,
  hasError = false,
  onReturnHome
}) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.welcomeIcon}>{hasError ? '⚠️' : welcomeIcon}</Text>
      <Text style={[styles.welcomeTitle, hasError && styles.errorTitle]}>
        {hasError ? 'Connection Error' : welcomeTitle}
      </Text>
      <Text style={[styles.welcomeText, hasError && styles.errorText]}>
        {hasError 
          ? "We're having trouble connecting to our language tutor service. This may be due to network issues or the server being unavailable."
          : welcomeMessage
        }
      </Text>
      
      {isLoading && !hasError ? (
        <View style={styles.loadingContainer}>
          <View style={styles.buffering}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[
                styles.bufferingDot,
                {
                  opacity: i === 0 ? 0.3 : i === 1 ? 0.5 : 0.7,
                }
              ]} />
            ))}
          </View>
          <Text style={styles.bufferingText}>
            Creating conversation...
          </Text>
        </View>
      ) : hasError ? (
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={onReturnHome}
        >
          <Text style={styles.startButtonText}>Return to Homepage</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.startButton}
          onPress={onStartPress}
        >
          <Text style={styles.startButtonText}>Let's Go</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Styles for the empty conversation state
 */
const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    height: 300,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#d32f2f', // Red color for error
  },
  welcomeText: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    color: '#d32f2f', // Red color to match the error title
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  errorButton: {
    backgroundColor: '#d32f2f', // Red color for error
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buffering: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  bufferingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginHorizontal: 5,
  },
  bufferingText: {
    color: colors.gray600,
    marginTop: 8,
    fontSize: 14,
  },
});

export default EmptyConversation;