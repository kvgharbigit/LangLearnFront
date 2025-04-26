// This is the updated Message.tsx with improved text container sizing

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import HTML from 'react-native-render-html';
import { normalizeText, areMessagesEquivalent, highlightDifferences } from '../utils/text';

// Get screen width for dynamic sizing
const screenWidth = Dimensions.get('window').width;

// Define message interface
export interface MessageData {
  role: 'user' | 'assistant' | 'system';
  content: string;
  corrected?: string;
  natural?: string;
  translation?: string;  // Added translation field
  timestamp: string;
  isTemporary?: boolean;
}

// Props interface
interface MessageProps {
  message: MessageData;
  originalUserMessage?: string | null;
}

const Message: React.FC<MessageProps> = ({ message, originalUserMessage }) => {
  // Add state for tracking if we're showing the translation
  const [isShowingTranslation, setIsShowingTranslation] = useState<boolean>(false);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  // Determine if this message should show corrections
  // Only user messages will have corrections directly attached to them now
  const showCorrections = isUser && (message.corrected || message.natural);

  // Helper for checking if suggestions match the original message
  const isEquivalentToOriginal = (suggestion: string) => {
    if (!suggestion) return false;
    return areMessagesEquivalent(message.content, suggestion);
  };

  // Check if suggestions match the original message
  const isEquivalentToNative = message.natural && isEquivalentToOriginal(message.natural);
  const isEquivalentToCorrected = message.corrected && isEquivalentToOriginal(message.corrected);

  // Check if BOTH corrections match - this is our new case to handle
  const bothCorrectionsMatch = isEquivalentToNative && isEquivalentToCorrected && message.natural && message.corrected;

  // NEW CASE: Check if grammatically correct but not natively correct
  const onlyGrammarCorrect = isEquivalentToCorrected && !isEquivalentToNative && message.corrected && message.natural;

  // Highlight differences in suggestions only if they're not equivalent
  const highlightedNative = isEquivalentToNative
    ? message.natural
    : message.natural
      ? highlightDifferences(message.content, message.natural)
      : '';

  const highlightedCorrected = isEquivalentToCorrected
    ? message.corrected
    : message.corrected
      ? highlightDifferences(message.content, message.corrected)
      : '';

  // Function to highlight incorrect words in red in the original message
  const highlightIncorrectWords = useMemo(() => {
    if (!isUser || !message.corrected || isEquivalentToCorrected) {
      // If there's no correction or the correction is the same, return unchanged
      return message.content;
    }

    // Split the original and corrected texts into words
    const originalWords = message.content.split(/\s+/);
    const correctedWords = message.corrected.split(/\s+/);

    // Create a normalized version for comparison (without punctuation, lowercase)
    const normalizedOriginal = originalWords.map(word => normalizeText(word));
    const normalizedCorrected = correctedWords.map(word => normalizeText(word));

    // Mark words that differ as incorrect
    const result = originalWords.map((word, index) => {
      const normalizedWord = normalizeText(word);

      // Simple case: direct comparison of the word at the same position
      if (index < normalizedCorrected.length && normalizedWord !== normalizedCorrected[index]) {
        return `<span style="color: #FF0000">${word}</span>`;
      }

      // Check if this word exists anywhere in the corrected text
      if (!normalizedCorrected.includes(normalizedWord)) {
        return `<span style="color: #FF0000">${word}</span>`;
      }

      return word;
    });

    return result.join(' ');
  }, [isUser, message.content, message.corrected, isEquivalentToCorrected]);

  // Styles for HTML rendering
  const correctedTagsStyles = useMemo(() => ({
    strong: {
      fontWeight: 'bold',
      color: '#FF0000', // Red for new/changed words
    },
    span: {
      color: '#FF0000', // Red for incorrect words
    }
  }), []);

  const nativeTagsStyles = useMemo(() => ({
    strong: {
      fontWeight: 'bold',
      color: '#FF0000', // Red for new/changed words
    }
  }), []);

  // Updated base styles for rendering HTML content with better wrapping behavior
  const correctedBaseStyle = useMemo(() => ({
    ...styles.annotationText,
    ...(isUser ? styles.userAnnotationText : {}),
    ...(isEquivalentToCorrected ? styles.identicalText : {color: '#4CAF50'}), // Green for unchanged words
    flexShrink: 1,
    flexWrap: 'wrap',
  }), [isUser, isEquivalentToCorrected]);

  const nativeBaseStyle = useMemo(() => ({
    ...styles.annotationText,
    ...(isUser ? styles.userAnnotationText : {}),
    ...(isEquivalentToNative ? styles.identicalText : {color: '#4CAF50'}), // Green for unchanged words
    flexShrink: 1,
    flexWrap: 'wrap',
  }), [isUser, isEquivalentToNative]);

  // Toggle translation function
  const toggleTranslation = () => {
    if (message.translation) {
      setIsShowingTranslation(!isShowingTranslation);
    }
  };

  return (
    <View style={[
      styles.messageContainer,
      isUser && styles.userMessage,
      isAssistant && styles.assistantMessage,
      isSystem && styles.systemMessage
    ]}>
      <View style={styles.messageContent}>
        {isUser && bothCorrectionsMatch ? (
          // NEW CASE: When both corrections match the user input, show only one message in green with both emoji indicators
          <View style={styles.perfectMatchContainer}>
            <Text style={styles.perfectMatchText}>
              {message.corrected} {/* Use the corrected version with proper punctuation */}
            </Text>
            <View style={styles.emojiContainer}>
              <Text style={styles.emojiIcon}>📝</Text>
              <Text style={styles.emojiIcon}>🌍</Text>
            </View>
          </View>
        ) : isUser && onlyGrammarCorrect ? (
          // NEW CASE: Grammatically correct but not natively correct
          <View>
            {/* Show grammatically correct message in green with grammar emoji */}
            <View style={styles.perfectMatchContainer}>
              <Text style={styles.perfectMatchText}>
                {message.corrected} {/* Use the corrected version with proper punctuation */}
              </Text>
              <View style={styles.emojiContainer}>
                <Text style={styles.emojiIcon}>📝</Text>
              </View>
            </View>

            {/* Show only the native alternative below */}
            <View style={styles.annotationsContainer}>
              <View style={[styles.messageAnnotation, styles.nativeHint]}>
                <View style={styles.annotationRow}>
                  <Text style={[styles.annotationLabel, isUser ? styles.userAnnotationLabel : {}]}>
                    🌍
                  </Text>
                  <View style={styles.annotationTextContainer}>
                    <HTML
                      source={{ html: highlightedNative }}
                      contentWidth={screenWidth * 0.7} // Increase available width
                      tagsStyles={nativeTagsStyles}
                      baseStyle={nativeBaseStyle}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : isUser && message.corrected && !isEquivalentToCorrected ? (
          // When there are corrections, show the original text with underlined errors
          <View style={styles.mainTextContainer}>
            <HTML
              source={{ html: highlightIncorrectWords }}
              contentWidth={screenWidth * 0.7} // Increase available width
              tagsStyles={correctedTagsStyles}
              baseStyle={[
                styles.mainText,
                isUser && styles.userMainText
              ]}
            />
          </View>
        ) : isAssistant && message.translation ? (
          // NEW CASE: Assistant message with translation available - add touchable to toggle
          <TouchableOpacity
            onPress={toggleTranslation}
            activeOpacity={0.6}
            style={styles.translationTouchable}
          >
            <Text style={[
              styles.mainText,
              styles.assistantMainText,
              isShowingTranslation && styles.translationText
            ]}>
              {isShowingTranslation ? message.translation : message.content}
            </Text>
            <Text style={styles.translationHint}>
              {isShowingTranslation ? "Tap to see original" : "Tap to see translation"}
            </Text>
          </TouchableOpacity>
        ) : (
          // Regular text display for messages without corrections or translation
          <Text style={[
            styles.mainText,
            isUser && styles.userMainText,
            isAssistant && styles.assistantMainText
          ]}>
            {message.content}
          </Text>
        )}

        {showCorrections && !bothCorrectionsMatch && !onlyGrammarCorrect && (
          <View style={styles.annotationsContainer}>
            {message.corrected && (
              <View style={[
                styles.messageAnnotation,
                styles.grammarHint,
                isEquivalentToCorrected && styles.identical
              ]}>
                <View style={styles.annotationRow}>
                  <Text style={[
                    styles.annotationLabel,
                    isUser ? styles.userAnnotationLabel : null,
                    isEquivalentToCorrected && styles.identicalLabel
                  ]}>
                    📝
                  </Text>

                  <View style={styles.annotationTextContainer}>
                    <HTML
                      source={{ html: highlightedCorrected }}
                      contentWidth={screenWidth * 0.7} // Increase available width
                      tagsStyles={correctedTagsStyles}
                      baseStyle={correctedBaseStyle}
                    />

                    {isEquivalentToCorrected && (
                      <Text style={styles.matchIcon}>✓</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {message.natural && (
              <View style={[
                styles.messageAnnotation,
                styles.nativeHint,
                isEquivalentToNative && styles.identical
              ]}>
                <View style={styles.annotationRow}>
                  <Text style={[
                    styles.annotationLabel,
                    isUser ? styles.userAnnotationLabel : {},
                    isEquivalentToNative && styles.identicalLabel
                  ]}>
                    🌍
                  </Text>

                  <View style={styles.annotationTextContainer}>
                    <HTML
                      source={{ html: highlightedNative }}
                      contentWidth={screenWidth * 0.7} // Increase available width
                      tagsStyles={nativeTagsStyles}
                      baseStyle={nativeBaseStyle}
                    />

                    {isEquivalentToNative && (
                      <Text style={styles.matchIcon}>✓</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '90%',
    minWidth: 250,
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: 'auto', // Allow container to adjust based on content
  },
  userMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    backgroundColor: '#f0f4ff', // Lighter blue background for better readability
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#5d6af8', // Accent border on the left
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
  mainTextContainer: {
    marginBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  annotationsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
  },
  mainText: {
    marginBottom: 4,
    fontSize: 16,
    lineHeight: 24,
    color: '#212529', // dark
    flexWrap: 'wrap',
  },
  userMainText: {
    color: '#212529', // Dark text for user messages (on white background)
  },
  assistantMainText: {
    color: '#212529', // Dark text for assistant (on light blue background)
  },
  messageAnnotation: {
    marginTop: 6,
    paddingVertical: 4,
  },
  grammarHint: {
    marginBottom: 6,
  },
  nativeHint: {
    // Styling for native hint
  },
  identical: {
    // Styling for when the hint matches user input
  },
  annotationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top instead of center
  },
  annotationLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: '#2196F3',  // Blue for grammar
    marginRight: 4,
    marginTop: 3, // Add a small top margin to align with text
  },
  annotationTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top
    flexWrap: 'wrap', // Allow text to wrap
  },
  annotationText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1, // Allow text to shrink if needed
    flexWrap: 'wrap',
  },
  userAnnotationLabel: {
    color: '#2196F3', // Blue for grammar in user message (now on white background)
  },
  userAnnotationText: {
    color: '#212529', // Dark text on white background
  },
  identicalLabel: {
    color: '#4CAF50', // success
  },
  identicalText: {
    color: '#4CAF50', // success
    fontWeight: 'bold',
  },
  matchIcon: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  // New styles for perfect match case
  perfectMatchContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top instead of center
    justifyContent: 'space-between',
    width: '100%',
  },
  perfectMatchText: {
    flex: 1, // Take available space
    fontSize: 16,
    lineHeight: 24,
    color: '#4CAF50', // Green text to indicate correctness
    fontWeight: 'bold',
    marginRight: 8, // Add some space between text and emojis
    flexWrap: 'wrap', // Allow text to wrap
  },
  emojiContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginLeft: 'auto', // Push to the right
  },
  emojiIcon: {
    fontSize: 16,
    color: '#4CAF50',
  },
  // New styles for translation feature
  translationTouchable: {
    width: '100%',
  },
  translationText: {
    fontStyle: 'italic',
    color: '#555',
  },
  translationHint: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default React.memo(Message, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.corrected === next.message.corrected &&
    prev.message.natural === next.message.natural &&
    prev.message.translation === next.message.translation &&
    prev.originalUserMessage === next.originalUserMessage
  );
});