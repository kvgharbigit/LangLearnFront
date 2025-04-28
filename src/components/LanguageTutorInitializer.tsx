// src/components/LanguageTutorInitializer.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getLanguageInfo } from '../constants/languages';
import { createConversation } from '../utils/api';
import { getWelcomeTitle, getWelcomeSubtitle } from '../utils/languageUtils';
import { saveLanguagePreferences } from '../utils/languageStorage';
import colors from '../styles/colors';

interface LanguageTutorInitializerProps {
  targetLanguage: string;
  nativeLanguage: string;
  difficulty: string;
  learningObjective?: string;
  tempo?: number;
  isMuted?: boolean;
  onConversationCreated: (conversationId: string, history: any[]) => void;
}

const LanguageTutorInitializer: React.FC<LanguageTutorInitializerProps> = ({
  targetLanguage,
  nativeLanguage,
  difficulty,
  learningObjective = '',
  tempo = 0.8,
  isMuted = false,
  onConversationCreated
}) => {
  const [status, setStatus] = useState<string>('Initializing your language tutor...');
  const [error, setError] = useState<string | null>(null);

  const targetInfo = getLanguageInfo(targetLanguage);
  const nativeInfo = getLanguageInfo(nativeLanguage);

  useEffect(() => {
    const initConversation = async () => {
      try {
        setStatus('Creating your conversation...');

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

        // Create the conversation
        const response = await createConversation({
          difficulty,
          nativeLanguage,
          targetLanguage,
          learningObjective,
          tempo,
          isMuted
        });

        if (!response.conversation_id) {
          throw new Error('Failed to get conversation ID');
        }

        // Notify the parent component
        onConversationCreated(response.conversation_id, response.history || []);
      } catch (err) {
        console.error('Error initializing conversation:', err);
        setError('Unable to create conversation. Please try again.');
      }
    };

    initConversation();
  }, [targetLanguage, nativeLanguage, difficulty, learningObjective, tempo, isMuted]);

  // If there's an error, show error message
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
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
  }
});

export default LanguageTutorInitializer;