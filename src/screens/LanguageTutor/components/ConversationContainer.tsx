/**
 * ConversationContainer.tsx
 * 
 * Container component for the conversation area, including the message list
 * and typing indicators.
 */

import React, { useRef, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  NativeSyntheticEvent, 
  NativeScrollEvent 
} from 'react-native';
import Message from '../../../components/Message';
import { Message as MessageType } from '../../../types/messages';
import colors from '../../../styles/colors';

interface ConversationContainerProps {
  history: MessageType[];
  isLoadingResponse: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tempo: number;
  onPlayAudio: (conversationId: string, messageIndex: number) => void;
}

/**
 * Container for the messages in a conversation
 */
const ConversationContainer: React.FC<ConversationContainerProps> = ({
  history,
  isLoadingResponse,
  onScroll,
  tempo,
  onPlayAudio,
}) => {
  // Reference to the scroll view for scrolling to bottom
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to bottom only when new messages are added
  useEffect(() => {
    if (scrollViewRef.current && history.length > 0) {
      // Use a timeout to ensure the layout is complete before scrolling
      // Only scroll if this is a new message being added (not a translation toggle)
      const isNewMessage = history.length > 0 && 
                          history[history.length - 1].timestamp && 
                          Date.now() - new Date(history[history.length - 1].timestamp).getTime() < 2000;
      
      if (isNewMessage) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }
  }, [history.length]);

  return (
    <View style={styles.conversationContainer}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.conversationContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
      >
        {/* Render all messages */}
        {history.map((message, index) => (
          <Message
            key={`${message.role}-${index}`}
            message={message}
            onPlayAudio={() => {
              if (message.role === 'assistant' && message.content) {
                onPlayAudio(message.conversationId || '', index);
              }
            }}
            tempo={tempo}
            isSpecial={index === history.length - 1 && message.role === 'assistant'}
          />
        ))}

        {/* Loading indicator when waiting for response */}
        {isLoadingResponse && (
          <View style={styles.loadingMessage}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
              <View style={[styles.typingDot, { animationDelay: '200ms' }]} />
              <View style={[styles.typingDot, { animationDelay: '400ms' }]} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/**
 * Styles for the conversation container and messages
 */
const styles = StyleSheet.create({
  conversationContainer: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  conversationContent: {
    padding: 16,
    paddingBottom: 24,
    width: '100%', // Ensure content container has full width
  },
  loadingMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    padding: 16,
    marginVertical: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  typingDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.gray400,
    opacity: 0.4,
  },
});

export default ConversationContainer;