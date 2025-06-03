// Updated Message.tsx with replay button for assistant messages and proper export structure

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import HTML, { HTMLElementModel, HTMLContentModel } from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';
import { normalizeText, areMessagesEquivalent, highlightDifferences } from '../utils/text';

// Define custom element models for colored text
const customHTMLElementModels = {
  greentext: HTMLElementModel.fromCustomModel({
    tagName: 'greentext',
    contentModel: HTMLContentModel.textual
  }),
  orangetext: HTMLElementModel.fromCustomModel({
    tagName: 'orangetext', 
    contentModel: HTMLContentModel.textual
  }),
  strong: HTMLElementModel.fromCustomModel({
    tagName: 'strong',
    contentModel: HTMLContentModel.textual
  }),
  positionerror: HTMLElementModel.fromCustomModel({
    tagName: 'positionerror',
    contentModel: HTMLContentModel.textual
  })
};

// Get screen width for dynamic sizing
const screenWidth = Dimensions.get('window').width;

// Define message interface
export interface MessageData {
  role: 'user' | 'assistant' | 'system';
  content: string;
  corrected?: string;
  natural?: string;
  translation?: string;
  timestamp: string;
  isTemporary?: boolean;
  hasAudio?: boolean; // Property to indicate if message has audio
  tts_status?: 'completed' | 'running' | 'failed' | 'skipped'; // TTS generation status
}

// Props interface with replay-related props
interface MessageProps {
  message: MessageData;
  originalUserMessage?: string | null;
  isLatestAssistantMessage?: boolean; // Prop to identify the latest assistant message
  onRequestReplay?: () => void; // Callback for replay request
  isPlaying?: boolean; // Indicate if audio is currently playing
  isMuted?: boolean; // Indicate if audio is muted
}

