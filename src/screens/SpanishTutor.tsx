import React, { useState, useEffect, useRef } from 'react';
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
  const [continuousConversation, setContinuousConversation] = useState<boolean>(false);

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
      handleAudioData();
    }
  }, [isRecording, hasSpeech, isProcessing]);

  // This effect watches for the end of silence countdown and triggers auto-submission
  useEffect(() => {
    if (isRecording && hasSpeech && silenceDetected && silenceCountdown === 0) {
      stopRecording();
    }
  }, [isRecording, hasSpeech, silenceDetected, silenceCountdown, stopRecording]);

  // Silence safety mechanism
  useEffect(() => {
    let silenceTimer: NodeJS.Timeout | null = null;

    if (isRecording && hasSpeech && silenceDetected) {
      silenceTimer = setTimeout(() => {
        stopRecording();
      }, AUDIO_SETTINGS.SILENCE_DURATION + 500);
    }

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [isRecording, hasSpeech, silenceDetected, stopRecording]);

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
  // Place this useEffect in your SpanishTutor component

// Audio setup and permission handling
// Updated Audio setup useEffect with correct constants
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

        allowsRecordingIOS: false, //When this flag is set to true, playback may be routed to the phone earpiece instead of to the speaker. Set it back to false after stopping recording to reenable playback through the speaker.
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

      if (response.audio_url) {
        const audioUrl = `https://storage.googleapis.com/language-tutor-app-2025-audio-files/${response.audio_url.replace(/^\/?static\/audio\//, 'static/audio/')}`;
        setStatusMessage('Playing audio ...' + audioUrl);
        await playAudio(audioUrl);
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

// Updated playAudio function for SpanishTutor.tsx

const playAudio = async (audioUrl: string): Promise<void> => {
  try {
    // Ensure we unload any previous sound before creating a new one
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    console.log("Loading audio from URL:", audioUrl);

    // Make sure the URL is properly formatted
    const fixedUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `https://storage.googleapis.com/language-tutor-app-2025-audio-files/${audioUrl.replace(/^\/?static\/audio\//, "static/audio/")}`;;

    console.log("Fixed URL:", fixedUrl);

    // First try direct streaming (avoid downloading if possible)
    try {
      console.log("Attempting direct streaming...");

      const onStatusUpdate = (status: Audio.PlaybackStatus): void => {
          if (!status.isLoaded) {
            if (status.error) {
              console.error(`Audio playback error: ${status.error}`);
            }
            return;
          }

          if (status.isPlaying) {
            setIsPlaying(true);
          } else if (status.didJustFinish) {
            console.log("Audio finished playing.");
            setIsPlaying(false);

            // Cleanup the sound so pause button disappears
            if (soundRef.current) {
              soundRef.current.unloadAsync().catch(err => console.error('Unload failed:', err));
              soundRef.current = null;
            }
          }
        };

        playbackCallbackRef.current = onStatusUpdate;

      const { sound } = await Audio.Sound.createAsync(
        { uri: fixedUrl },
        { shouldPlay: false}, // Don't auto-play until we verify it works
        onStatusUpdate
      );

      // Check if the sound loaded successfully
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        console.log("Direct streaming successful");
        soundRef.current = sound;
        await sound.playAsync(); // Start playing after we know it loaded
        setIsPlaying(true);
        console.log("Setting audio playing");
        return;
      }

      // If we got here, loading worked but playback might not, let's try download method
      await sound.unloadAsync();
    } catch (streamError) {
      console.log("Direct streaming failed, trying download method:", streamError);
    }

    // Download the audio file as fallback
    try {
      const localUri = await api.downloadAudio(fixedUrl);
      console.log("Downloaded to local URI:", localUri);

      // Force audio file format recognition by adding extension if missing
      let playableUri = localUri;
      if (!localUri.toLowerCase().endsWith('.mp3') && !localUri.toLowerCase().endsWith('.wav')) {
        // This helps iOS recognize the format properly
        if (fixedUrl.toLowerCase().endsWith('.mp3')) {
          // Rename the file with .mp3 extension
          const newUri = `${localUri}.mp3`;
          await FileSystem.copyAsync({ from: localUri, to: newUri });
          playableUri = newUri;
        }
      }

      // Create sound object with proper audio settings for iOS
      const { sound } = await Audio.Sound.createAsync(
        { uri: playableUri },
        {
          shouldPlay: true,
          rate: tempo,
          progressUpdateIntervalMillis: 200,
          positionMillis: 0,
          volume: 1.0,
          isMuted: false,
          isLooping: false,
          audioPan: 0,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (downloadError) {
      console.error('Error playing downloaded audio:', downloadError);
      throw downloadError; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('Error playing audio:', error);

    // Show an error message to the user
    setHistory(prev => [
      ...prev,
      {
        role: 'system',
        content: "Sorry, I couldn't play the audio response. You can continue with text chat.",
        timestamp: new Date().toISOString()
      }
    ]);

    setIsPlaying(false);
  }
};

// Enhanced playback status handling

  // Process recorded audio
  const handleAudioData = async (): Promise<void> => {
    const audioUri = getAudioURI();

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

      // Play audio
      if (response.audio_url) {
        const audioUrl = `https://storage.googleapis.com/language-tutor-app-2025-audio-files/${response.audio_url.replace(/^\/?static\/audio\//, 'static/audio/')}`;
        setStatusMessage('Playing audio response...' + audioUrl);
        await playAudio(audioUrl);
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

  const handleVoiceButtonClick = (): void => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Function to pause audio playback
  const pauseAudio = async (): Promise<void> => {
    if (soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  };

  // Function to resume audio playback
  const resumeAudio = async (): Promise<void> => {
    if (soundRef.current) {
      try {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error resuming audio:', error);
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
        continuousConversation={continuousConversation}
        setContinuousConversation={setContinuousConversation}
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
                      Silence detected - will auto-submit {silenceCountdown ? `in ${silenceCountdown}s` : 'shortly'}
                    </Text>
                  </>
                ) : hasSpeech ? (
                  <>
                    <Text style={styles.statusIcon}>🗣️</Text>
                    <Text style={styles.statusText}>Recording your speech... Pause to auto-submit</Text>
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

      {/* Audio controls */}
      {isPlaying && (
        <View style={styles.audioControls}>
          <TouchableOpacity
            style={styles.audioControlButton}
            onPress={pauseAudio}
          >
            <Text style={styles.audioControlText}>Pause Audio</Text>
          </TouchableOpacity>
        </View>
      )}
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