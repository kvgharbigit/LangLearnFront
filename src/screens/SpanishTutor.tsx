import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackCallbackRef = useRef<((status: Audio.PlaybackStatus) => void) | null>(null);
  const autoRecordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preRecordingRef = useRef<Audio.Recording | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const preRecordingActiveRef = useRef<boolean>(false);

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

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    }

    // If turning off voice input, also turn off auto-record and listening mode
    if (voiceInputEnabled) {
      setAutoRecordEnabled(false);

      // Clean up any active pre-recording or timeouts
      cleanup();
    }

    setVoiceInputEnabled(!voiceInputEnabled);
    setStatusMessage(`Voice input ${!voiceInputEnabled ? 'enabled' : 'disabled'}`);
  };

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

  // AUTO-SEND IMPLEMENTATION
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
}, [targetLanguage, learningObjective, history.length]);

  // Cleanup function for all recording-related resources
  const cleanup = () => {
    console.log('Running cleanup...');

    // Stop pre-recording listener if active
    if (preRecordingRef.current) {
      try {
        // Only try to unload if it's been prepared
        if (preRecordingActiveRef.current) {
          preRecordingRef.current.stopAndUnloadAsync().catch(error => {
            console.warn('Error stopping pre-recording listener:', error);
          });
        }
        preRecordingRef.current = null;
        preRecordingActiveRef.current = false;
      } catch (error) {
        console.error('Error during pre-recording cleanup:', error);
      }
    }

    // Clear any timeout
    if (autoRecordTimeoutRef.current) {
      clearTimeout(autoRecordTimeoutRef.current);
      autoRecordTimeoutRef.current = null;
    }

    // Reset listening state
    setIsListening(false);
  };

  // Set up isMounted and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

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
          interruptionModeIOS: 1, // Audio.InterruptionModeIOS.DoNotMix = 1
          interruptionModeAndroid: 1, // Audio.InterruptionModeAndroid.DoNotMix = 1
        });

        console.log('Audio session configured successfully');

        // Clean up any existing sound object
        if (soundRef.current) {
          if (playbackCallbackRef.current) {
            soundRef.current.setOnPlaybackStatusUpdate(null);
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
      isMountedRef.current = false;

      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(error => {
          console.error('Error cleaning up audio:', error);
        });
      }

      cleanup();
    };
  }, []);

  // Pre-recording listener for smart auto-record
  const startPreRecordingListener = async () => {
  // Don't start if we're already in recording, processing, or pre-recording state
  if (isRecording || isProcessing || preRecordingActiveRef.current) {
    console.log("🎙️ [PRE-RECORD] Already in recording state, ignoring listener request");
    return;
  }

  try {
    console.log("🎙️ [PRE-RECORD] Starting pre-recording listener");

    // First, make sure we're in the correct audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    // Update UI state
    setIsListening(true);

    // Create a temporary recording to access microphone levels without saving
    const tempRecording = new Audio.Recording();
    preRecordingRef.current = tempRecording;

    // Start preparing the recording
    await tempRecording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        meteringEnabled: true,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        meteringEnabled: true,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      }
    });

    // Mark as active since we've successfully prepared
    preRecordingActiveRef.current = true;

    // Set up a status listener to detect speech
    tempRecording.setOnRecordingStatusUpdate((status) => {
      if (!isMountedRef.current) return;

      if (status.isRecording) {
        // Convert dB to normalized level (0-100)
        const db = status.metering !== undefined ? status.metering : -160;
        const normalizedLevel = Math.max(0, (db + 160) / 160 * 100);

        // Check if user has started speaking
        if (normalizedLevel > voiceRecorder.settings.speechThreshold) {
          console.log(`🎙️ [PRE-RECORD] Speech detected at level: ${normalizedLevel.toFixed(1)}`);

          // First, mark the pre-recording as inactive to prevent race conditions
          preRecordingActiveRef.current = false;

          // Cancel any timeout
          if (autoRecordTimeoutRef.current) {
            clearTimeout(autoRecordTimeoutRef.current);
            autoRecordTimeoutRef.current = null;
          }

          // Store reference to current recording to clean up
          const currentRecording = preRecordingRef.current;
          preRecordingRef.current = null;

          // Update UI immediately
          setIsListening(false);

          // Stop and unload the temporary recording COMPLETELY before starting a new one
          // Use a Promise chain to ensure proper sequence
          Promise.resolve()
            .then(() => {
              if (currentRecording) {
                return currentRecording.stopAndUnloadAsync()
                  .catch(err => {
                    console.warn("🎙️ [PRE-RECORD] Error stopping listener:", err);
                    // Continue even if there's an error
                  });
              }
            })
            .then(() => {
              // Small delay to ensure complete cleanup
              return new Promise(resolve => setTimeout(resolve, 5));
            })
            .then(() => {
              // Finally start the actual recording once cleanup is done
              if (!isRecording && !isProcessing && isMountedRef.current) {
                startRecording();
                setStatusMessage('Speech detected - recording started');
              }
            })
            .catch(error => {
              console.error("Error in speech detection sequence:", error);
              setStatusMessage('Ready');
            });
        }
      }
    });

    // Start the temporary recording
    await tempRecording.startAsync();

    // Set a 30-second timeout to avoid keeping microphone active indefinitely
    autoRecordTimeoutRef.current = setTimeout(() => {
      console.log("🎙️ [PRE-RECORD] Auto-listener timeout after 30 seconds of no speech");

      if (preRecordingRef.current && preRecordingActiveRef.current) {
        preRecordingRef.current.stopAndUnloadAsync().catch(err => {
          console.warn("🎙️ [PRE-RECORD] Error stopping listener on timeout:", err);
        });
        preRecordingRef.current = null;
        preRecordingActiveRef.current = false;
      }

      if (isMountedRef.current) {
        setStatusMessage('Ready');
        setIsListening(false);
      }

      autoRecordTimeoutRef.current = null;
    }, 30000); // 30 seconds timeout

  } catch (error) {
    console.error("🎙️ [PRE-RECORD] Error in pre-recording listener:", error);

    if (isMountedRef.current) {
      setStatusMessage('Ready');
      setIsListening(false);
    }

    // Clean up resources on error
    if (preRecordingRef.current && preRecordingActiveRef.current) {
      try {
        await preRecordingRef.current.stopAndUnloadAsync();
      } catch (cleanupError) {
        console.warn('Error during pre-recording cleanup:', cleanupError);
      }
    }

    preRecordingRef.current = null;
    preRecordingActiveRef.current = false;

    if (autoRecordTimeoutRef.current) {
      clearTimeout(autoRecordTimeoutRef.current);
      autoRecordTimeoutRef.current = null;
    }
  }
};

  // Text chat handler
