import React, { useState, useEffect, useRef  } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Message as MessageType } from '../types/messages';

// Import components
import Message from '../components/Message';
import ChatInput from '../components/ChatInput';
import TutorHeader from '../components/TutorHeader';
import AudioVisualizer from '../components/AudioVisualizer';
import StatusPill from '../components/StatusPill';

// Import hooks
import useVoiceRecorder from '../hooks/useVoiceRecorder';

// Import utilities
import * as api from '../utils/api';

// Import constants
import { AUDIO_SETTINGS, API_CONFIG } from '../constants/settings';
import colors from '../styles/colors';

// Interface for language info
interface LanguageInfo {
  name: string;
  flag: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'SpanishTutor'>;

const SpanishTutor: React.FC<Props> = ({ route, navigation }) => {
  // Get params from navigation
  const {
    nativeLanguage = 'en',
    targetLanguage = 'es',
    difficulty = 'beginner',
    learningObjective = ''
  } = route.params;

  // Core state
  const [history, setHistory] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tempo, setTempo] = useState<number>(0.75);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState<boolean>(false);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackCallbackRef = useRef<((status: Audio.PlaybackStatus) => void) | null>(null);

  // Get language display info
  const getLanguageInfo = (code: string): LanguageInfo => {
    const languages: Record<string, LanguageInfo> = {
      'en': { name: 'English', flag: '🇬🇧' },
      'es': { name: 'Spanish', flag: '🇪🇸' }
    };
    return languages[code] || { name: 'Unknown', flag: '🏳️' };
  };

  const targetInfo = getLanguageInfo(targetLanguage);

  // Use our custom voice recorder hook
  const voiceRecorder = useVoiceRecorder({
    silenceThreshold: AUDIO_SETTINGS.SILENCE_THRESHOLD,
    speechThreshold: AUDIO_SETTINGS.SPEECH_THRESHOLD,
    silenceDuration: AUDIO_SETTINGS.SILENCE_DURATION,
    minRecordingTime: AUDIO_SETTINGS.MIN_RECORDING_TIME,
    checkInterval: AUDIO_SETTINGS.CHECK_INTERVAL,
  });

  // Destructure values from the hook
  const {
    isRecording,
    hasSpeech,
    silenceDetected,
    audioLevel,
    peakLevel,
    statusMessage,
    silenceCountdown,
    audioSamples,
    isProcessing,
    startRecording,
    stopRecording,
    getAudioURI,
    resetRecording,
    setIsProcessing,
    setStatusMessage
  } = voiceRecorder;

  // Start pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Handle media recorder stop event
  useEffect(() => {
    if (!isRecording && hasSpeech && !isProcessing) {
      console.log("🟢 handleAudioData() TRIGGERED");
      handleAudioData();
    }
  }, [isRecording, hasSpeech, isProcessing]);

  // NEW AUTO-SEND IMPLEMENTATION
  // This is a simplified auto-send feature that triggers when:
  // 1. Auto-send is enabled
  // 2. We're recording
  // 3. Speech has been detected
  // 4. Silence has been detected for the required duration (when silenceCountdown reaches 0)
  useEffect(() => {
    if (autoSendEnabled && isRecording && hasSpeech && silenceDetected) {
      // If silence countdown has reached 0 or is less than 0, stop recording
      // This will trigger the audio processing flow
      if (silenceCountdown !== null && silenceCountdown <= 0) {
        console.log("📢 Auto-send triggered - stopping recording");
        stopRecording();
      }
    }
  }, [autoSendEnabled, isRecording, hasSpeech, silenceDetected, silenceCountdown, stopRecording]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [history]);

  // Welcome message when the component mounts
  useEffect(() => {
    if (history.length === 0) {
      let welcomeMessage: MessageType = {
        role: 'assistant',
        content: targetLanguage === 'es'
          ? '¡Hola! Soy tu tutor de español. ¿Cómo puedo ayudarte hoy?'
          : 'Hello! I\'m your English tutor. How can I help you today?',
        timestamp: new Date().toISOString()
      };

      // Add learning objective to welcome message if provided
      if (learningObjective) {
        welcomeMessage = {
          ...welcomeMessage,
          content: targetLanguage === 'es'
            ? `¡Hola! Veo que quieres practicar: "${learningObjective}". ¡Empecemos!`
            : `Hello! I see you want to practice: "${learningObjective}". Let's begin!`
        };
      }

      setHistory([welcomeMessage]);
    }
  }, [targetLanguage, learningObjective]);

