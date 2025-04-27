import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

interface TranslatableMessageProps {
  originalText: string;
  translatedText?: string | null;
  targetLanguage: string;
  nativeLanguage: string;
  onRequestTranslation?: () => Promise<void>;
}

const TranslatableMessage: React.FC<TranslatableMessageProps> = ({
  originalText,
  translatedText,
  targetLanguage,
  nativeLanguage,
  onRequestTranslation
}) => {
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get language emoji based on language code
  const getLanguageEmoji = (code: string): string => {
    const emojiMap: {[key: string]: string} = {
      'en': '🇬🇧',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'pl': '🇵🇱',
      'nl': '🇳🇱',
      'ru': '🇷🇺',
      'hu': '🇭🇺',
      'fi': '🇫🇮',
      'el': '🇬🇷',
      'ja': '🇯🇵',
      'zh': '🇨🇳',
      'ko': '🇰🇷',
      'tr': '🇹🇷'
    };
    return emojiMap[code] || '🌎';
  };

  const toggleTranslation = async () => {
    // If we already have a translation, just toggle the view
    if (translatedText) {
      setShowTranslation(!showTranslation);
      return;
    }

    // If we don't have a translation yet and a request handler is provided
    if (!translatedText && onRequestTranslation) {
      setIsLoading(true);
      try {
        await onRequestTranslation();
        setShowTranslation(true);
      } catch (error) {
        console.error('Failed to get translation:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Show the original text, translation, or loading state
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.loadingText}>Translating...</Text>
        </View>
      );
    }

    if (showTranslation && translatedText) {
      return (
        <View style={styles.contentContainer}>
          <Text style={styles.messageText}>{translatedText}</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.messageText}>{originalText}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleTranslation}
      activeOpacity={0.7}
    >
      {renderContent()}

      <View style={styles.footer}>
        {showTranslation ? (
          <View style={styles.indicatorContainer}>
            <Text style={styles.languageEmoji}>{getLanguageEmoji(nativeLanguage)}</Text>
            <Text style={styles.translateText}>Tap to see original</Text>
          </View>
        ) : (
          <View style={styles.indicatorContainer}>
            <Ionicons name="language-outline" size={14} color={colors.primary} />
            <Text style={styles.translateText}>Tap to translate</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  contentContainer: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212529',
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.gray600,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(93, 106, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  translateText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  languageEmoji: {
    fontSize: 14,
    marginRight: 4,
  }
});

export default TranslatableMessage;