const Message: React.FC<MessageProps> = ({
  message,
  originalUserMessage,
  isLatestAssistantMessage = false,
  onRequestReplay,
  isPlaying = false,
  isMuted = false
}) => {
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
    
    // Debug: Log natural and corrected fields for debugging visibility issues
    if (message.natural) {
      console.log("Natural field content:", message.natural);
      console.log("Natural field highlighting:", highlightDifferences(message.content, message.natural, 'natural'));
    }
    
    return areMessagesEquivalent(message.content, suggestion);
  };

  // Check if suggestions match the original message
  const isEquivalentToNative = message.natural && isEquivalentToOriginal(message.natural);
  const isEquivalentToCorrected = message.corrected && isEquivalentToOriginal(message.corrected);
  
  // Log message fields for debugging
  useEffect(() => {
    if (message.natural) {
      console.log("Message with natural field:", {
        content: message.content,
        natural: message.natural
      });
    }
  }, [message.content, message.natural]);

  // Check if BOTH corrections match - this is our new case to handle
  const bothCorrectionsMatch = isEquivalentToNative && isEquivalentToCorrected && message.natural && message.corrected;
  
  // Check if natural and corrected fields are identical to each other
  const naturalAndCorrectedIdentical = message.natural && message.corrected && 
                                     normalizeText(message.natural) === normalizeText(message.corrected);

  // NEW CASE: Check if grammatically correct but not natively correct
  const onlyGrammarCorrect = isEquivalentToCorrected && !isEquivalentToNative && message.corrected && message.natural;

  // Highlight differences in suggestions only if they're not equivalent
  const highlightedNative = isEquivalentToNative
    ? message.natural // Perfect matches are handled by JSX
    : message.natural
      ? highlightDifferences(message.content, message.natural, 'natural')
      : '';

  const highlightedCorrected = isEquivalentToCorrected
    ? message.corrected // Perfect matches are handled by JSX
    : message.corrected
      ? highlightDifferences(message.content, message.corrected, 'corrected')
      : '';

  // For highlighting the user's original message against the corrected version
  const highlightIncorrectWords = useMemo(() => {
    if (!isUser || !message.corrected || isEquivalentToCorrected) {
      // If there's no correction or the correction is the same, return unchanged
      return message.content;
    }
    
    return highlightDifferences(message.corrected, message.content, 'user');
  }, [isUser, message.content, message.corrected, isEquivalentToCorrected]);
  
  // Ensure we parse natural field correctly to fix display issue
  useEffect(() => {
    if (message.natural) {
      console.log("Natural field found:", message.natural);
    }
  }, [message.natural]);

  // Styles for HTML rendering - using the original approach that works
  const correctedTagsStyles = useMemo(() => ({
    strong: {
      fontWeight: 'bold',
      color: '#FF0000', // Red for non-matching words
    },
    greentext: {
      color: '#4CAF50', // Green for matching words
    },
    orangetext: {
      fontWeight: 'bold',
      color: '#FF9800', // Orange for words in natural not in user
    },
    positionerror: {
      color: '#FF5722', // Deep orange for position errors
      textDecorationLine: 'underline', // Underline position errors as requested
      textDecorationStyle: 'solid',
      textDecorationColor: '#FF5722',
    }
  }), []);

  const nativeTagsStyles = useMemo(() => ({
    strong: {
      fontWeight: 'bold',
      color: '#FF0000', // Red for non-matching words
    },
    greentext: {
      color: '#4CAF50', // Green for matching words in similar positions
    },
    orangetext: {
      fontWeight: 'bold', // Bold text
      color: '#FF8C00', // Orange color for better visibility (DarkOrange)
      // No background color
    },
    positionerror: {
      color: '#FF5722', // Deep orange for position errors
      textDecorationLine: 'underline', // Underline position errors as requested
      textDecorationStyle: 'solid',
      textDecorationColor: '#FF5722',
    }
  }), []);

  // Revert to original approach for rendering HTML content with colors
  const correctedBaseStyle = useMemo(() => {
    const baseStyle = {
      ...styles.annotationText,
      // Perfect match case is handled separately in the JSX
      color: '#212529' // Default color for text
    };
    if (isUser) {
      return { ...baseStyle, ...styles.userAnnotationText };
    }
    return baseStyle;
  }, [isUser]);

  const nativeBaseStyle = useMemo(() => {
    const baseStyle = {
      ...styles.annotationText,
      // Perfect match case is handled separately in the JSX
      color: '#212529' // Default color for text
    };
    if (isUser) {
      return { ...baseStyle, ...styles.userAnnotationText };
    }
    return baseStyle;
  }, [isUser]);

  // Toggle translation function
  const toggleTranslation = () => {
    if (message.translation) {
      setIsShowingTranslation(!isShowingTranslation);
    }
  };

  // Check if this message should show a replay button
  // Only show replay button on the latest assistant message when TTS is completed
  const showReplayButton = isAssistant &&
                           isLatestAssistantMessage && // Only show on latest assistant message
                           onRequestReplay &&
                           !isUser &&
                           message.hasAudio === true &&
                           message.tts_status === 'completed' && // Only show when TTS is ready
                           !isMuted;


  return (
    <View style={[
      styles.messageContainer,
      isUser && styles.userMessage,
      isAssistant && styles.assistantMessage,
      isSystem && styles.systemMessage,
      // Add dynamic width for user messages with corrections
      (isUser && showCorrections) && styles.wideUserMessage
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
                    {/* Apply the highlighted native text with our new styling */}
                    <HTML
                      source={{ html: highlightedNative }}
                      contentWidth={screenWidth * 0.75} // Increased available width
                      tagsStyles={nativeTagsStyles}
                      baseFontStyle={nativeBaseStyle}
                      customHTMLElementModels={customHTMLElementModels}
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
              contentWidth={screenWidth * 0.75} // Increased available width
              tagsStyles={correctedTagsStyles}
              baseFontStyle={isUser ? { ...styles.mainText, ...styles.userMainText } : styles.mainText}
              customHTMLElementModels={customHTMLElementModels}
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
            {/* Check if natural and corrected are identical */}
            {message.corrected && (naturalAndCorrectedIdentical ? (
              // When natural and corrected are identical, show only one line with both emojis
              <View style={[
                styles.messageAnnotation,
                styles.grammarHint,
                isEquivalentToCorrected && styles.identical
              ]}>
                <View style={styles.annotationRow}>
                  <View style={styles.combinedEmojiContainer}>
                    <Text style={[
                      styles.annotationLabel,
                      isUser ? styles.userAnnotationLabel : null,
                      isEquivalentToCorrected && styles.identicalLabel
                    ]}>
                      📝
                    </Text>
                    <Text style={[
                      styles.annotationLabel,
                      isUser ? styles.userAnnotationLabel : {},
                      isEquivalentToNative && styles.identicalLabel
                    ]}>
                      🌍
                    </Text>
                  </View>

                  <View style={styles.annotationTextContainer}>
                    {isEquivalentToCorrected ? (
                      // When perfectly correct, display in bold green
                      <Text style={styles.perfectMatchText}>
                        {message.corrected}
                        <Text style={styles.matchIcon}>✓</Text>
                      </Text>
                    ) : (
                      // When not perfectly correct, use the highlighting approach
                      <HTML
                        source={{ html: highlightedCorrected }}
                        contentWidth={screenWidth * 0.75} // Increased available width
                        tagsStyles={correctedTagsStyles}
                        baseFontStyle={correctedBaseStyle}
                        customHTMLElementModels={customHTMLElementModels}
                      />
                    )}
                  </View>
                </View>
              </View>
            ) : (
              // Original rendering when natural and corrected are different
              <>
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
                      {isEquivalentToCorrected ? (
                        // When perfectly correct, display in bold green
                        <Text style={styles.perfectMatchText}>
                          {message.corrected}
                          <Text style={styles.matchIcon}>✓</Text>
                        </Text>
                      ) : (
                        // When not perfectly correct, use the highlighting approach
                        <HTML
                          source={{ html: highlightedCorrected }}
                          contentWidth={screenWidth * 0.75} // Increased available width
                          tagsStyles={correctedTagsStyles}
                          baseFontStyle={correctedBaseStyle}
                          customHTMLElementModels={customHTMLElementModels}
                        />
                      )}
                    </View>
                  </View>
                </View>

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
                        {isEquivalentToNative ? (
                          // When perfectly correct, display in bold green
                          <Text style={styles.perfectMatchText}>
                            {message.natural}
                            <Text style={styles.matchIcon}>✓</Text>
                          </Text>
                        ) : (
                          // When not perfectly correct, use the highlighting approach
                          // Now includes green highlighting for matching words in similar positions
                          <HTML
                            source={{ html: highlightedNative }}
                            contentWidth={screenWidth * 0.75} // Increased available width
                            tagsStyles={nativeTagsStyles}
                            baseFontStyle={nativeBaseStyle}
                            customHTMLElementModels={customHTMLElementModels}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </>
            ))}
          </View>
        )}

        {/* Add audio controls for assistant messages if this is the latest one */}
        {isAssistant && isLatestAssistantMessage && message.hasAudio && !isMuted && (
          <View style={styles.replayButtonContainer}>
            {message.tts_status === 'running' ? (
              // Show loading indicator when TTS is generating
              <View style={styles.audioStatusContainer}>
                <Ionicons name="musical-notes" size={16} color="#666" />
                <Text style={styles.audioStatusText}>Generating audio...</Text>
              </View>
            ) : message.tts_status === 'failed' ? (
              // Show error message if TTS failed
              <View style={styles.audioStatusContainer}>
                <Ionicons name="alert-circle" size={16} color="#ff6b6b" />
                <Text style={[styles.audioStatusText, { color: '#ff6b6b' }]}>Audio failed</Text>
              </View>
            ) : message.tts_status === 'completed' && onRequestReplay ? (
              // Show replay button when TTS is ready
              <TouchableOpacity
                style={[
                  styles.replayButton,
                  isPlaying === true && styles.replayButtonPlaying // Explicit check
                ]}
                onPress={onRequestReplay}
                disabled={isPlaying === true} // Explicit check
              >
                {isPlaying === true ? ( // Explicit check
                  <Ionicons name="volume-high" size={16} color="#ffffff" />
                ) : (
                  <Ionicons name="play" size={16} color="#ffffff" />
                )}
                <Text style={styles.replayButtonText}>
                  {isPlaying === true ? 'Playing...' : 'Replay'} {/* Explicit check */}
                </Text>
              </TouchableOpacity>
            ) : null}
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
    // Removed fixed width to allow dynamic sizing
  },
  // New style for user messages with corrections - make them wider
  wideUserMessage: {
    width: '90%', // Use a wider fixed width for messages with corrections
    maxWidth: screenWidth * 0.9, // But not wider than 90% of screen
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
    width: '100%', // Ensure content takes full width of container
  },
  mainTextContainer: {
    marginBottom: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%', // Ensure container takes full width
  },
  annotationsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
    width: '100%', // Ensure container takes full width
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
    width: '100%', // Ensure annotation takes full width
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
    width: '100%', // Ensure row takes full width
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
    // Remove flexShrink and flexWrap which may be causing issues in HTML rendering
  },
  userAnnotationLabel: {
    color: '#2196F3', // Blue for grammar in user message (now on white background)
  },
  userAnnotationText: {
    // Removed color property to allow our base style color to work
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
    fontWeight: 'bold', // Bold for emphasis
    marginRight: 8, // Add some space between text and emojis
    flexWrap: 'wrap', // Allow text to wrap
    textShadowColor: 'rgba(0, 128, 0, 0.2)', // Green shadow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4, // Creates a glow effect to enhance visibility
  },
  emojiContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginLeft: 'auto', // Push to the right
  },
  combinedEmojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
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
  // New styles for replay button
  replayButtonContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5d6af8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  replayButtonPlaying: {
    backgroundColor: '#4CAF50', // Green when playing
  },
  audioStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  audioStatusText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  replayButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

// Export the component with memo for optimization
// This needs to be outside any functions/blocks at the top level
export default React.memo(Message, (prev, next) => {
  // Always re-render when isPlaying changes to ensure UI updates
  if (prev.isPlaying !== next.isPlaying) {
    return false; // Return false to indicate it should re-render
  }
  
  // Otherwise, check other props
  return (
    prev.message.content === next.message.content &&
    prev.message.corrected === next.message.corrected &&
    prev.message.natural === next.message.natural &&
    prev.message.translation === next.message.translation &&
    prev.originalUserMessage === next.originalUserMessage &&
    prev.isLatestAssistantMessage === next.isLatestAssistantMessage &&
    prev.isMuted === next.isMuted
  );
});