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
  natural_translation?: string;
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
  // Use message timestamp as unique key for height tracking
  const messageKey = `${message.timestamp}_${message.content}`;
  const [annotationContainerHeight, setAnnotationContainerHeight] = useState<number | null>(null);
  
  // Calculate padding needed to equalize text heights
  const textPadding = useMemo(() => {
    if (!message.natural_translation || !message.natural) return { original: 0, translation: 0 };
    
    const originalLength = message.natural.length;
    const translationLength = message.natural_translation.length;
    
    // Estimate line count for each (rough estimate: 35 chars per line)
    const originalLines = Math.ceil(originalLength / 35);
    const translationLines = Math.ceil(translationLength / 35);
    const maxLines = Math.max(originalLines, translationLines);
    
    // Calculate padding needed to equalize heights (16px per line difference)
    const originalPadding = (maxLines - originalLines) * 16;
    const translationPadding = (maxLines - translationLines) * 16;
    
    return { original: originalPadding, translation: translationPadding };
  }, [message.natural, message.natural_translation]);

  // Only reset height when message content changes, not on translation toggle
  useEffect(() => {
    setAnnotationContainerHeight(null);
  }, [messageKey]); // Removed isShowingTranslation dependency

  // Calculate estimated height based on text content to minimize layout changes
  const estimatedHeight = useMemo(() => {
    if (!message.natural_translation || !message.natural) return null;
    
    // Estimate height based on longer text content + base height
    const originalLength = message.natural.length;
    const translationLength = message.natural_translation.length;
    const maxLength = Math.max(originalLength, translationLength);
    
    // Base height + estimated text height + hint (only for assistant)
    const baseHeight = isUser ? 30 : 40; // Even smaller base for user messages
    const hintHeight = isAssistant ? 15 : 0;
    const minHeight = isUser ? 30 : 55; // Even smaller minimum for user messages
    
    return Math.max(minHeight, baseHeight + Math.ceil(maxLength * 0.8) + hintHeight);
  }, [message.natural, message.natural_translation, isAssistant, isUser]);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  // Count words in the user's message
  const wordCount = message.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  
  // Determine if this message should show corrections
  // Only user messages will have corrections directly attached to them now
  // Don't show corrections for single-word replies
  const showCorrections = isUser && (message.corrected || message.natural) && wordCount > 1;

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
      console.log("🔍 [DEBUG] Message with natural field:", {
        content: message.content,
        natural: message.natural,
        natural_translation: message.natural_translation,
        has_natural_translation: !!message.natural_translation,
        all_message_keys: Object.keys(message)
      });
    }
  }, [message.content, message.natural, message.natural_translation]);

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
      // Toggle translation state without resetting height
      // This prevents layout shifts that cause scrolling jumps
      setIsShowingTranslation(!isShowingTranslation);
      
      // Use requestAnimationFrame to update height after render
      // instead of triggering it before the state change
      requestAnimationFrame(() => {
        // Only update height if needed, with a small delay to prevent jumps
        setTimeout(() => setAnnotationContainerHeight(null), 50);
      });
    }
  };

  // Toggle translation function (only used for assistant messages with translation)

  // Handler to measure container height
  const handleAnnotationContainerLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    console.log(`📏 Measuring annotation container height: ${height}px for ${isUser ? 'user' : 'assistant'} message`);
    setAnnotationContainerHeight(height);
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
          message.natural_translation ? (
            <View
              style={styles.perfectMatchTouchable}
              onLayout={handleAnnotationContainerLayout}
            >
              <View style={styles.perfectMatchContainer}>
                <Text style={styles.perfectMatchText}>
                  {message.corrected}
                </Text>
                <View style={styles.emojiContainer}>
                  <Text style={styles.emojiIcon}>📝</Text>
                  <Text style={styles.emojiIcon}>🌍</Text>
                </View>
              </View>
              
              {/* Always show translation below */}
              {message.natural_translation && (
                <View style={styles.translationContainer}>
                  <View style={styles.translationRow}>
                    <Text style={styles.translationText}>
                      {message.natural_translation}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.perfectMatchContainer}>
              <Text style={styles.perfectMatchText}>
                {message.corrected} {/* Use the corrected version with proper punctuation */}
              </Text>
              <View style={styles.emojiContainer}>
                <Text style={styles.emojiIcon}>📝</Text>
                <Text style={styles.emojiIcon}>🌍</Text>
              </View>
            </View>
          )
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
            <View 
              style={[
                styles.annotationsContainer,
                isUser ? styles.annotationsContainerUser : {}
              ]}
              onLayout={handleAnnotationContainerLayout}
            >
              {message.natural_translation ? (
                <View
                  style={[
                    styles.nativeTranslationTouchable, 
                    isUser ? styles.nativeTranslationContainerUser : styles.nativeTranslationContainer
                  ]}
                >
                  <View style={[
                    styles.messageAnnotation, 
                    styles.nativeHint,
                    isUser ? styles.messageAnnotationUser : {}
                  ]}>
                    <View style={styles.annotationRow}>
                      <Text style={[styles.annotationLabel, isUser ? styles.userAnnotationLabel : {}]}>
                        🌍
                      </Text>
                      <View style={styles.annotationTextContainer}>
                        <View>
                          <HTML
                            source={{ html: highlightedNative }}
                            contentWidth={screenWidth * 0.75}
                            tagsStyles={nativeTagsStyles}
                            baseFontStyle={nativeBaseStyle}
                            customHTMLElementModels={customHTMLElementModels}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  {/* Always show translation below */}
                  {message.natural_translation && (
                    <View style={styles.translationContainer}>
                      <View style={styles.translationRow}>
                        <Text style={[nativeBaseStyle, styles.nativeTranslationText]}>
                          {message.natural_translation}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.messageAnnotation, styles.nativeHint]}>
                  <View style={styles.annotationRow}>
                    <Text style={[styles.annotationLabel, isUser ? styles.userAnnotationLabel : {}]}>
                      🌍
                    </Text>
                    <View style={styles.annotationTextContainer}>
                      <HTML
                        source={{ html: highlightedNative }}
                        contentWidth={screenWidth * 0.75}
                        tagsStyles={nativeTagsStyles}
                        baseFontStyle={nativeBaseStyle}
                        customHTMLElementModels={customHTMLElementModels}
                      />
                    </View>
                  </View>
                </View>
              )}
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
          // Assistant message with translation available - improved to prevent scroll jumps
          <TouchableOpacity
            onPress={toggleTranslation}
            activeOpacity={0.6}
            style={[
              styles.translationTouchable,
              // Calculate fixed height based on both content lengths to prevent layout shifts
              message.translation && {
                minHeight: Math.max(
                  (message.content.length / 30) * 20,
                  (message.translation.length / 30) * 20,
                  40
                )
              }
            ]}
            onLayout={handleAnnotationContainerLayout}
          >
            <Text style={[
              styles.mainText,
              styles.assistantMainText,
              isShowingTranslation && styles.translationText
            ]}>
              {isShowingTranslation ? message.translation : message.content}
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
          <View 
            style={[
              styles.annotationsContainer,
              isUser ? styles.annotationsContainerUser : {}
            ]}
            onLayout={handleAnnotationContainerLayout}
          >
            {/* Check if natural and corrected are identical */}
            {message.corrected && (naturalAndCorrectedIdentical ? (
              // When natural and corrected are identical, show only one line with both emojis
              message.natural_translation ? (
                <View
                  style={[
                    styles.nativeTranslationTouchable, 
                    isUser ? styles.nativeTranslationContainerUser : styles.nativeTranslationContainer
                  ]}
                >
                  <View style={[
                    styles.messageAnnotation,
                    styles.grammarHint,
                    isEquivalentToCorrected && styles.identical,
                    isUser ? styles.messageAnnotationUser : {}
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
                          <View>
                            <HTML
                              source={{ html: highlightedCorrected }}
                              contentWidth={screenWidth * 0.75}
                              tagsStyles={correctedTagsStyles}
                              baseFontStyle={correctedBaseStyle}
                              customHTMLElementModels={customHTMLElementModels}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {/* Always show translation below */}
                  {message.natural_translation && (
                    <View style={styles.translationContainer}>
                      <View style={styles.translationRow}>
                        <Text style={[correctedBaseStyle, styles.nativeTranslationText]}>
                          {message.natural_translation}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
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
              )
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
                  message.natural_translation ? (
                    <View
                      style={[
                        styles.nativeTranslationTouchable, 
                        isUser ? styles.nativeTranslationContainerUser : styles.nativeTranslationContainer
                      ]}
                    >
                      <View style={[
                        styles.messageAnnotation,
                        styles.nativeHint,
                        isEquivalentToNative && styles.identical,
                        isUser ? styles.messageAnnotationUser : {}
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
                              <Text style={[styles.perfectMatchText]}>
                                {message.natural}
                                <Text style={styles.matchIcon}>✓</Text>
                              </Text>
                            ) : (
                              // When not perfectly correct, use the highlighting approach
                              <View>
                                <HTML
                                  source={{ html: highlightedNative }}
                                  contentWidth={screenWidth * 0.75}
                                  tagsStyles={nativeTagsStyles}
                                  baseFontStyle={nativeBaseStyle}
                                  customHTMLElementModels={customHTMLElementModels}
                                />
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      
                      {/* Always show translation below */}
                      {message.natural_translation && (
                        <View style={styles.translationContainer}>
                          <View style={styles.translationRow}>
                            <Text style={[nativeBaseStyle, styles.nativeTranslationText]}>
                              {message.natural_translation}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
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
                  )
                )}
              </>
            ))}
          </View>
        )}

        {/* Add audio controls for assistant messages if this is the latest one */}
        {isAssistant && isLatestAssistantMessage && message.hasAudio && !isMuted && (
          <View style={styles.replayButtonContainer}>
            {isPlaying === true ? (
              // Show green playing button when audio is actually playing (highest priority)
              <TouchableOpacity
                style={[
                  styles.replayButton,
                  styles.replayButtonPlaying
                ]}
                onPress={onRequestReplay}
              >
                <Ionicons name="volume-high" size={16} color="#ffffff" />
                <Text style={styles.replayButtonText}>Playing...</Text>
              </TouchableOpacity>
            ) : message.tts_status === 'running' ? (
              // Show loading indicator when TTS is generating and not playing
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
              // Show grey replay button when TTS is ready but not playing
              <TouchableOpacity
                style={styles.replayButton}
                onPress={onRequestReplay}
              >
                <Ionicons name="play" size={16} color="#ffffff" />
                <Text style={styles.replayButtonText}>Replay</Text>
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
    flexDirection: 'row', // Force horizontal flow
    flexWrap: 'wrap', // Ensure content wraps
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
    maxWidth: '90%', // Ensure assistant messages don't exceed 90% width
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
    width: '100%', // Ensure text takes full width of its container
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
  perfectMatchTouchable: {
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
    flexShrink: 1,
  },
  translationText: {
    fontStyle: 'italic',
    color: '#555',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  // Styles for translation container
  translationContainer: {
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    width: '100%',
  },
  userTranslationContainer: {
    marginTop: 4,
    paddingTop: 2,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
    width: '100%',
    paddingLeft: 2,
  },
  translationEmoji: {
    fontSize: 14,
    marginRight: 0,
    marginTop: 0,
  },
  emojiWrapper: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    flexShrink: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  emojiWrapper: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // New styles for native translation feature
  nativeTranslationTouchable: {
    width: '100%',
  },
  nativeTranslationText: {
    fontStyle: 'italic',
    color: '#555',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 12,
    lineHeight: 16,
  },
  nativeTranslationContainer: {
    minHeight: 50, // Ensure minimum height to prevent jumping
    justifyContent: 'flex-start', // Don't push hint to bottom
    paddingBottom: 0, // Remove padding as we're using hintContainer
  },
  nativeTranslationContainerUser: {
    paddingBottom: 0, // No padding for user messages - keep it tight
    paddingTop: 0, // Remove top padding too
    marginBottom: 0, // Remove bottom margin
    // Remove minHeight and height constraints - let content determine size naturally
    justifyContent: 'flex-start', // No space-between needed since no hint text
  },
  messageAnnotationUser: {
    marginTop: 0, // Remove top margin for user messages
    marginBottom: 0, // Remove bottom margin for user messages
    paddingVertical: 0, // Remove vertical padding
    paddingTop: 0,
    paddingBottom: 0,
  },
  annotationsContainerUser: {
    marginTop: 1, // Minimal top margin
    marginBottom: 0, // Remove negative margin - let it sit naturally
    paddingTop: 4, // Small padding after border
    paddingBottom: 0, // Remove bottom padding
    borderTopWidth: 1, // Add border separator back
    borderTopColor: 'rgba(0, 0, 0, 0.1)', // Light border like assistant messages
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
    prev.message.natural_translation === next.message.natural_translation &&
    prev.message.translation === next.message.translation &&
    prev.originalUserMessage === next.originalUserMessage &&
    prev.isLatestAssistantMessage === next.isLatestAssistantMessage &&
    prev.isMuted === next.isMuted
  );
});