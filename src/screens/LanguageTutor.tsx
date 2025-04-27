import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Message as MessageType } from '../types/messages';
import { AUDIO_SETTINGS, PLAYER_SETTINGS, API_CONFIG, loadAudioSettings, saveAudioSettings } from '../constants/settings';
import MuteInfoModal from '../components/MuteInfoModal';
import ReplayButton from '../components/ReplayButton';

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

import colors from '../styles/colors';

// Interface for language info
interface LanguageInfo {
  name: string;
  flag: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageTutor'>;

const LanguageTutor: React.FC<Props> = ({ route, navigation }) => {
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
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [canReplayLastMessage, setCanReplayLastMessage] = useState<boolean>(false);
const [lastAudioConversationId, setLastAudioConversationId] = useState<string | null>(null);
const [lastAudioMessageIndex, setLastAudioMessageIndex] = useState<number | null>(null);


  // New state for customizable audio parameters
  const [speechThreshold, setSpeechThreshold] = useState<number>(AUDIO_SETTINGS.SPEECH_THRESHOLD);
  const [silenceThreshold, setSilenceThreshold] = useState<number>(AUDIO_SETTINGS.SILENCE_THRESHOLD);
  const [silenceDuration, setSilenceDuration] = useState<number>(AUDIO_SETTINGS.SILENCE_DURATION);

  //state vars for muting
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showMuteInfoModal, setShowMuteInfoModal] = useState<boolean>(false);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackCallbackRef = useRef<((status: Audio.PlaybackStatus) => void) | null>(null);
  const autoRecordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Helper functions to get the current language parameters
  const getTargetLanguage = () => route.params.targetLanguage || 'es';
  const getNativeLanguage = () => route.params.nativeLanguage || 'en';
  const getDifficulty = () => route.params.difficulty || 'beginner';
  const getLearningObjective = () => route.params.learningObjective || '';
  const hasProcessedCurrentRecordingRef = useRef<boolean>(false);

  // Get language display info
  const getLanguageInfo = (code: string): LanguageInfo => {
  const languages: Record<string, LanguageInfo> = {
    'en': { name: 'English', flag: '🇬🇧' },
    'es': { name: 'Spanish', flag: '🇪🇸' },
    'fr': { name: 'French', flag: '🇫🇷' },
    'zh': { name: 'Chinese Mandarin', flag: '🇨🇳' },
    'de': { name: 'German', flag: '🇩🇪' },
    'pt': { name: 'Portuguese', flag: '🇵🇹' },
    'ar': { name: 'Arabic', flag: '🇸🇦' },
    'ja': { name: 'Japanese', flag: '🇯🇵' },
    'ko': { name: 'Korean', flag: '🇰🇷' },
    'it': { name: 'Italian', flag: '🇮🇹' },
    'ru': { name: 'Russian', flag: '🇷🇺' },
    'hi': { name: 'Hindi', flag: '🇮🇳' },
    'pl': { name: 'Polish', flag: '🇵🇱' },
    'nl': { name: 'Dutch', flag: '🇳🇱' },
    'hu': { name: 'Hungarian', flag: '🇭🇺' },
    'fi': { name: 'Finnish', flag: '🇫🇮' },
    'el': { name: 'Greek', flag: '🇬🇷' },
    'tr': { name: 'Turkish', flag: '🇹🇷' }
  };
  return languages[code] || { name: 'Unknown', flag: '🏳️' };
};

  // Get current language info
  const getTargetInfo = () => {
    return getLanguageInfo(getTargetLanguage());
  };

