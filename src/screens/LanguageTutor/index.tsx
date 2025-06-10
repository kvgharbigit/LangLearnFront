/**
 * LanguageTutor/index.tsx
 * 
 * Main component for the Language Tutor screen.
 * Orchestrates all the components and hooks to provide a complete
 * language learning experience.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Keyboard,
  Alert,
  BackHandler,
  Animated,
} from 'react-native';

// Add global function for updating message TTS status
declare global {
  interface Window {
    updateMessageTTSStatus?: (conversationId: string, messageIndex: number, status: 'running' | 'completed' | 'failed' | 'skipped') => void;
  }
}
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Message as MessageType } from '../../types/messages';
import { hasAvailableQuota } from '../../services/usageService';
import { getWelcomeTitle, getWelcomeSubtitle, getWelcomeMessage } from '../../utils/languageUtils';
import { getOfflineMessageQueue, removeFromOfflineQueue } from '../../utils/api';
import * as api from '../../utils/api';
import useSubscriptionStatus from '../../hooks/useSubscriptionStatus';

// Import hooks
import { useAudioPlayer, useAudioSettings } from './hooks';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { useNetwork } from '../../contexts/NetworkContext';

// Import components
import {
  RecordingButton,
  RecordingStatus,
  EmptyConversation,
  ConversationContainer
} from './components';
import SafeView from '../../components/SafeView';
import ChatInput from '../../components/ChatInput';
import TutorHeader from '../../components/TutorHeader';
import AudioVisualizer from '../../components/AudioVisualizer';
import NetworkStatusBar from '../../components/NetworkStatusBar';
import OfflineWarning from '../../components/OfflineWarning';
import QuotaExceededModal from '../../components/QuotaExceededModal';
import MuteInfoModal from '../../components/MuteInfoModal';
import ReplayButton from '../../components/ReplayButton';
import SubscriptionCancelledBanner from '../../components/SubscriptionCancelledBanner';
// Removed ServerErrorModal import - now using direct alerts

// Import styles and constants
import colors from '../../styles/colors';
import userPreferences from '../../utils/userPreferences';

// Define props type for this screen
type Props = NativeStackScreenProps<RootStackParamList, 'LanguageTutor'>;

/**
 * The main Language Tutor screen component
 */