  // Cleanup sound on unmount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Request audio permissions
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          console.warn('Audio permissions not granted');
        }

        // Configure audio session with correct constant values
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          // Use the correct enum values for interruption modes
          interruptionModeIOS: 1, // Audio.InterruptionModeIOS.DoNotMix = 1
          interruptionModeAndroid: 1, // Audio.InterruptionModeAndroid.DoNotMix = 1
        });

        console.log('Audio session configured successfully');

        // Clean up any existing sound object
        if (soundRef.current) {
          if (playbackCallbackRef.current) {
            soundRef.current.setOnPlaybackStatusUpdate(null); // Remove old listener
          }
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      } catch (error) {
        console.error('Failed to set up audio system:', error);
      }
    };

    setupAudio();

    // Cleanup function
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(error => {
          console.error('Error cleaning up audio:', error);
        });
      }
    };
  }, []);

  // Text chat handler
  const handleSubmit = async (inputMessage: string): Promise<void> => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: MessageType = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setHistory(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.sendTextMessage(
        inputMessage,
        conversationId,
        tempo,
        difficulty,
        nativeLanguage,
        targetLanguage,
        learningObjective
      );

      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      setHistory(response.history);

      if (response.has_audio) {
        setStatusMessage('Streaming audio...');
        await playAudio(response.conversation_id, response.message_index);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: MessageType = {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      };

      setHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

const playAudio = async (conversationId, messageIndex = -1): Promise<void> => {
  try {
    // Unload previous sound
    if (soundRef.current) {
      console.log("🎵 [AUDIO] Unloading previous sound before creating new one");
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    // Configure audio session for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: 1, // DoNotMix
      interruptionModeAndroid: 1, // DoNotMix
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
    console.log("🎧 Audio session configured for playback");

    // Build streaming URL
    const audioUrl = api.getAudioStreamUrl(conversationId, messageIndex, tempo, targetLanguage);
    console.log("🎵 [AUDIO] Audio streaming URL:", audioUrl);

    let statusUpdateCount = 0;
    let lastPositionMillis = 0;
    let positionStuckCount = 0;

    const onStatusUpdate = (status: Audio.PlaybackStatus): void => {
      console.log("🎵 [AUDIO] Status update triggered:", status);
      statusUpdateCount++;

      if (!status.isLoaded) {
        if (status.error) {
          console.error(`🎵 [AUDIO] Playback error: ${status.error}`);
        }
        console.log(`🎵 [AUDIO] Status update #${statusUpdateCount}: Not loaded`);
        return;
      }

      if (status.positionMillis === lastPositionMillis && status.isPlaying) {
        positionStuckCount++;
        if (positionStuckCount > 5) {
          console.log(`🎵 [AUDIO] WARNING: Position stuck at ${status.positionMillis}ms for ${positionStuckCount} updates`);
        }
      } else {
        positionStuckCount = 0;
      }
      lastPositionMillis = status.positionMillis;

      // Check for both explicit finish and our "likely finished" condition
      const isLikelyFinished =
        status.isLoaded &&
        !status.isPlaying &&
        status.positionMillis > 0 &&
        (!status.durationMillis || status.positionMillis >= status.durationMillis - 100);

      const nearEnd = status.durationMillis && status.positionMillis > status.durationMillis - 500;
      if (nearEnd) {
        console.log(`🎵 [AUDIO] NEAR END: position=${status.positionMillis}ms`);
      }

      if (status.isPlaying) {
        setIsPlaying(true);
      } else if (status.didJustFinish || isLikelyFinished) {
        // Respond to either didJustFinish OR our likelyFinished condition
        if (status.didJustFinish) {
          console.log(`🎵 [AUDIO] DETECTION: didJustFinish event triggered playback completion`);
        } else if (isLikelyFinished) {
          console.log(`🎵 [AUDIO] DETECTION: isLikelyFinished condition detected completion in status update handler`);
        }
        console.log(`🎵 [AUDIO] DETAILS: didJustFinish=${status.didJustFinish}, isPlaying=${!status.isPlaying}, positionMillis=${status.positionMillis}, durationMillis=${status.durationMillis || 'unknown'}`);

        setIsPlaying(false);
        setStatusMessage('Ready'); // Update status when playback completes
        if (soundRef.current) {
          soundRef.current.unloadAsync().catch(err => console.error("🎵 [AUDIO] Unload failed:", err));
          soundRef.current = null;
        }
      }
    };

    // Create sound with shouldPlay: true
    console.log("🎵 [AUDIO] Creating audio object with streaming");
    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl, isNetwork: true },
      {
        shouldPlay: true,
        rate: 1.0,
        progressUpdateIntervalMillis: 100,
        volume: 1.0,
        isMuted: false,
        isLooping: false,
      },
      onStatusUpdate
    );

    soundRef.current = sound;

    // 🔁 Fallback polling mechanism - keep this as an additional safety net
    const pollingInterval = 200;
    const maxPollTime = 120000; // 120 seconds (2 minutes) timeout
    let elapsed = 0;

    const poll = setInterval(async () => {
      elapsed += pollingInterval;

      if (!soundRef.current) {
        clearInterval(poll);
        return;
      }

      const status = await soundRef.current.getStatusAsync();

      const likelyFinished =
        status.isLoaded &&
        !status.isPlaying &&
        status.positionMillis > 0 &&
        (!status.durationMillis || status.positionMillis >= status.durationMillis - 100);

      if (likelyFinished) {
        console.log("🎵 [AUDIO] DETECTION: Backup polling mechanism detected playback completion");
        console.log(`🎵 [AUDIO] DETAILS: isPlaying=${!status.isPlaying}, positionMillis=${status.positionMillis}, durationMillis=${status.durationMillis || 'unknown'}, elapsed=${elapsed}ms`);

        setIsPlaying(false);
        setStatusMessage('Ready'); // Update status when polling detects completion
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        clearInterval(poll);
      }

      if (elapsed >= maxPollTime) {
        console.warn("🎵 [AUDIO] DETECTION: Polling timed out after 120 seconds without detecting finish");
        setStatusMessage('Ready'); // Update status even if polling times out
        clearInterval(poll);
      }
    }, pollingInterval);

    // Initial status check
    const initialStatus = await sound.getStatusAsync();
    console.log("🎵 [AUDIO] Initial sound status:", {
      isLoaded: initialStatus.isLoaded,
      positionMillis: initialStatus.positionMillis,
      durationMillis: initialStatus.durationMillis,
      isPlaying: initialStatus.isPlaying,
      isBuffering: initialStatus.isBuffering
    });

    setIsPlaying(true);
  } catch (error) {
    console.error("🎵 [AUDIO] DETECTION: Error during audio playback:", error);
    setHistory(prev => [
      ...prev,
      {
        role: 'system',
        content: "Sorry, I couldn't play the audio response. You can continue with text chat.",
        timestamp: new Date().toISOString()
      }
    ]);
    setIsPlaying(false);
    setStatusMessage('Ready'); // Update status on error
  }
};  const handleAudioData = async (): Promise<void> => {
    const audioUri = getAudioURI();
    console.log("🎧 Audio URI to submit:", audioUri);
    if (!audioUri) {
      setStatusMessage('No audio data recorded');
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);
    setStatusMessage('Processing audio data...');

    try {
      // Show temporary message
      const tempMessage: MessageType = {
        role: 'user',
        content: "🎤 Processing voice...",
        timestamp: new Date().toISOString(),
        isTemporary: true
      };
      setHistory(prev => [...prev, tempMessage]);

      const response = await api.sendVoiceRecording({
        audioUri,
        conversationId,
        tempo,
        difficulty,
        nativeLanguage,
        targetLanguage,
        learningObjective
      });

      setStatusMessage('Received response from server');
      console.log("📨 Received response from server:", response);

      // Update conversation
      setHistory(prev => {
        const filtered = prev.filter(msg => !msg.isTemporary);

        if (response.transcribed_text) {
          return [
            ...filtered,
            {
              role: 'user',
              content: response.transcribed_text,
              timestamp: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: response.reply,
              corrected: response.corrected,
              natural: response.natural,
              timestamp: new Date().toISOString()
            }
          ];
        }
        return filtered;
      });

      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      // Play audio using the same approach as text input
      if (response.has_audio) {
        setStatusMessage('Streaming audio...');
        await playAudio(response.conversation_id, response.message_index);
      }

    } catch (error) {
      console.error('Error processing voice input:', error);
      setStatusMessage(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      setHistory(prev => {
        const filtered = prev.filter(msg => !msg.isTemporary);
        return [
          ...filtered,
          {
            role: 'system',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            timestamp: new Date().toISOString()
          }
        ];
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
      resetRecording();
    }
  };

  // UI Handlers
  const toggleVoiceInput = (): void => {
    if (isRecording) {
      stopRecording();
    }
    setVoiceInputEnabled(!voiceInputEnabled);
    setStatusMessage(`Voice input ${!voiceInputEnabled ? 'enabled' : 'disabled'}`);
  };

  const handleVoiceButtonClick = async (): Promise<void> => {
    if (isRecording) {
      stopRecording();
    } else {
      // Stop any playing audio before starting recording
      if (isPlaying && soundRef.current) {
        try {
          // First check if the sound is loaded
          const status = await soundRef.current.getStatusAsync();

          if (status.isLoaded) {
            // Give a short delay to ensure no seeking is in progress
            await new Promise(resolve => setTimeout(resolve, 50));
            await soundRef.current.stopAsync();
          }

          setIsPlaying(false);
          startRecording();
        } catch (error) {
          console.warn('Non-critical error stopping audio:', error);
          setIsPlaying(false);
          startRecording();
        }
      } else {
        startRecording();
      }
    }
  };

  // Render conversation messages
  const renderMessages = () => {
    if (history.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.welcomeIcon}>👋</Text>
          <Text style={styles.welcomeTitle}>
            {targetLanguage === 'es' ? '¡Hola! Soy tu tutor de español.' : 'Hello! I am your English tutor.'}
          </Text>
          <Text style={styles.welcomeText}>
            {targetLanguage === 'es'
              ? 'Start practicing your Spanish conversation skills!'
              : 'Start practicing your English conversation skills!'}
          </Text>
        </View>
      );
    }

    return history.map((msg, index) => {
      // Find the original user message if this is an assistant message
      const originalUserMessage = msg.role === 'assistant'
        ? history[index - 1]?.content
        : null;

      return (
        <Message
          key={index}
          message={msg}
          originalUserMessage={originalUserMessage}
        />
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TutorHeader
        targetLanguage={targetLanguage}
        targetInfo={targetInfo}
        tempo={tempo}
        setTempo={setTempo}
        voiceInputEnabled={voiceInputEnabled}
        toggleVoiceInput={toggleVoiceInput}
        autoSendEnabled={autoSendEnabled}
        setAutoSendEnabled={setAutoSendEnabled}
        autoRecordEnabled={false} // Removed this feature
        setAutoRecordEnabled={() => {}} // Empty function
        debugMode={debugMode}
        setDebugMode={setDebugMode}
        navigation={navigation}
      />

      {debugMode && (
        <View style={styles.debugPanel}>
          <View style={styles.debugInfo}>
            <View style={styles.debugMetrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Level</Text>
                <Text style={styles.metricValue}>{audioLevel.toFixed(1)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Peak</Text>
                <Text style={styles.metricValue}>{peakLevel.toFixed(1)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Status</Text>
                <Text style={styles.metricValueStatus}>{statusMessage}</Text>
              </View>
            </View>

            <View style={styles.debugStatusPills}>
              <StatusPill
                active={isRecording}
                icon="🎙️"
                label="Recording"
              />
              <StatusPill
                active={hasSpeech}
                icon="🗣️"
                label="Speech"
              />
              <StatusPill
                active={silenceDetected}
                icon="🔇"
                label="Silence"
              />
              {silenceDetected && silenceCountdown !== null && (
                <View style={styles.countdownTimer}>
                  <Text style={styles.countdownText}>{silenceCountdown}s</Text>
                </View>
              )}
            </View>

            <AudioVisualizer
              audioSamples={audioSamples}
              speechThreshold={AUDIO_SETTINGS.SPEECH_THRESHOLD}
              silenceThreshold={AUDIO_SETTINGS.SILENCE_THRESHOLD}
            />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.conversationContainer}
        ref={scrollViewRef}
        contentContainerStyle={styles.conversationContent}
      >
        {renderMessages()}

        {isLoading && (
          <View style={styles.loadingMessage}>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        {voiceInputEnabled ? (
          <View style={styles.voiceInputControls}>
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && styles.recordingButton,
                isProcessing && styles.processingButton
              ]}
              onPress={handleVoiceButtonClick}
              disabled={isProcessing}
            >
              {isRecording ? (
                <>
                  <Animated.View
                    style={[
                      styles.pulse,
                      { transform: [{ scale: pulseAnim }] }
                    ]}
                  />
                  <Text style={styles.micIcon}>🎙️</Text>
                  <Text style={styles.buttonText}>Stop Recording</Text>
                </>
              ) : isProcessing ? (
                <>
                  <Text style={styles.processingIcon}>⏳</Text>
                  <Text style={styles.buttonText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.micIcon}>🎙️</Text>
                  <Text style={styles.buttonText}>Start Recording</Text>
                </>
              )}
            </TouchableOpacity>

            {isRecording && (
              <View style={[
                styles.recordingStatus,
                silenceDetected ? styles.silenceStatus :
                hasSpeech ? styles.speechStatus : styles.waitingStatus
              ]}>
                {silenceDetected ? (
                  <>
                    <Text style={styles.statusIcon}>🔇</Text>
                    <Text style={styles.statusText}>
                      {autoSendEnabled
                        ? `Silence detected - will auto-submit ${silenceCountdown ? `in ${silenceCountdown}s` : 'shortly'}`
                        : 'Silence detected - press Stop when finished'}
                    </Text>
                  </>
                ) : hasSpeech ? (
                  <>
                    <Text style={styles.statusIcon}>🗣️</Text>
                    <Text style={styles.statusText}>
                      {autoSendEnabled
                        ? 'Recording your speech... Pause to auto-submit'
                        : 'Recording your speech...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.statusIcon}>👂</Text>
                    <Text style={styles.statusText}>Waiting for speech...</Text>
                  </>
                )}
              </View>
            )}
          </View>
        ) : (
          <ChatInput
            onSubmit={handleSubmit}
            disabled={isLoading}
            targetLanguage={targetLanguage}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  conversationContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    height: 300,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
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
  voiceButton: {
    position: 'relative',
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 250,
    height: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingButton: {
    backgroundColor: colors.danger,
  },
  processingButton: {
    backgroundColor: colors.warning,
  },
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: -1,
  },
  micIcon: {
    fontSize: 20,
  },
  processingIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1,
    minWidth: 280,
  },
  waitingStatus: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  speechStatus: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  silenceStatus: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  statusIcon: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 14,
  },
  debugPanel: {
    backgroundColor: colors.gray100,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray300,
    padding: 16,
  },
  debugInfo: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  debugMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metric: {
    backgroundColor: colors.gray100,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
  },
  metricValueStatus: {
    fontSize: 14,
    color: colors.gray800,
  },
  debugStatusPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  countdownTimer: {
    backgroundColor: colors.warning,
    borderRadius: 50,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  countdownText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  audioControls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  audioControlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 50,
  },
  audioControlText: {
    color: 'white',
    fontSize: 14,
  },
});

export default SpanishTutor;