  // Load saved audio settings
  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await loadAudioSettings();
      if (savedSettings) {
        setSpeechThreshold(savedSettings.speechThreshold);
        setSilenceThreshold(savedSettings.silenceThreshold);
        setSilenceDuration(savedSettings.silenceDuration);
      }
    };
    loadSettings();
  }, []);

  // Save audio settings when they change
  useEffect(() => {
    // Only save if all values are valid
    if (speechThreshold >= silenceThreshold &&
        silenceThreshold >= 0 &&
        silenceDuration >= 500) {
      saveAudioSettings({
        speechThreshold,
        silenceThreshold,
        silenceDuration
      });
    }
  }, [speechThreshold, silenceThreshold, silenceDuration]);

  // Use our custom voice recorder hook with settings from state values
  const voiceRecorder = useVoiceRecorder({
    silenceThreshold: silenceThreshold,
    speechThreshold: speechThreshold,
    silenceDuration: silenceDuration,
    minRecordingTime: AUDIO_SETTINGS.MIN_RECORDING_TIME,
    checkInterval: AUDIO_SETTINGS.CHECK_INTERVAL,
    preBufferDuration: 1000, // 1 second pre-buffer
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
    isPreBuffering,
    startRecording,
    stopRecording,
    getAudioURI,
    resetRecording,
    setIsProcessing,
    setStatusMessage,
    startPreBuffering
  } = voiceRecorder;

  // Reset everything when component mounts or route params change
  useEffect(() => {
  // Store current audio parameter values so we can restore them
  const currentSpeechThreshold = speechThreshold;
  const currentSilenceThreshold = silenceThreshold;
  const currentSilenceDuration = silenceDuration;

  // Reset conversation and UI state
  setHistory([]);
  setConversationId(null);
  setIsLoading(false);
  setTempo(0.75); // Reset to default tempo
  setIsPlaying(false);
  setVoiceInputEnabled(false);
  setAutoSendEnabled(false);
  setAutoRecordEnabled(false);
  setIsListening(false);
  setKeyboardVisible(false);

  // Reset recorder state
  resetRecording();

  // Clean up any audio resources
  cleanup();

  // Restore audio parameters to their current values
  // This ensures they persist between conversations
  setSpeechThreshold(currentSpeechThreshold);
  setSilenceThreshold(currentSilenceThreshold);
  setSilenceDuration(currentSilenceDuration);

  console.log("🔄 Conversation state reset with preserved audio parameters:", {
    preservedAudioParams: {
      speechThreshold: currentSpeechThreshold,
      silenceThreshold: currentSilenceThreshold,
      silenceDuration: currentSilenceDuration
    }
  });
}, [route.params]); // This effect depends on route.params

  // Add keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        // Immediately set keyboard visible state to trigger UI update
        setKeyboardVisible(true);

        // For iOS, we can access the keyboard height and animation duration
        if (Platform.OS === 'ios') {
          // Use a small delay to ensure the keyboard is visible and screen layout has updated
          setTimeout(() => {
            if (scrollViewRef.current) {
              // Force the scroll view to calculate its new content size first
              scrollViewRef.current.flashScrollIndicators();
              // Then scroll to the bottom
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 50);
        } else {
          // For Android, use a slightly longer delay
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 150);
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);

        // Also scroll to bottom when keyboard hides
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 50);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // 3. Add toggle mute function
  const toggleMute = (muted: boolean) => {
    // Update mute state
    setIsMuted(muted);

    // Show info modal when muting for the first time
    if (muted && !showMuteInfoModal) {
      setShowMuteInfoModal(true);
    }

    // If there's currently audio playing, stop it
    if (muted && isPlaying && soundRef.current) {
      try {
        soundRef.current.stopAsync().catch(error => {
          console.warn('Error stopping audio when muting:', error);
        });
        setIsPlaying(false);
        setStatusMessage('Audio muted');
      } catch (error) {
        console.warn('Error in mute toggle:', error);
      }
    }
  };
  // Toggle voice input
  const toggleVoiceInput = () => {
    if (isRecording || isPreBuffering) {
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

  // Start pulse animation when recording or pre-buffering
  useEffect(() => {
    if (isRecording || isPreBuffering) {
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
  }, [isRecording, isPreBuffering, pulseAnim]);

  // Handle media recorder stop event - improved to handle pre-buffering
  useEffect(() => {
      if (!isRecording && !isPreBuffering && hasSpeech && !isProcessing) {
        // Only proceed if we haven't processed this recording yet
        if (!hasProcessedCurrentRecordingRef.current) {
          console.log("🟢 handleAudioData() TRIGGERED (first time)");
          hasProcessedCurrentRecordingRef.current = true;
          handleAudioData();
        } else {
          console.log("🔵 Skipping duplicate handleAudioData() call");
        }
      } else if (isRecording || isPreBuffering) {
        // Reset the flag when a new recording starts
        hasProcessedCurrentRecordingRef.current = false;
      }
    }, [isRecording, isPreBuffering, hasSpeech, isProcessing]);

  // AUTO-SEND IMPLEMENTATION
  useEffect(() => {
    if (autoSendEnabled && (isRecording || isPreBuffering) && hasSpeech && silenceDetected) {
      // If silence countdown has reached 0 or is less than 0, stop recording
      // This will trigger the audio processing flow
      if (silenceCountdown !== null && silenceCountdown <= 0) {
        console.log("📢 Auto-send triggered - stopping recording");
        stopRecording();
      }
    }
  }, [autoSendEnabled, isRecording, isPreBuffering, hasSpeech, silenceDetected, silenceCountdown, stopRecording]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (history.length > 0) {
      // First attempt to scroll immediately
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: false });
      }

      // Then use a delay to ensure messages have rendered
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

      // For keyboard case, add extra delay to handle both rendering and keyboard animation
      if (keyboardVisible) {
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 300);
      }
    }
  }, [history, keyboardVisible]);

  // Enhanced scrollToBottom function that's more reliable
  const scrollToBottom = (immediate = false) => {
    if (scrollViewRef.current) {
      // First try immediate scroll
      scrollViewRef.current.scrollToEnd({ animated: false });

      if (!immediate) {
        // Then try animated scroll after a short delay
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    }
  };

  // Welcome message when the component mounts
  useEffect(() => {
    if (history.length === 0) {
      // Start a new conversation with the given parameters
      initializeConversation();
    }
  }, [route.params]); // Add route.params dependency to re-initialize if params change

  // Cleanup function for all recording-related resources
  const cleanup = () => {
    console.log('Running audio resource cleanup...');
    hasProcessedCurrentRecordingRef.current = false;
    // Clear any timeout
    if (autoRecordTimeoutRef.current) {
      clearTimeout(autoRecordTimeoutRef.current);
      autoRecordTimeoutRef.current = null;
    }

    // Clean up sound object if it exists
    if (soundRef.current) {
      try {
        // First remove any status update callbacks
        if (playbackCallbackRef.current) {
          try {
            soundRef.current.setOnPlaybackStatusUpdate(null);
            playbackCallbackRef.current = null;
          } catch (error) {
            console.warn('Error removing status update callback:', error);
          }
        }

        // Then check if sound is loaded before unloading
        soundRef.current.getStatusAsync()
          .then(status => {
            if (status.isLoaded) {
              return soundRef.current.unloadAsync();
            }
          })
          .catch(error => {
            console.warn('Error during sound cleanup:', error);
          })
          .finally(() => {
            soundRef.current = null;
          });
      } catch (error) {
        console.error('Error during sound cleanup:', error);
        soundRef.current = null;
      }
    }

    // Reset listening state
    setIsListening(false);
  };

  //Replay
  const handleReplayLastMessage = async () => {
    if (!lastAudioConversationId || lastAudioMessageIndex === null || isMuted || isPlaying) {
      return;
    }

    try {
      setStatusMessage('Replaying last message...');

      // Use the existing playAudio function with the saved conversation ID and message index
      await playAudio(lastAudioConversationId, lastAudioMessageIndex);
    } catch (error) {
      console.error('Error replaying audio:', error);
      setStatusMessage('Failed to replay message');
    }
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
      console.log("🧹 Component unmounting - cleaning up all audio resources");
      isMountedRef.current = false;

      if (soundRef.current) {
        // First remove any status update callbacks to prevent further updates
        if (playbackCallbackRef.current) {
          try {
            soundRef.current.setOnPlaybackStatusUpdate(null);
            playbackCallbackRef.current = null;
          } catch (error) {
            console.error('Error removing status update callback:', error);
          }
        }

        // Then unload the sound
        soundRef.current.unloadAsync().catch(error => {
          console.error('Error cleaning up audio:', error);
        });
        soundRef.current = null;
      }

      cleanup();
    };
  }, []);

  // Add this new function to initialize conversations
  const initializeConversation = async () => {
    try {
      setIsLoading(true);

      // Call the new API endpoint to create a conversation
      const response = await api.createConversation({
        difficulty: getDifficulty(),
        nativeLanguage: getNativeLanguage(),
        targetLanguage: getTargetLanguage(),
        learningObjective: getLearningObjective(),
        tempo: tempo,
        isMuted: isMuted // Add the muted parameter

      });

      // Update state with the response data
      if (response) {
        // Set conversation ID
        setConversationId(response.conversation_id);

        // Set initial message
        setHistory(response.history || []);

        // Play audio for the welcome message
        if (response.has_audio) {
          setStatusMessage('Streaming welcome audio...');
          await playAudio(response.conversation_id, 0); // Play the first message (welcome)
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);

      // Fallback if the API call fails
      const currentTargetLanguage = getTargetLanguage();
      const currentLearningObjective = getLearningObjective();

      // Create a fallback welcome message
      let welcomeMessage = {
        role: 'assistant',
        content: getWelcomeMessage(currentTargetLanguage, currentLearningObjective),
        timestamp: new Date().toISOString(),
        translation: ''
      };

      setHistory([welcomeMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get welcome message based on language
  const getWelcomeMessage = (language: string, learningObjective?: string): string => {
    const welcomeMessages: Record<string, { basic: string, withObjective: string }> = {
      'es': {
        basic: '¡Hola! Soy tu tutor de español. ¿Cómo estás hoy?',
        withObjective: `¡Hola! Veo que quieres practicar: "${learningObjective}". ¡Empecemos!`
      },
      'fr': {
        basic: 'Bonjour! Je suis votre tuteur de français. Comment allez-vous aujourd\'hui?',
        withObjective: `Bonjour! Je vois que vous voulez pratiquer: "${learningObjective}". Commençons!`
      },
      'it': {
        basic: 'Ciao! Sono il tuo tutor di italiano. Come stai oggi?',
        withObjective: `Ciao! Vedo che vuoi praticare: "${learningObjective}". Iniziamo!`
      },
      'en': {
        basic: 'Hello! I\'m your English tutor. How can I help you today?',
        withObjective: `Hello! I see you want to practice: "${learningObjective}". Let's begin!`
      }
    };

    // Get messages for the current language, fallback to English if not found
    const messages = welcomeMessages[language] || welcomeMessages['en'];

    // Return message with or without learning objective
    return learningObjective ? messages.withObjective : messages.basic;
  };

  // Start smart pre-buffering for auto-record
  // Improved implementation for smart pre-buffering
  const startSmartPreBuffering = async () => {
    // Don't start if we're already recording or processing
    if (isRecording || isPreBuffering || isProcessing) {
      console.log("🎙️ [PRE-BUFFER] Already in recording/processing state, ignoring request");
      return;
    }

    try {
      console.log("🎙️ [PRE-BUFFER] Starting smart pre-buffering");

      // Update UI state immediately
      setIsListening(true);
      setStatusMessage('Listening for speech...');

      // Clear any existing timeout
      if (autoRecordTimeoutRef.current) {
        clearTimeout(autoRecordTimeoutRef.current);
        autoRecordTimeoutRef.current = null;
      }

      // Start pre-buffering mode with a short delay to ensure audio mode is properly set
      setTimeout(async () => {
        if (isMountedRef.current && !isRecording && !isProcessing && !isPreBuffering) {
          try {
            // Configure audio mode for recording just to be safe
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              interruptionModeIOS: 1, // DoNotMix
              interruptionModeAndroid: 1, // DoNotMix
              shouldDuckAndroid: false,
              playThroughEarpieceAndroid: false,
              staysActiveInBackground: false,
            });

            // Start pre-buffering with explicit await
            console.log("🎙️ [PRE-BUFFER] Calling startPreBuffering()");
            await startPreBuffering();
            console.log("🎙️ [PRE-BUFFER] Pre-buffering started successfully");
          } catch (innerError) {
            console.error("🎙️ [PRE-BUFFER] Error in delayed start:", innerError);
            setStatusMessage('Ready');
            setIsListening(false);
          }
        } else {
          console.log("🎙️ [PRE-BUFFER] Conditions changed, not starting pre-buffer");
          setStatusMessage('Ready');
          setIsListening(false);
        }
      }, 300);

      // Set a 30-second timeout to avoid keeping microphone active indefinitely
      autoRecordTimeoutRef.current = setTimeout(() => {
        console.log("🎙️ [PRE-BUFFER] Pre-buffering timeout after 30 seconds of no speech");

        if (isMountedRef.current) {
          // Stop any active recording
          if (isPreBuffering || isRecording) {
            stopRecording().catch(error => {
              console.warn("Error stopping recording on timeout:", error);
            });
          }

          setStatusMessage('Ready');
          setIsListening(false);
        }

        autoRecordTimeoutRef.current = null;
      }, 30000); // 30 seconds timeout

    } catch (error) {
      console.error("🎙️ [PRE-BUFFER] Error starting pre-buffering:", error);

      if (isMountedRef.current) {
        setStatusMessage('Ready');
        setIsListening(false);
      }

      // Clean up resources on error
      if (autoRecordTimeoutRef.current) {
        clearTimeout(autoRecordTimeoutRef.current);
        autoRecordTimeoutRef.current = null;
      }
    }
  };

  // Text chat handler
  // Update to handleSubmit function in LanguageTutor.tsx
const handleSubmit = async (inputMessage: string) => {
  hasProcessedCurrentRecordingRef.current = false;
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
      getDifficulty(),
      getNativeLanguage(),
      getTargetLanguage(),
      getLearningObjective(),
      isMuted
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

            // Add assistant message without the corrections but WITH translation
            if (nextMsg) {
              newHistory.push({
                role: nextMsg.role,
                content: nextMsg.content,
                translation: nextMsg.translation, // Include translation
                timestamp: nextMsg.timestamp,
                hasAudio: response.has_audio // Set hasAudio based on API response
              });
            }

            // Skip the next message since we've already processed it
            i++;
          } else {
            // Regular user message without corrections
            newHistory.push(currentMsg);
          }
        } else if (currentMsg.role === 'assistant' || currentMsg.role === 'system') {
          // Regular assistant or system message (include translation for assistant)
          if (currentMsg.role === 'assistant') {
            newHistory.push({
              ...currentMsg,
              translation: currentMsg.translation, // Include translation if present
              hasAudio: response.has_audio // Set hasAudio based on API response
            });
          } else {
            newHistory.push(currentMsg);
          }
        }
      }

      setHistory(newHistory);
    }

    if (response.has_audio) {
      setStatusMessage('Streaming audio...');
      // MODIFIED: Always use -1 to get the latest message's audio
      await playAudio(response.conversation_id, -1);
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

// Update to handleAudioData function in LanguageTutor.tsx
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
      difficulty: getDifficulty(),
      nativeLanguage: getNativeLanguage(),
      targetLanguage: getTargetLanguage(),
      learningObjective: getLearningObjective(),
      isMuted: isMuted
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
          // AI response (without corrections but WITH translation)
          {
            role: 'assistant',
            content: response.reply,
            translation: response.translation, // Include translation
            timestamp: new Date().toISOString(),
            hasAudio: response.has_audio // Set hasAudio based on API response
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
      // MODIFIED: Always use -1 to get the latest message's audio
      await playAudio(response.conversation_id, -1);
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

  // Updated implementation for reliable auto-recording after audio playback
  const playAudio = async (conversationId, messageIndex = -1) => {
    // Save these values for replay functionality
    setLastAudioConversationId(conversationId);
    setLastAudioMessageIndex(messageIndex);
    setCanReplayLastMessage(true);
    // Skip playing audio if muted
    if (isMuted) {
      console.log("🔇 Audio muted, skipping playback");
      setStatusMessage('Audio muted');
      return;
    }
    try {
      // Make sure we're not already pre-buffering or recording
      if (isPreBuffering || isRecording) {
        try {
          await stopRecording();
        } catch (error) {
          console.warn("Error stopping recording before playback:", error);
        }
      }

      // Update UI state
      setIsListening(false);

      // Unload previous sound
      if (soundRef.current) {
        console.log("🎵 [AUDIO] Unloading previous sound before creating new one");
        try {
          // First remove the status update callback
          soundRef.current.setOnPlaybackStatusUpdate(null);
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
      const audioUrl = api.getAudioStreamUrl(
        conversationId,
        messageIndex,
        tempo,
        getTargetLanguage(), // Use current target language
        isMuted // Pass the muted state to the API
      );
      console.log("🎵 [AUDIO] Audio streaming URL:", audioUrl);

      let statusUpdateCount = 0;
      let lastPositionMillis = 0;
      let positionStuckCount = 0;
      let isCompletionHandled = false;
      let pollIntervalId = null;

      const onStatusUpdate = (status: Audio.PlaybackStatus) => {
        // First check if component is still mounted
        if (!isMountedRef.current) {
          console.log("🎵 [AUDIO] Component unmounted, ignoring status update");
          return;
        }

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

          console.log(`🎵 [AUDIO] DETECTION: Playback completion detected - didJustFinish=${status.didJustFinish}, isPlaying=${status.isPlaying}`);
          console.log(`🎵 [AUDIO] DETAILS: position=${status.positionMillis}ms, duration=${status.durationMillis || 'unknown'}ms`);

          setIsPlaying(false);
          setStatusMessage('Ready'); // Update status when playback completes

          // Clean up polling if it exists
          if (pollIntervalId) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
          }

          // IMPORTANT: If auto record is enabled, trigger the pre-buffering with a delay
          if (autoRecordEnabled && voiceInputEnabled) {
            console.log("🎙️ [AUTO RECORD] Will start pre-buffering in 500ms");

            // Use setTimeout to ensure we don't start recording while still handling audio completion
            setTimeout(() => {
              if (isMountedRef.current && !isRecording && !isProcessing && !isPreBuffering) {
                console.log("🎙️ [AUTO RECORD] Starting pre-buffering NOW");
                // Start pre-buffering mode
                startSmartPreBuffering();
              } else {
                console.log("🎙️ [AUTO RECORD] Cannot start pre-buffering - states:", {
                  mounted: isMountedRef.current,
                  recording: isRecording,
                  processing: isProcessing,
                  preBuffering: isPreBuffering
                });
              }
            }, 500);
          } else {
            console.log("🎙️ [AUTO RECORD] Not starting pre-buffering - autoRecord:", autoRecordEnabled, "voiceInput:", voiceInputEnabled);
          }

          // Cleanup sound
          if (soundRef.current) {
            try {
              // First remove the status update callback
              soundRef.current.setOnPlaybackStatusUpdate(null);

              // Unload the sound
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

      // Save the callback reference for later cleanup
      playbackCallbackRef.current = onStatusUpdate;

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

      pollIntervalId = setInterval(async () => {
        // First check if component is still mounted
        if (!isMountedRef.current) {
          console.log("🎵 [AUDIO] Component unmounted, cleaning up polling interval");
          clearInterval(pollIntervalId);
          return;
        }

        elapsed += pollingInterval;

        if (!soundRef.current || isCompletionHandled) {
          clearInterval(pollIntervalId);
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
                && !isListening && !isPreBuffering && isMountedRef.current) {
              console.log("🎙️ [AUTO RECORD] Starting smart pre-buffering from polling backup");

              // Use setTimeout to ensure we're not in the middle of any other operation
              setTimeout(() => {
                if (isMountedRef.current && !isRecording && !isProcessing && !isPreBuffering) {
                  startSmartPreBuffering();
                }
              }, 500);
            }

            // Add null check and use Promise chaining for unloading
            if (soundRef.current) {
              // First remove the status update callback
              soundRef.current.setOnPlaybackStatusUpdate(null);
              soundRef.current.unloadAsync()
                .then(() => {
                  soundRef.current = null;
                })
                .catch(unloadError => {
                  console.warn("🎵 [AUDIO] Error unloading in polling interval:", unloadError);
                  soundRef.current = null;
                });
            }

            clearInterval(pollIntervalId);
          }

          if (elapsed >= maxPollTime) {
            console.warn("🎵 [AUDIO] DETECTION: Polling timed out after 120 seconds without detecting finish");
            setStatusMessage('Ready'); // Update status even if polling times out

            // Make sure to clean up audio even on timeout
            if (soundRef.current) {
              try {
                // First remove the status update callback
                soundRef.current.setOnPlaybackStatusUpdate(null);
                await soundRef.current.unloadAsync();
              } catch (timeoutError) {
                console.warn("🎵 [AUDIO] Error unloading on timeout:", timeoutError);
              }
              soundRef.current = null;
            }

            clearInterval(pollIntervalId);
          }
        } catch (pollError) {
          console.error("🎵 [AUDIO] Error during polling:", pollError);
          // If we get an error during polling, it's safer to clean up
          if (soundRef.current) {
            try {
              // First remove the status update callback
              soundRef.current.setOnPlaybackStatusUpdate(null);
              await soundRef.current.unloadAsync();
            } catch (secondaryError) {
              console.warn("🎵 [AUDIO] Secondary error during cleanup:", secondaryError);
            }
            soundRef.current = null;
          }
          clearInterval(pollIntervalId);
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
          // First remove the status update callback
          soundRef.current.setOnPlaybackStatusUpdate(null);
          await soundRef.current.unloadAsync();
        } catch (cleanupError) {
          console.warn("🎵 [AUDIO] Error during error cleanup:", cleanupError);
        }
        soundRef.current = null;
      }
    }
  };



  // UI Handlers
  const handleVoiceButtonClick = async () => {
    // Don't do anything if audio is playing
    if (isPlaying) {
      setStatusMessage('Please wait for audio to finish playing');
      return;
    }
    // Clean up any active recording/pre-buffering
    cleanup();

    if (isRecording || isPreBuffering) {
      stopRecording();
    } else {
      // Stop any playing audio before starting
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

          // Start pre-buffering instead of direct recording
          startPreBuffering();
        } catch (error) {
          console.warn('Non-critical error stopping audio:', error);
          setIsPlaying(false);
          startPreBuffering();
        }
      } else {
        // Start pre-buffering for better speech capture
        startPreBuffering();
      }
    }
  };

  // Render conversation messages
  // Render conversation messages
const renderMessages = () => {
  if (history.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.welcomeIcon}>👋</Text>
        <Text style={styles.welcomeTitle}>
          {getWelcomeTitle(getTargetLanguage())}
        </Text>
        <Text style={styles.welcomeText}>
          {getWelcomeSubtitle(getTargetLanguage())}
        </Text>
      </View>
    );
  }

  return history.map((msg, index) => {
    // Determine if this is the latest assistant message that can be replayed
    const isLatestAssistantMessage =
      msg.role === 'assistant' &&
      index === history.findLastIndex(m => m.role === 'assistant');

    // Only show replay button if:
    // 1. This is the latest assistant message
    // 2. The message has audio available (was generated when not muted)
    // 3. Audio is not currently muted
    // 4. We have a valid conversation ID and message index for replay
    const canReplayThisMessage =
      isLatestAssistantMessage &&
      msg.hasAudio === true &&  // Must explicitly check for true
      !isMuted &&
      canReplayLastMessage;

    return (
      <Message
        key={index}
        message={{
          ...msg,
          // hasAudio is already part of the message object now
        }}
        isLatestAssistantMessage={isLatestAssistantMessage}
        onRequestReplay={canReplayThisMessage ? handleReplayLastMessage : undefined}
        isPlaying={isPlaying}
        isMuted={isMuted}
      />
    );
  });
};

  // Helper functions for welcome messages in different languages
  const getWelcomeTitle = (lang: string): string => {
    switch(lang) {
      case 'es': return '¡Hola! Soy tu tutor de español.';
      case 'fr': return 'Bonjour! Je suis votre tuteur de français.';
      case 'it': return 'Ciao! Sono il tuo tutor di italiano.';
      default: return 'Hello! I am your English tutor.';  // en
    }
  }

  const getWelcomeSubtitle = (lang: string): string => {
    switch(lang) {
      case 'es': return 'Start practicing your Spanish conversation skills!';
      case 'fr': return 'Start practicing your French conversation skills!';
      case 'it': return 'Start practicing your Italian conversation skills!';
      default: return 'Start practicing your English conversation skills!';  // en
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TutorHeader
      targetLanguage={getTargetLanguage()}
      targetInfo={getTargetInfo()}
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
      // Audio parameters
      speechThreshold={speechThreshold}
      setSpeechThreshold={setSpeechThreshold}
      silenceThreshold={silenceThreshold}
      setSilenceThreshold={setSilenceThreshold}
      silenceDuration={silenceDuration}
      setSilenceDuration={setSilenceDuration}
      // Mute functionality
      isMuted={isMuted}
      setIsMuted={toggleMute}
      navigation={navigation}
    />
      <MuteInfoModal
        visible={showMuteInfoModal}
        onClose={() => setShowMuteInfoModal(false)}
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
                active={isPreBuffering}
                icon="⏱️"
                label="Pre-buffer"
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
              speechThreshold={speechThreshold}
              silenceThreshold={silenceThreshold}
            />
          </View>
        </View>
      )}

      {/* Use KeyboardAvoidingView to handle keyboard appearance */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.conversationContainer}
          contentContainerStyle={styles.conversationContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={() => scrollToBottom(false)}
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

      )}
        <View style={styles.inputContainer}>
          {voiceInputEnabled ? (
            <View style={styles.voiceInputControls}>
              <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    (isRecording || isPreBuffering) && styles.recordingButton,
                    isProcessing && styles.processingButton,
                    isListening && styles.listeningButton,
                    isPlaying && styles.disabledVoiceButton // Add this new style
                  ]}
                  onPress={handleVoiceButtonClick}
                  disabled={isProcessing || isPlaying} // Add isPlaying to disabled condition
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
                  ) : isPreBuffering ? (
                    <>
                      <Animated.View
                        style={[
                          styles.pulse,
                          { transform: [{ scale: pulseAnim }] }
                        ]}
                      />
                      <Text style={styles.micIcon}>⏱️</Text>
                      <Text style={styles.buttonText}>Pre-buffering...</Text>
                    </>
                  ) : isProcessing ? (
                    <>
                      <Text style={styles.processingIcon}>⏳</Text>
                      <Text style={styles.buttonText}>Processing...</Text>
                    </>
                  ) : isPlaying ? (
                    <>
                      <Text style={styles.playingIcon}>🔊</Text>
                      <Text style={styles.buttonText}>Audio playing...</Text>
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

              {(isRecording || isPreBuffering) && (
                <View style={[
                  styles.recordingStatus,
                  silenceDetected ? styles.silenceStatus :
                  hasSpeech ? styles.speechStatus :
                  isPreBuffering ? styles.preBufferingStatus : styles.waitingStatus
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
                  ) : isPreBuffering ? (
                    <>
                      <Text style={styles.statusIcon}>⏱️</Text>
                      <Text style={styles.statusText}>Pre-buffering... start speaking anytime</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.statusIcon}>👂</Text>
                      <Text style={styles.statusText}>Waiting for speech...</Text>
                    </>
                  )}
                </View>
              )}

              {!isRecording && !isProcessing && !isPreBuffering && isListening && (
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
              isPlaying={isPlaying} // Pass the isPlaying state
              targetLanguage={getTargetLanguage()}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingContainer: {
    flex: 1,
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
  disabledVoiceButton: {
    backgroundColor: colors.gray400,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  playingIcon: {
    fontSize: 20,
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
  preBufferingStatus: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.3)',
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

export default LanguageTutor;