const LanguageTutor: React.FC<Props> = ({ route, navigation }) => {
  // Get network connectivity status
  const { isConnected } = useNetwork();

  // Conversation state
  const [history, setHistory] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showStartButton, setShowStartButton] = useState<boolean>(true);
  const [welcomeReady, setWelcomeReady] = useState<boolean>(false);
  const [welcomeData, setWelcomeData] = useState<any>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState<boolean>(false);
  const [showOfflineQueue, setShowOfflineQueue] = useState<boolean>(false);
  const [showQuotaExceededModal, setShowQuotaExceededModal] = useState<boolean>(false);
  
  // Function to update TTS status of a message in history
  const updateMessageTTSStatus = useCallback((messageConvId: string, messageIndex: number, status: 'running' | 'completed' | 'failed' | 'skipped') => {
    setHistory(currentHistory => {
      // Find the message to update based on the conversation ID and index
      // For messageIndex = -1, use the last message in the conversation
      const updatedHistory = [...currentHistory];
      let found = false;
      
      // Start from the most recent message and work backwards to find the matching message
      for (let i = updatedHistory.length - 1; i >= 0; i--) {
        const message = updatedHistory[i];
        
        // Check if this message belongs to the target conversation
        if (message.conversationId === messageConvId) {
          if (messageIndex === -1 || i === messageIndex) {
            // Found the message to update
            updatedHistory[i] = {
              ...message,
              tts_status: status
            };
            found = true;
            console.log(`Updated message TTS status: ${status} for conversation ${messageConvId}, index ${messageIndex}`);
            break;
          }
        }
      }
      
      if (!found) {
        console.warn(`Couldn't find message to update TTS status: conversation ${messageConvId}, index ${messageIndex}`);
      }
      
      return updatedHistory;
    });
  }, []);
  
  // Get subscription status from hook
  const subscription = useSubscriptionStatus();
  
  // Voice input state
  const [voiceInputEnabled, setVoiceInputEnabled] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Auto features
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState<boolean>(false);
  const autoRecordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Helper functions to get the current language parameters
  const getTargetLanguage = () => route.params.targetLanguage || 'es';
  const getNativeLanguage = () => route.params.nativeLanguage || 'en';
  const getDifficulty = () => route.params.difficulty || 'beginner';
  const getLearningObjective = () => route.params.learningObjective || '';
  
  // For conversation mode, ensure we use the value saved in AsyncStorage for consistency
  // Initialize with route params to avoid undefined value during initial render
  const [storedConversationMode, setStoredConversationMode] = useState<string>(
    route.params.conversationMode || 'free_conversation'
  );
  
  // Function to get conversation mode - always uses stored value
  const getConversationMode = () => {
    return storedConversationMode;
  };
  
  // Use custom hooks
  const {
    tempo,
    isMuted,
    speechThreshold,
    silenceThreshold,
    silenceDuration,
    updateTempo,
    toggleMute,
    updateSpeechThreshold,
    updateSilenceThreshold,
    updateSilenceDuration
  } = useAudioSettings();
  
  // Debug function exposed to TutorHeader in __DEV__ mode only
  const testErrorModal = useCallback(() => {
    if (__DEV__) {
      console.log('Testing connection error state');
      setHasInitError(true);
    }
  }, []);
  
  const {
    isPlaying,
    statusMessage: audioStatusMessage,
    canReplayLastMessage,
    playAudio,
    stopAudio,
    handleReplayLastMessage
  } = useAudioPlayer({
    isMuted,
    tempo,
    onStatusUpdate: (playing) => {
      // If audio stops and auto-record is enabled, start recording
      if (!playing && autoRecordEnabled && !isRecording) {
        if (autoRecordTimeoutRef.current) {
          clearTimeout(autoRecordTimeoutRef.current);
        }
        
        // Add a small delay before auto-starting recording
        autoRecordTimeoutRef.current = setTimeout(() => {
          startRecording();
        }, 1000);
      }
    }
  });
  
  // Use voice recorder hook
  const {
    isRecording,
    isProcessing,
    isListening,
    isPreBuffering,
    hasSpeech,
    silenceDetected,
    silenceCountdown,
    startRecording,
    stopRecording,
    toggleListening,
    toggleAutoSend,
    cleanup: cleanupRecorder
  } = useVoiceRecorder({
    onSpeechResult: handleVoiceInput,
    speechThreshold,
    silenceThreshold,
    silenceDuration,
    initialAutoSend: autoSendEnabled,
  });
  
  // Animation for the recording pulse effect
  useEffect(() => {
    if (isRecording || isPreBuffering) {
      // Create pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      // Reset animation when not recording
      pulseAnim.setValue(1);
    }
    
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isRecording, isPreBuffering, pulseAnim]);
  
  /**
   * Handle sending a text message
   */
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    // Check network connectivity
    if (!isConnected) {
      Alert.alert(
        "You're Offline",
        "Your message will be sent when you reconnect to the internet.",
        [{ text: "OK" }]
      );
      
      return;
    }
    
    // Prevent duplicate sends - check if already loading
    if (isLoadingResponse) {
      console.log('Message send already in progress, ignoring duplicate request');
      return;
    }
    
    setIsLoadingResponse(true);
    
      // Simple logging for request start
    console.log("📤 Sending message to API");
    
    try {
      // If no conversation exists, create one
      if (!conversationId) {
        await initializeConversation();
      }
      
      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }
      
      // Add user message to history immediately
      const userMessage: MessageType = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      setHistory(prev => [...prev, userMessage]);
      
      // Send message to API
      // Always use the same conversation mode that was used to create the conversation
      // to prevent mode mismatch issues with the backend
      const response = await api.sendTextMessage(
        message,
        conversationId,
        tempo,
        getDifficulty(),
        getNativeLanguage(),
        getTargetLanguage(),
        getLearningObjective(),
        isMuted,
        getConversationMode()
      );
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      // Add assistant response to history
      if (response) {
        // Log the response to verify fields
        console.log("API response:", JSON.stringify(response, null, 2));
        
        const assistantMessage: MessageType = {
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
          translation: response.translation,
          corrected: response.corrected,
          natural: response.natural,
          natural_translation: response.natural_translation,
          conversationId: response.conversation_id,
          hasAudio: response.has_audio,
          tts_status: response.has_audio ? 'running' : 'skipped'
        };
        
        // Debug log to verify the 'natural' field
        console.log("Natural field extracted:", assistantMessage.natural);
        
        setHistory(prev => [...prev, assistantMessage]);
        
        // Update conversation ID if needed
        if (response.conversation_id && response.conversation_id !== conversationId) {
          setConversationId(response.conversation_id);
        }
        
        // Update message status when the response is received
        if (response.has_audio) {
          // First, update the TTS status on the message to indicate it's ready
          updateMessageTTSStatus(response.conversation_id, response.message_index || -1, 'completed');
          
          // Then play audio if not muted
          if (!isMuted) {
            await playAudio(response.conversation_id, response.message_index);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Clear the timeout to prevent showing both alerts
      clearTimeout(timeoutId);
      
      // Navigate back to landing page with error message
      Alert.alert(
        "Connection Error",
        "We're unable to connect to the language tutor server. Please try again later.",
        [
          { text: "Return to Homepage", onPress: () => navigation.navigate('LanguageLanding') }
        ],
        { cancelable: false }
      );
    } finally {
      // Clear the timeout if we reach this point (success or error)
      clearTimeout(timeoutId);
      setIsLoadingResponse(false);
    }
  }, [
    conversationId, 
    isConnected, 
    tempo, 
    isMuted, 
    getTargetLanguage, 
    getNativeLanguage, 
    getDifficulty, 
    getLearningObjective,
    getConversationMode,
    initializeConversation,
    playAudio
  ]);
  
  /**
   * Handle voice input result
   */
  async function handleVoiceInput(transcript: string, confidence: number) {
    console.log(`Transcript received: ${transcript} (confidence: ${confidence})`);
    
    // If no speech was detected
    if (transcript === '' || transcript.includes('__NO_SPEECH_DETECTED__') || transcript.includes('Amara.org')) {
      setStatusMessage('No speech detected. Please try again.');
      return;
    }
    
    // Send the transcribed message
    await handleSendMessage(transcript);
  }
  
  /**
   * Handle voice button click
   */
  const handleVoiceButtonClick = useCallback(() => {
    if (isRecording || isPreBuffering) {
      stopRecording();
    } else if (!isProcessing && !isPlaying) {
      startRecording();
    }
  }, [isRecording, isPreBuffering, isProcessing, isPlaying, startRecording, stopRecording]);
  
  /**
   * Toggle auto record setting
   */
  const toggleAutoRecord = useCallback(() => {
    setAutoRecordEnabled(prev => !prev);
  }, []);
  
  /**
   * Toggle auto send setting
   */
  const toggleAutoSend = useCallback(() => {
    const newValue = !autoSendEnabled;
    setAutoSendEnabled(newValue);
    toggleAutoSend(newValue);
  }, [autoSendEnabled, toggleAutoSend]);
  
  /**
   * Test function to trigger the error state
   * This is only for debugging purposes
   */
  const testServerErrorModal = useCallback(() => {
    setHasInitError(true);
    console.log("🔴 ERROR STATE SET TO TRUE FOR TESTING");
  }, []);

  /**
   * Initialize a new conversation
   */
  const initializeConversation = useCallback(async () => {
    // Reset error state
    setHasInitError(false);
    setErrorMessage("");
    
    // Set up a timeout to force error state after 10 seconds
    const timeoutId = setTimeout(() => {
      console.log("⏱️ Initialization timeout reached - FORCING ERROR STATE");
      setIsLoading(false);
      // Force the error state to be true
      setHasInitError(true);
      // Override welcome message completely
      setErrorMessage("We're having trouble connecting to our language tutor service. This may be due to network issues or the server being unavailable.");
      // Force welcomeData to be null so it doesn't show
      setWelcomeData(null);
      console.log("🔴 ERROR STATE FORCED");
      
      // Return to homepage after a delay if user doesn't click button
      setTimeout(() => {
        if (hasInitError) {
          console.log("🏠 Auto-navigating to homepage after timeout");
          navigation.navigate('LanguageLanding');
        }
      }, 5000);
    }, 8000); // 8 seconds
    
    try {
      setIsLoading(true);
      
      // Check if user has available quota
      const hasQuota = await hasAvailableQuota();
      if (!hasQuota) {
        // Clear timeout since we're not waiting on server response anymore
        clearTimeout(timeoutId);
        
        // Show quota exceeded modal
        setShowQuotaExceededModal(true);
        
        // Create a welcome message that explains the quota limit
        let quotaExceededMessage = {
          role: 'assistant',
          content: "You've reached your monthly usage limit. Please upgrade your subscription to continue using the language tutor.",
          timestamp: new Date().toISOString(),
        };
        
        setHistory([quotaExceededMessage]);
        setShowStartButton(false);
        return null;
      }
      
      // Create new conversation
      const response = await api.createConversation({
        tempo,
        difficulty: getDifficulty(),
        target_language: getTargetLanguage(),
        native_language: getNativeLanguage(),
        learning_objective: getLearningObjective(),
        is_muted: isMuted,
        conversation_mode: getConversationMode(),
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      if (response) {
        // Set conversation ID
        setConversationId(response.conversation_id);
        
        // Add welcome message to history
        if (response.history && response.history.length > 0) {
          setHistory(response.history);
        }
        
        // Hide start button
        setShowStartButton(false);
        
        // Update message status and play welcome audio if needed
        if (response.has_audio) {
          // First, update the TTS status on the message to indicate it's ready
          updateMessageTTSStatus(response.conversation_id, response.message_index || 0, 'completed');
          
          // Then play audio if not muted
          if (!isMuted) {
            await playAudio(response.conversation_id, response.message_index);
          }
        }
        
        return response.conversation_id;
      }
      
      return null;
    } catch (error) {
      console.error('Error initializing conversation:', error);
      
      // Clear the timeout to prevent showing both alerts
      clearTimeout(timeoutId);
      
      // Force the error state to be true
      setIsLoading(false);
      setHasInitError(true);
      console.log("🔴 ERROR STATE SET TO TRUE IN CATCH BLOCK");
      
      // Force a render update
      setWelcomeData(prev => ({
        ...prev,
        hasError: true
      }));
      
      return null;
    } finally {
      // Clear the timeout if we reach this point (success or error)
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [
    tempo, 
    isMuted, 
    getTargetLanguage, 
    getNativeLanguage, 
    getDifficulty, 
    getLearningObjective,
    getConversationMode,
    playAudio
  ]);
  
  /**
   * Load saved conversation mode from AsyncStorage
   * This runs once when the component mounts
   */
  useEffect(() => {
    const loadSavedConversationMode = async () => {
      try {
        // First, immediately save route params mode to AsyncStorage to ensure consistency
        // This makes sure any mode selected on the landing page is saved
        if (route.params.conversationMode) {
          await userPreferences.saveSingleAudioSetting('CONVERSATION_MODE', route.params.conversationMode);
          
          // Only log in dev mode
          if (__DEV__) {
            console.log(`🔍 Conversation mode: ${route.params.conversationMode}`);
          }
          
          // Update local state with route params immediately
          setStoredConversationMode(route.params.conversationMode);
        } else {
          // If no route params, check what's in AsyncStorage
          const savedMode = await userPreferences.getSingleSetting('CONVERSATION_MODE', 'language_lesson');
          setStoredConversationMode(savedMode as string);
        }
      } catch (error) {
        console.error('Error handling conversation mode:', error);
        // Fall back to route params or default
        setStoredConversationMode(route.params.conversationMode || 'language_lesson');
      }
    };
    
    loadSavedConversationMode();
    // Only run this effect once on mount, not on route params changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Prepare welcome data when component mounts
   */
  useEffect(() => {
    // Get the target language and native language
    const targetLanguage = getTargetLanguage();
    const nativeLanguage = getNativeLanguage();
    const difficulty = getDifficulty();
    const learningObjective = getLearningObjective();
    
    // Check for offline messages first
    getOfflineMessageQueue().then(queue => {
      if (queue && queue.length > 0) {
        setShowOfflineQueue(true);
      }
    });
    
    // Get welcome title and subtitle
    const title = getWelcomeTitle(targetLanguage, difficulty);
    const subtitle = getWelcomeSubtitle(targetLanguage, difficulty);
    let message = getWelcomeMessage(targetLanguage, nativeLanguage, difficulty, learningObjective);
    
    // Set welcome data
    setWelcomeData({
      icon: '👋',
      title,
      message
    });
    
    setWelcomeReady(true);
  }, []);
  
  // Initialize sound and cleanup when unmounting
  useEffect(() => {
    // Get target language
    const targetLanguage = getTargetLanguage();
    console.log(`🌐 Target language: ${targetLanguage}`);
    
    // Set title for the screen
    navigation.setOptions({
      title: `Language Tutor - ${targetLanguage.toUpperCase()}`
    });

    // Clean up on unmount
    return () => {
      // Clean up voice recorder
      cleanupRecorder();
      
      // Clean up auto-record timeout
      if (autoRecordTimeoutRef.current) {
        clearTimeout(autoRecordTimeoutRef.current);
        autoRecordTimeoutRef.current = null;
      }
    };
  }, [navigation, getTargetLanguage, cleanupRecorder]);
  
  // Add navigation event listeners to stop audio when exiting the screen
  useEffect(() => {
    // Function to stop audio playback
    const stopAudioPlayback = async () => {
      console.log("📩 Screen blur/navigation - stopping audio playback");
      
      if (isPlaying) {
        try {
          await stopAudio();
        } catch (error) {
          console.error('Error stopping audio on screen blur:', error);
        }
      }
    };
    
    // Setup listeners for screen blur and hardware back button
    const unsubscribeBlur = navigation.addListener('blur', stopAudioPlayback);
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log("🔍 Screen focused");
    });
    
    // Add back button handler (for Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      stopAudioPlayback();
      return false; // Don't prevent default back button behavior
    });
    
    // Expose the updateMessageTTSStatus function globally
    if (typeof window !== 'undefined') {
      window.updateMessageTTSStatus = updateMessageTTSStatus;
    }
    
    // Cleanup listeners when component unmounts
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
      backHandler.remove();
      
      // Remove global function on unmount
      if (typeof window !== 'undefined') {
        window.updateMessageTTSStatus = undefined;
      }
    };
  }, [navigation, isPlaying, stopAudio, updateMessageTTSStatus]);
  
  return (
    <SafeView>
      <NetworkStatusBar />
      {/* Subscription Cancelled Banner */}
      {subscription.isCancelled && subscription.expirationDate && (
        <SubscriptionCancelledBanner
          expirationDate={subscription.expirationDate}
          tier={subscription.tier}
        />
      )}
      <TutorHeader
        targetLanguage={getTargetLanguage()}
        nativeLanguage={getNativeLanguage()}
        difficulty={getDifficulty()}
        conversationMode={getConversationMode()}
        tempo={tempo}
        onTempoChange={updateTempo}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onToggleAutoRecord={toggleAutoRecord}
        onToggleAutoSend={toggleAutoSend}
        autoRecordEnabled={autoRecordEnabled}
        autoSendEnabled={autoSendEnabled}
        navigation={navigation}
        testErrorModal={__DEV__ ? testErrorModal : undefined}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Show offline warning if not connected */}
        {!isConnected && <OfflineWarning />}
        
        {/* Main conversation container */}
        {history.length === 0 ? (
          // Show welcome screen if no messages yet
          welcomeReady && (
            <EmptyConversation
              welcomeIcon={welcomeData?.icon || '👋'}
              welcomeTitle={welcomeData?.title || 'Welcome'}
              welcomeMessage={welcomeData?.message || 'Loading...'}
              onStartPress={initializeConversation}
              isLoading={isLoading}
            />
          )
        ) : (
          // Show conversation if there are messages
          <ConversationContainer
            history={history}
            isLoadingResponse={isLoadingResponse}
            tempo={tempo}
            onPlayAudio={playAudio}
          />
        )}
        
        {/* Input container */}
        {(!showStartButton || history.length > 0) && (
          <View style={styles.inputContainer}>
            {voiceInputEnabled ? (
            <View style={styles.voiceInputControls}>
              {/* Recording button */}
              <RecordingButton
                onPress={handleVoiceButtonClick}
                isRecording={isRecording}
                isProcessing={isProcessing}
                isListening={isListening}
                isPlaying={isPlaying}
                isPreBuffering={isPreBuffering}
                autoRecordEnabled={autoRecordEnabled}
                disabled={isProcessing || isPlaying}
                pulseAnim={pulseAnim}
              />

              {/* Recording status indicator */}
              <RecordingStatus
                isRecording={isRecording}
                isPreBuffering={isPreBuffering}
                hasSpeech={hasSpeech}
                silenceDetected={silenceDetected}
                autoSendEnabled={autoSendEnabled}
                silenceCountdown={silenceCountdown}
              />
              
              {/* Show audio visualizer when recording */}
              {(isRecording || isPreBuffering) && !silenceDetected && (
                <AudioVisualizer />
              )}
              
              {/* Show replay button when there's a last message */}
              {canReplayLastMessage && !isRecording && !isPreBuffering && (
                <ReplayButton onPress={handleReplayLastMessage} disabled={isPlaying} />
              )}
            </View>
            ) : (
              // Show text input when voice input is disabled
              <ChatInput
                onSubmit={handleSendMessage}
                disabled={isLoadingResponse || isProcessing}
                isPlaying={isPlaying}
                targetLanguage={getTargetLanguage()}
                isMuted={isMuted}
              />
            )}
          </View>
        )}
        
        {/* Quota exceeded modal */}
        <QuotaExceededModal
          visible={showQuotaExceededModal}
          onClose={() => setShowQuotaExceededModal(false)}
        />
        
        {/* Mute info modal */}
        <MuteInfoModal
          navigation={navigation}
          afterDismiss={() => {}}
        />
        
        {/* Server Error Modal removed - now using inline EmptyConversation error state */}
      </KeyboardAvoidingView>
    </SafeView>
  );
};

/**
 * Styles for the Language Tutor screen
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
    padding: 16,
  },
  voiceInputControls: {
    alignItems: 'center',
    gap: 16,
  },
});

export default LanguageTutor;