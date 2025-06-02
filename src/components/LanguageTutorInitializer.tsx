// src/components/LanguageTutorInitializer.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { getLanguageInfo } from '../constants/languages';
import { createConversation } from '../utils/api';
import { getWelcomeTitle, getWelcomeSubtitle, getWelcomeMessage } from '../utils/languageUtils';
import { saveLanguagePreferences } from '../utils/languageStorage';
import colors from '../styles/colors';
import { ConversationMode } from './ConversationModeSelector';
import { useNetwork } from '../contexts/NetworkContext';
import { Ionicons } from '@expo/vector-icons';
import OfflineWarning from './OfflineWarning';

interface LanguageTutorInitializerProps {
  targetLanguage: string;
  nativeLanguage: string;
  difficulty: string;
  conversationMode: ConversationMode;
  learningObjective?: string;
  tempo?: number;
  isMuted?: boolean;
  onConversationCreated: (conversationId: string, history: any[]) => void;
}

const LanguageTutorInitializer: React.FC<LanguageTutorInitializerProps> = ({
  targetLanguage,
  nativeLanguage,
  difficulty,
  conversationMode,
  learningObjective = '',
  tempo = 0.9, // Default to 90% speed
  isMuted = false,
  onConversationCreated
}) => {
  const [status, setStatus] = useState<string>('Initializing your language tutor...');
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  
  // Add network state
  const { isConnected, isInternetReachable, checkConnection } = useNetwork();
  const isOnline = isConnected && isInternetReachable !== false;

  const targetInfo = getLanguageInfo(targetLanguage);
  const nativeInfo = getLanguageInfo(nativeLanguage);

  // Helper function to get conversation mode display name
  const getConversationModeDisplayName = (mode: ConversationMode): string => {
    switch (mode) {
      case 'topic_lesson':
        return 'Content Learning';
      case 'free_conversation':
        return 'Free Conversation';
      case 'interview':
        return 'Interview';
      case 'verb_challenge':
        return 'Verb Challenge';
      case 'situation_simulation':
        return 'Situation Simulation';
      default:
        return 'Conversation';
    }
  };

  // Handle retry attempt
  const handleRetry = async () => {
    // Reset error state
    setError(null);
    
    // Update network status
    await checkConnection();
    
    // Increment attempt counter to trigger the effect
    setAttemptCount(prev => prev + 1);
  };
  
  // Create a fallback conversation for offline use
  const createFallbackConversation = () => {
    // Generate a fake conversation ID
    const tempConversationId = `offline_${Date.now()}`;
    
    // Create a welcome message
    const welcomeMessage = {
      role: 'assistant',
      content: getWelcomeMessage(targetLanguage, difficulty, learningObjective),
      timestamp: new Date().toISOString()
    };
    
    // Create an offline notice message
    const offlineNotice = {
      role: 'system',
      content: 'You are currently offline. Limited functionality is available until you reconnect.',
      timestamp: new Date().toISOString()
    };
    
    // Return the fallback history
    return {
      conversation_id: tempConversationId,
      history: [welcomeMessage, offlineNotice]
    };
  };

  useEffect(() => {
    const initConversation = async () => {
      try {
        // Check network connectivity first
        if (!isOnline) {
          console.log("Network is offline, using fallback conversation");
          setStatus('Network is unavailable...');
          setError('No internet connection available.');
          return;
        }
        
        setStatus('Creating your conversation...');

        // Add debug logging
        if (__DEV__) {
          console.log("🔍 Debug - LanguageTutorInitializer params:", {
            difficulty,
            nativeLanguage,
            targetLanguage,
            learningObjective,
            conversationMode,
            tempo,
            isMuted
          });
          console.log("🔍 Debug - conversationMode value:", conversationMode);
        }

        // Save these preferences again just to make sure they're persistent
        await saveLanguagePreferences(
          {
            code: targetLanguage,
            name: targetInfo.name,
            flag: targetInfo.flag
          },
          {
            code: nativeLanguage,
            name: nativeInfo.name,
            flag: nativeInfo.flag
          }
        );

        setStatus(`Preparing your ${targetInfo.name} tutor...`);

        try {
          // Start a timer to detect slow initialization
          const slowInitTimer = setTimeout(() => {
            setStatus(`Still preparing your ${targetInfo.name} tutor...\nEstablishing connection to server...`);
          }, 3000);
          
          // Create the conversation with network error handling
          const response = await createConversation({
            difficulty,
            nativeLanguage,
            targetLanguage,
            learningObjective,
            conversationMode,
            tempo,
            isMuted
          });
          
          // Clear the slow init timer
          clearTimeout(slowInitTimer);

          if (!response.conversation_id) {
            throw new Error('Failed to get conversation ID');
          }

          // Notify the parent component
          onConversationCreated(response.conversation_id, response.history || []);
        } catch (apiError: any) {
          // Handle offline errors specifically
          if (apiError.offline || apiError.type === 'network') {
            setError('Network error: Cannot connect to the server');
            console.error('Network error creating conversation:', apiError);
          } else {
            // Other API errors
            setError(`Error: ${apiError.message || 'Unable to create conversation'}`);
            console.error('API error creating conversation:', apiError);
          }
        }
      } catch (err) {
        console.error('Error initializing conversation:', err);
        setError('Unable to create conversation. Please try again.');
      }
    };

    initConversation();
  }, [targetLanguage, nativeLanguage, difficulty, conversationMode, learningObjective, tempo, isMuted, isConnected, isInternetReachable, attemptCount]);

  // If there's an error, show error message with retry option
  if (error) {
    // Special handling for offline errors
    if (!isOnline || error.includes('network') || error.includes('connection')) {
      return (
        <View style={styles.container}>
          <OfflineWarning
            message="Unable to connect to the server. Please check your internet connection and try again."
            retryAction={handleRetry}
            showRetry={true}
            style={styles.offlineWarning}
          />
          
          <TouchableOpacity
            style={styles.offlineModeButton}
            onPress={() => {
              // Create and use a fallback offline conversation
              const fallbackData = createFallbackConversation();
              onConversationCreated(fallbackData.conversation_id, fallbackData.history);
            }}
          >
            <Ionicons name="cloud-offline" size={16} color="white" style={styles.offlineModeIcon} />
            <Text style={styles.offlineModeText}>Continue in Limited Mode</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // For other errors
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={16} color="white" style={styles.retryIcon} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main loading view
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeTitle}>
          {getWelcomeTitle(targetLanguage)}
        </Text>

        <Text style={styles.welcomeSubtitle}>
          {getWelcomeSubtitle(targetLanguage)}
        </Text>

        <View style={styles.languageInfoContainer}>
          <View style={styles.languageInfoItem}>
            <Text style={styles.languageInfoLabel}>Learning:</Text>
            <View style={styles.languageInfoValue}>
              <Text style={styles.languageInfoFlag}>{targetInfo.flag}</Text>
              <Text style={styles.languageInfoName}>{targetInfo.name}</Text>
            </View>
          </View>

          <View style={styles.languageInfoItem}>
            <Text style={styles.languageInfoLabel}>Native:</Text>
            <View style={styles.languageInfoValue}>
              <Text style={styles.languageInfoFlag}>{nativeInfo.flag}</Text>
              <Text style={styles.languageInfoName}>{nativeInfo.name}</Text>
            </View>
          </View>

          <View style={styles.languageInfoItem}>
            <Text style={styles.languageInfoLabel}>Level:</Text>
            <Text style={styles.languageInfoName}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>

          <View style={styles.languageInfoItem}>
            <Text style={styles.languageInfoLabel}>Mode:</Text>
            <Text style={styles.languageInfoName}>
              {getConversationModeDisplayName(conversationMode)}
            </Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{status}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 30,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 24,
  },
  languageInfoContainer: {
    width: '100%',
    marginBottom: 32,
  },
  languageInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  languageInfoLabel: {
    fontSize: 16,
    color: colors.gray600,
  },
  languageInfoValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageInfoFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  languageInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray700,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    padding: 20,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  retryIcon: {
    marginRight: 8,
  },
  offlineWarning: {
    marginBottom: 20,
    width: '100%',
    maxWidth: 500,
  },
  offlineModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray600,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  offlineModeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  offlineModeIcon: {
    marginRight: 8,
  }
});

export default LanguageTutorInitializer;