import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HTML from 'react-native-render-html';
import { normalizeText, areMessagesEquivalent, highlightDifferences } from '../utils/text';

// Define message interface
export interface MessageData {
  role: 'user' | 'assistant' | 'system';
  content: string;
  corrected?: string;
  natural?: string;
  timestamp: string;
  isTemporary?: boolean;
}

// Props interface
interface MessageProps {
  message: MessageData;
  originalUserMessage?: string | null;
}

const Message: React.FC<MessageProps> = ({ message, originalUserMessage }) => {
  // Only apply normalization to the original user message
  const normalizedUserMessage = originalUserMessage ? normalizeText(originalUserMessage) : '';

  // Normalize grammar and native suggestions if they exist
  const normalizedNative = message.natural ? normalizeText(message.natural) : '';
  const normalizedCorrected = message.corrected ? normalizeText(message.corrected) : '';

  // Check if suggestions match the original user message
  const isEquivalentToNative = message.natural && normalizedUserMessage === normalizedNative;
  const isEquivalentToCorrected = message.corrected && normalizedUserMessage === normalizedCorrected;

  // Highlight differences in suggestions only if they're not equivalent
  const highlightedNative = isEquivalentToNative
    ? message.natural
    : (originalUserMessage && message.natural
        ? highlightDifferences(originalUserMessage, message.natural)
        : message.natural || '');

  const highlightedCorrected = isEquivalentToCorrected
    ? message.corrected
    : (originalUserMessage && message.corrected
        ? highlightDifferences(originalUserMessage, message.corrected)
        : message.corrected || '');

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  return (
    <View style={[
      styles.messageContainer,
      isUser && styles.userMessage,
      isAssistant && styles.assistantMessage,
      isSystem && styles.systemMessage
    ]}>
      <View style={styles.messageContent}>
        <Text style={[
          styles.mainText,
          isUser && styles.userMainText
        ]}>
          {message.content}
        </Text>

        {message.corrected && (
          <View style={[
            styles.messageAnnotation,
            styles.grammarHint,
            isEquivalentToCorrected && styles.identical
          ]}>
            <Text style={[
              styles.annotationLabel,
              isUser ? styles.userAnnotationLabel : null,
              isEquivalentToCorrected && styles.identicalLabel
            ]}>
              Grammar:
            </Text>

            <View style={styles.annotationTextContainer}>
              <HTML
                source={{ html: highlightedCorrected }}
                contentWidth={300}
                tagsStyles={{
                  strong: {
                    fontWeight: 'bold',
                    textDecorationLine: 'underline',
                    opacity: 0.8,
                    color: isUser ? '#90CAF9' : '#2196F3'
                  }
                }}
                baseStyle={[
                  styles.annotationText,
                  isUser ? styles.userAnnotationText : {},
                  isEquivalentToCorrected ? styles.identicalText : {}
                ]}
              />

              {isEquivalentToCorrected && (
                <Text style={styles.nativeMatchIcon}>✅</Text>
              )}
            </View>
          </View>
        )}

        {message.natural && (
          <View style={[
            styles.messageAnnotation,
            styles.nativeHint,
            isEquivalentToNative && styles.identical
          ]}>
            <Text style={[
              styles.annotationLabel,
              isUser ? styles.userAnnotationLabel : {},
              isEquivalentToNative && styles.identicalLabel
            ]}>
              Native:
            </Text>

            <View style={styles.annotationTextContainer}>
              <HTML
                source={{ html: highlightedNative }}
                contentWidth={300}
                tagsStyles={{
                  strong: {
                    fontWeight: 'bold',
                    textDecorationLine: 'underline',
                    opacity: 0.8,
                    color: isUser ? '#E1BEE7' : '#9C27B0'
                  }
                }}
                baseStyle={[
                  styles.annotationText,
                  isUser ? styles.userAnnotationText : {},
                  isEquivalentToNative ? styles.identicalText : {}
                ]}
              />

              {isEquivalentToNative && (
                <Text style={styles.nativeMatchIcon}>✅</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#8c95ff', // primary-light
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  systemMessage: {
    backgroundColor: '#e9ecef', // gray-200
    alignSelf: 'center',
    maxWidth: '90%',
    borderRadius: 8,
  },
  messageContent: {
    flexDirection: 'column',
  },
  mainText: {
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#212529', // dark
  },
  userMainText: {
    color: 'white',
  },
  messageAnnotation: {
    flexDirection: 'row',
    marginTop: 4,
    paddingVertical: 4,
    alignItems: 'center',
  },
  grammarHint: {
    // Styling for grammar hint
  },
  nativeHint: {
    // Styling for native hint
  },
  identical: {
    // Styling for when the hint matches user input
  },
  annotationLabel: {
    fontWeight: '600',
    marginRight: 8,
    opacity: 0.7,
    minWidth: 60,
    fontSize: 14,
    color: '#2196F3',  // Blue for grammar
  },
  annotationTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  annotationText: {
    flex: 1,
    fontSize: 14,
    color: '#2196F3',  // Blue for grammar
  },
  userAnnotationLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  userAnnotationText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  identicalLabel: {
    color: '#4CAF50', // success
  },
  identicalText: {
    color: '#4CAF50', // success
    fontWeight: 'bold',
  },
  nativeMatchIcon: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Message;