const handleSubmit = async (inputMessage: string) => {
  if (!inputMessage.trim() || isLoading) return;

  // Add user message to history immediately
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

    // Update history, but preserve our modified structure
    if (response.history && response.history.length > 0) {
      // We need to map the server response to our new structure
      // where corrections are attached to the user's messages

      const newHistory: MessageType[] = [];

      for (let i = 0; i < response.history.length; i++) {
        const currentMsg = response.history[i];

        if (currentMsg.role === 'user') {
          // Find the next assistant message (if any)
          const nextMsg = i + 1 < response.history.length ? response.history[i + 1] : null;

          // Check if the next message has corrections meant for this user message
          if (nextMsg && nextMsg.role === 'assistant' && (nextMsg.corrected || nextMsg.natural)) {
            // Add user message with corrections from the assistant message
            newHistory.push({
              ...currentMsg,
              corrected: nextMsg.corrected,
              natural: nextMsg.natural
            });

            // Add assistant message without the corrections
            if (nextMsg) {
              newHistory.push({
                role: nextMsg.role,
                content: nextMsg.content,
                timestamp: nextMsg.timestamp
              });
            }

            // Skip the next message since we've already processed it
            i++;
          } else {
            // Regular user message without corrections
            newHistory.push(currentMsg);
          }
        } else if (currentMsg.role === 'assistant' || currentMsg.role === 'system') {
          // Regular assistant or system message
          newHistory.push(currentMsg);
        }
      }

      setHistory(newHistory);
    }

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

const playAudio = async (conversationId, messageIndex = -1) => {
  try {
    // Stop any pre-recording listener first
    if (preRecordingRef.current && preRecordingActiveRef.current) {
      try {
        await preRecordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.warn("Error stopping pre-recording before playback:", error);
      }
      preRecordingRef.current = null;
      preRecordingActiveRef.current = false;
    }

    // Update UI state
    setIsListening(false);

    // Unload previous sound
    if (soundRef.current) {
      console.log("🎵 [AUDIO] Unloading previous sound before creating new one");
      try {
        await soundRef.current.unloadAsync();
      } catch (unloadError) {
        console.warn("🎵 [AUDIO] Error unloading previous sound:", unloadError);
      }
      soundRef.current = null;
    }

    // Clear any existing auto record timeout
    if (autoRecordTimeoutRef.current) {
      clearTimeout(autoRecordTimeoutRef.current);
      autoRecordTimeoutRef.current = null;
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
    let isCompletionHandled = false;

    const onStatusUpdate = (status: Audio.PlaybackStatus) => {
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
      } else if ((status.didJustFinish || isLikelyFinished) && !isCompletionHandled) {
        // Set flag to ensure we only handle completion once
        isCompletionHandled = true;

        if (status.didJustFinish) {
          console.log(`🎵 [AUDIO] DETECTION: didJustFinish event triggered playback completion`);
        } else if (isLikelyFinished) {
          console.log(`🎵 [AUDIO] DETECTION: isLikelyFinished condition detected completion in status update handler`);
        }
        console.log(`🎵 [AUDIO] DETAILS: didJustFinish=${status.didJustFinish}, isPlaying=${!status.isPlaying}, positionMillis=${status.positionMillis}, durationMillis=${status.durationMillis || 'unknown'}`);

        setIsPlaying(false);
        setStatusMessage('Ready'); // Update status when playback completes

        // If auto record is enabled, start listening for speech
        if (autoRecordEnabled && voiceInputEnabled && isMountedRef.current) {
          console.log("🎙️ [AUTO RECORD] Activating smart auto-record listener");

          // Use setTimeout to ensure we don't start recording while still handling audio completion
          setTimeout(() => {
            if (isMountedRef.current && !isRecording && !isProcessing && !preRecordingActiveRef.current) {
              // Start a pre-recording listener mode
              startPreRecordingListener();
            }
          }, 500);
        }

        // Add null check before unloading
        if (soundRef.current) {
          try {
            // Use .then() instead of await since we're in a callback
            soundRef.current.unloadAsync()
              .then(() => {
                soundRef.current = null;
              })
              .catch(err => {
                console.error("🎵 [AUDIO] Unload failed:", err);
                soundRef.current = null;
              });
          } catch (err) {
            console.error("🎵 [AUDIO] Unload failure:", err);
            soundRef.current = null;
          }
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

      if (!soundRef.current || isCompletionHandled) {
        clearInterval(poll);
        return;
      }

      try {
        const status = await soundRef.current.getStatusAsync();

        const likelyFinished =
          status.isLoaded &&
          !status.isPlaying &&
          status.positionMillis > 0 &&
          (!status.durationMillis || status.positionMillis >= status.durationMillis - 100);

        if (likelyFinished && !isCompletionHandled) {
          // Set flag to ensure we only handle completion once
          isCompletionHandled = true;

          console.log("🎵 [AUDIO] DETECTION: Backup polling mechanism detected playback completion");
          console.log(`🎵 [AUDIO] DETAILS: isPlaying=${!status.isPlaying}, positionMillis=${status.positionMillis}, durationMillis=${status.durationMillis || 'unknown'}, elapsed=${elapsed}ms`);

          setIsPlaying(false);
          setStatusMessage('Ready'); // Update status when polling detects completion

          // Also handle auto record here as a backup
          if (autoRecordEnabled && voiceInputEnabled && !isRecording && !isProcessing
              && !isListening && isMountedRef.current && !preRecordingActiveRef.current) {
            console.log("🎙️ [AUTO RECORD] Starting smart auto-record from polling backup");

            // Use setTimeout to ensure we're not in the middle of any other operation
            setTimeout(() => {
              if (isMountedRef.current && !isRecording && !isProcessing && !preRecordingActiveRef.current) {
                startPreRecordingListener();
              }
            }, 500);
          }

          // Add null check and use Promise chaining for unloading
          if (soundRef.current) {
            soundRef.current.unloadAsync()
              .then(() => {
                soundRef.current = null;
              })
              .catch(unloadError => {
                console.warn("🎵 [AUDIO] Error unloading in polling interval:", unloadError);
                soundRef.current = null;
              });
          }

          clearInterval(poll);
        }

        if (elapsed >= maxPollTime) {
          console.warn("🎵 [AUDIO] DETECTION: Polling timed out after 120 seconds without detecting finish");
          setStatusMessage('Ready'); // Update status even if polling times out

          // Make sure to clean up audio even on timeout
          if (soundRef.current) {
            try {
              await soundRef.current.unloadAsync();
            } catch (timeoutError) {
              console.warn("🎵 [AUDIO] Error unloading on timeout:", timeoutError);
            }
            soundRef.current = null;
          }

          clearInterval(poll);
        }
      } catch (pollError) {
        console.error("🎵 [AUDIO] Error during polling:", pollError);
        // If we get an error during polling, it's safer to clean up
        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch (secondaryError) {
            console.warn("🎵 [AUDIO] Secondary error during cleanup:", secondaryError);
          }
          soundRef.current = null;
        }
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

    // Clean up if there's an error during playback setup
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (cleanupError) {
        console.warn("🎵 [AUDIO] Error during error cleanup:", cleanupError);
      }
      soundRef.current = null;
    }
  }
};

  const handleAudioData = async () => {
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

    // Update conversation, attaching corrections to the user message
    setHistory(prev => {
      const filtered = prev.filter(msg => !msg.isTemporary);

      if (response.transcribed_text) {
        return [
          ...filtered,
          // User message with corrections attached
          {
            role: 'user',
            content: response.transcribed_text,
            corrected: response.corrected,
            natural: response.natural,
            timestamp: new Date().toISOString()
          },
          // AI response (without corrections)
          {
            role: 'assistant',
            content: response.reply,
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
  const handleVoiceButtonClick = async () => {
    // Clean up any active pre-recording or timeouts
    cleanup();

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

  return history.map((msg, index) => (
    <Message
      key={index}
      message={msg}
      // No need to pass originalUserMessage anymore since corrections
      // are attached directly to user messages
    />
  ));
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
        autoRecordEnabled={autoRecordEnabled}
        setAutoRecordEnabled={setAutoRecordEnabled}
        debugMode={debugMode}
        setDebugMode={setDebugMode}
        navigation={navigation}
      />

      {/* Voice Input Toggle Bar */}
      <View style={styles.voiceToggleBar}>
        <TouchableOpacity
          style={[
            styles.voiceToggleButton,
            voiceInputEnabled && styles.voiceToggleButtonActive
          ]}
          onPress={toggleVoiceInput}
        >
          <Text style={styles.voiceToggleIcon}>🎙️</Text>
          <Text style={[
            styles.voiceToggleText,
            voiceInputEnabled && styles.voiceToggleTextActive
          ]}>
            {voiceInputEnabled ? 'Voice Mode: ON' : 'Voice Mode: OFF'}
          </Text>
        </TouchableOpacity>

        {voiceInputEnabled && (
          <View style={styles.voiceOptionsContainer}>
            <TouchableOpacity
              style={[
                styles.voiceOptionButton,
                autoSendEnabled && styles.voiceOptionButtonActive
              ]}
              onPress={() => setAutoSendEnabled(!autoSendEnabled)}
            >
              <Text style={[
                styles.voiceOptionText,
                autoSendEnabled && styles.voiceOptionTextActive
              ]}>
                Auto-send
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voiceOptionButton,
                autoRecordEnabled && styles.voiceOptionButtonActive
              ]}
              onPress={() => setAutoRecordEnabled(!autoRecordEnabled)}
            >
              <Text style={[
                styles.voiceOptionText,
                autoRecordEnabled && styles.voiceOptionTextActive
              ]}>
                Auto-record
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
              <StatusPill
                active={isListening}
                icon="👂"
                label="Listening"
              />
              <StatusPill
                active={autoRecordEnabled}
                icon="🔄"
                label="Auto Record"
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
                isProcessing && styles.processingButton,
                isListening && styles.listeningButton
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
              ) : isListening ? (
                <>
                  <Text style={styles.listeningIcon}>👂</Text>
                  <Text style={styles.buttonText}>Listening for speech...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.micIcon}>🎙️</Text>
                  <Text style={styles.buttonText}>
                    {autoRecordEnabled
                      ? 'Start Recording (auto after AI)'
                      : 'Start Recording'}
                  </Text>
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

            {!isRecording && !isProcessing && isListening && (
              <View style={styles.listeningStatus}>
                <Text style={styles.statusIcon}>👂</Text>
                <Text style={styles.statusText}>Listening for speech...</Text>
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
  // Voice toggle bar - NEW
  voiceToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  voiceToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  voiceToggleButtonActive: {
    backgroundColor: '#5d6af8',
  },
  voiceToggleIcon: {
    marginRight: 6,
    fontSize: 16,
  },
  voiceToggleText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#495057',
  },
  voiceToggleTextActive: {
    color: 'white',
  },
  voiceOptionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceOptionButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  voiceOptionButtonActive: {
    backgroundColor: '#5d6af8',
  },
  voiceOptionText: {
    fontSize: 12,
    color: '#495057',
  },
  voiceOptionTextActive: {
    color: 'white',
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
  listeningButton: {
    backgroundColor: colors.info,
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
  listeningIcon: {
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
  listeningStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
    minWidth: 280,
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