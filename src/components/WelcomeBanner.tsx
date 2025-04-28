// src/components/WelcomeBanner.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../styles/colors';
import { getLanguageInfo } from '../constants/languages';
import { getWelcomeTitle, getWelcomeSubtitle } from '../utils/languageUtils';

interface WelcomeBannerProps {
  targetLanguage: string;
  onStartChat?: () => void;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ targetLanguage, onStartChat }) => {
  const languageInfo = getLanguageInfo(targetLanguage);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.welcomeEmoji}>👋</Text>
      </View>

      <Text style={styles.title}>{getWelcomeTitle(targetLanguage)}</Text>

      <View style={styles.flagContainer}>
        <Text style={styles.flag}>{languageInfo.flag}</Text>
      </View>

      <Text style={styles.subtitle}>{getWelcomeSubtitle(targetLanguage)}</Text>

      {onStartChat && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={onStartChat}
        >
          <Text style={styles.startButtonText}>Start Chatting</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  welcomeEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  flagContainer: {
    marginVertical: 8,
  },
  flag: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray700,
    textAlign: 'center',
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 8,
  },
  startButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default WelcomeBanner;