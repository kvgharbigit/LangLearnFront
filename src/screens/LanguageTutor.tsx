import React, { useState, useEffect, useRef } from 'react';
import { getWelcomeTitle, getWelcomeSubtitle, getWelcomeMessage, checkRepetitionRequest } from '../utils/languageUtils';
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
  Alert,
  BackHandler,
} from 'react-native';
import { hasAvailableQuota } from '../services/usageService';
import QuotaExceededModal from '../components/QuotaExceededModal';
import { Audio } from 'expo-av';
import SafeView from '../components/SafeView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Message as MessageType } from '../types/messages';
import { AUDIO_SETTINGS, PLAYER_SETTINGS, API_CONFIG } from '../constants/settings';
import { getAudioSettings, saveAudioSettings, saveSingleAudioSetting, PREFERENCE_KEYS } from '../utils/userPreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MuteInfoModal from '../components/MuteInfoModal';
import ReplayButton from '../components/ReplayButton';
import { useNetwork } from '../contexts/NetworkContext';
import NetworkStatusBar from '../components/NetworkStatusBar';
import OfflineWarning from '../components/OfflineWarning';
import { getOfflineMessageQueue, removeFromOfflineQueue } from '../utils/api';

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
  const [showStartButton, setShowStartButton] = useState<boolean>(true);
  const [welcomeReady, setWelcomeReady] = useState<boolean>(false);
  const [welcomeData, setWelcomeData] = useState<any>(null);
  
  // Initialize global references for audio settings if not already set
  if (!(global as any).__SAVED_AUDIO_SETTINGS) {
    (global as any).__SAVED_AUDIO_SETTINGS = {
      tempo: PLAYER_SETTINGS.DEFAULT_TEMPO,
      speechThreshold: AUDIO_SETTINGS.SPEECH_THRESHOLD,
      silenceThreshold: AUDIO_SETTINGS.SILENCE_THRESHOLD,
      silenceDuration: AUDIO_SETTINGS.SILENCE_DURATION,
      isMuted: false
    };
    console.log('🔑 Initialized global audio settings reference');
  }
  
  // Initialize tempo using a lazy initial state
  const [tempo, setTempo] = useState<number>((global as any).__SAVED_AUDIO_SETTINGS.tempo || PLAYER_SETTINGS.DEFAULT_TEMPO);

  // Load all audio settings from AsyncStorage as a backup to ensure we have the correct values
  useEffect(() => {
    const loadSavedAudioSettings = async () => {
      try {
        // First log the current global audio settings
        console.log('🔍 [STARTUP] Current global audio settings before loading:', JSON.stringify((global as any).__SAVED_AUDIO_SETTINGS));
        
        // Create a batch of AsyncStorage calls to improve performance
        const keys = [
          PREFERENCE_KEYS.TEMPO,
          PREFERENCE_KEYS.SPEECH_THRESHOLD,
          PREFERENCE_KEYS.SILENCE_THRESHOLD,
          PREFERENCE_KEYS.SILENCE_DURATION,
          PREFERENCE_KEYS.IS_MUTED
        ];
        
        const results = await AsyncStorage.multiGet(keys);
        const savedValues: {[key: string]: any} = {};
        
        // Process the results
        results.forEach(([key, value]) => {
          if (value !== null) {
            if (key === PREFERENCE_KEYS.IS_MUTED) {
              savedValues[key] = value === 'true';
            } else {
              savedValues[key] = parseFloat(value);
            }
          }
        });
        
        // Log all AsyncStorage values found
        console.log('🔍 [STARTUP] Audio settings loaded from AsyncStorage:', JSON.stringify(savedValues));
        
        // Update tempo if found
        if (savedValues[PREFERENCE_KEYS.TEMPO] !== undefined) {
          const savedTempo = savedValues[PREFERENCE_KEYS.TEMPO];
          console.log(`🎯 [STARTUP] Loaded tempo from AsyncStorage: ${savedTempo} (${Math.round(savedTempo * 100)}%)`);
          
          // Force state update with the AsyncStorage value
          setTempo(savedTempo);
          
          // Always update global reference to match AsyncStorage
          (global as any).__SAVED_AUDIO_SETTINGS.tempo = savedTempo;
          console.log(`🔑 [STARTUP] Updated global audio settings tempo to: ${savedTempo}`);
          
          // Save to AsyncStorage again to ensure persistence
          await saveSingleAudioSetting('TEMPO', savedTempo);
        } else {
          console.log(`📝 [STARTUP] No saved tempo found, saving default: ${PLAYER_SETTINGS.DEFAULT_TEMPO}`);
          await saveSingleAudioSetting('TEMPO', PLAYER_SETTINGS.DEFAULT_TEMPO);
          (global as any).__SAVED_AUDIO_SETTINGS.tempo = PLAYER_SETTINGS.DEFAULT_TEMPO;
          setTempo(PLAYER_SETTINGS.DEFAULT_TEMPO);
        }
        
        // Update speech threshold if found
        if (savedValues[PREFERENCE_KEYS.SPEECH_THRESHOLD] !== undefined) {
          const savedSpeechThreshold = savedValues[PREFERENCE_KEYS.SPEECH_THRESHOLD];
          console.log(`🎯 Loaded speech threshold from AsyncStorage: ${savedSpeechThreshold}`);
          setSpeechThreshold(savedSpeechThreshold);
          (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold = savedSpeechThreshold;
        } else {
          console.log(`📝 No saved speech threshold found, using default: ${AUDIO_SETTINGS.SPEECH_THRESHOLD}`);
          (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold = AUDIO_SETTINGS.SPEECH_THRESHOLD;
        }
        
        // Update silence threshold if found
        if (savedValues[PREFERENCE_KEYS.SILENCE_THRESHOLD] !== undefined) {
          const savedSilenceThreshold = savedValues[PREFERENCE_KEYS.SILENCE_THRESHOLD];
          console.log(`🎯 Loaded silence threshold from AsyncStorage: ${savedSilenceThreshold}`);
          setSilenceThreshold(savedSilenceThreshold);
          (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold = savedSilenceThreshold;
        } else {
          console.log(`📝 No saved silence threshold found, using default: ${AUDIO_SETTINGS.SILENCE_THRESHOLD}`);
          (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold = AUDIO_SETTINGS.SILENCE_THRESHOLD;
        }
        
        // Update silence duration if found
        if (savedValues[PREFERENCE_KEYS.SILENCE_DURATION] !== undefined) {
          const savedSilenceDuration = savedValues[PREFERENCE_KEYS.SILENCE_DURATION];
          console.log(`🎯 Loaded silence duration from AsyncStorage: ${savedSilenceDuration}`);
          setSilenceDuration(savedSilenceDuration);
          (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration = savedSilenceDuration;
        } else {
          console.log(`📝 No saved silence duration found, using default: ${AUDIO_SETTINGS.SILENCE_DURATION}`);
          (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration = AUDIO_SETTINGS.SILENCE_DURATION;
        }
        
        // Update mute state if found
        if (savedValues[PREFERENCE_KEYS.IS_MUTED] !== undefined) {
          const savedIsMuted = savedValues[PREFERENCE_KEYS.IS_MUTED];
          console.log(`🎯 Loaded muted state from AsyncStorage: ${savedIsMuted}`);
          setIsMuted(savedIsMuted);
          (global as any).__SAVED_AUDIO_SETTINGS.isMuted = savedIsMuted;
        } else {
          console.log(`📝 No saved muted state found, using default: false`);
          (global as any).__SAVED_AUDIO_SETTINGS.isMuted = false;
        }
        
        console.log('🔑 Updated global audio settings reference with AsyncStorage values');
        
      } catch (error) {
        console.error('Error loading audio settings from AsyncStorage:', error);
      }
    };
    
    loadSavedAudioSettings();
  }, []);
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
  
  // Quota state
  const [showQuotaExceededModal, setShowQuotaExceededModal] = useState<boolean>(false);

  // Network state
  const { isConnected, isInternetReachable } = useNetwork();
  const [showOfflineWarning, setShowOfflineWarning] = useState<boolean>(false);
  const [pendingMessages, setPendingMessages] = useState<MessageType[]>([]);
  const [reconnectionAttempt, setReconnectionAttempt] = useState<number>(0);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // New state for customizable audio parameters - use global reference if available
  const [speechThreshold, setSpeechThreshold] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS?.speechThreshold || AUDIO_SETTINGS.SPEECH_THRESHOLD
  );
  const [silenceThreshold, setSilenceThreshold] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS?.silenceThreshold || AUDIO_SETTINGS.SILENCE_THRESHOLD
  );
  const [silenceDuration, setSilenceDuration] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS?.silenceDuration || AUDIO_SETTINGS.SILENCE_DURATION
  );

  //state vars for muting
  const [isMuted, setIsMuted] = useState<boolean>(
    (global as any).__SAVED_AUDIO_SETTINGS?.isMuted || false
  );
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

  // Load saved audio settings - this runs ONCE on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get settings from AsyncStorage with highest priority
        const savedSettings = await getAudioSettings();
        if (savedSettings) {
          console.log('🎛️ Loaded saved audio settings:', {
            speechThreshold: savedSettings.speechThreshold,
            silenceThreshold: savedSettings.silenceThreshold,
            silenceDuration: savedSettings.silenceDuration,
            tempo: savedSettings.tempo,
            tempo_percent: Math.round(savedSettings.tempo * 100) + '%',
            isMuted: savedSettings.isMuted
          });
          
          // Only apply the non-tempo settings since we handle tempo separately
          setSpeechThreshold(savedSettings.speechThreshold);
          setSilenceThreshold(savedSettings.silenceThreshold);
          setSilenceDuration(savedSettings.silenceDuration);
          setIsMuted(savedSettings.isMuted);
          
          // DO NOT set tempo here as we handle it in a separate effect
          // which has already run by this point. Setting it again would cause problems.
          console.log(`⚙️ Skipping tempo update in loadSettings. Current tempo: ${tempo}`);
          
          // Check if our global reference is set
          if (!(global as any).__SAVED_TEMPO) {
            (global as any).__SAVED_TEMPO = savedSettings.tempo;
            console.log(`🔑 Setting global tempo reference from settings: ${savedSettings.tempo}`);
          }
        } else {
          console.log('⚠️ No saved audio settings found, using defaults');
        }
      } catch (error) {
        console.error('Error loading audio settings:', error);
      }
    };
    
    loadSettings();
    
    // No cleanup function needed here as we handle that in the main component unmount effect
  }, []);

  // Save audio settings when they change, but don't include tempo in dependencies
  // as we handle tempo separately in its own useEffect
  useEffect(() => {
    // Only save if all values are valid
    if (speechThreshold >= silenceThreshold &&
        silenceThreshold >= 0 &&
        silenceDuration >= 500) {
      
      // Update global reference first to ensure it's always up-to-date
      (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold = speechThreshold;
      (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold = silenceThreshold;
      (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration = silenceDuration;
      (global as any).__SAVED_AUDIO_SETTINGS.isMuted = isMuted;
      
      // Use debounce to prevent too many saves
      const timeoutId = setTimeout(() => {
        console.log('📝 Saving audio settings (without tempo)');
        console.log(`🔊 Speech Threshold: ${speechThreshold}`);
        console.log(`🔇 Silence Threshold: ${silenceThreshold}`);
        console.log(`⏱️ Silence Duration: ${silenceDuration}ms`);
        console.log(`🔕 Muted: ${isMuted}`);
        
        saveAudioSettings({
          speechThreshold,
          silenceThreshold,
          silenceDuration,
          tempo, // Include tempo in the save, but don't trigger on tempo changes
          isMuted
        });
        
        // Update individual settings as well for reliability
        saveSingleAudioSetting('SPEECH_THRESHOLD', speechThreshold);
        saveSingleAudioSetting('SILENCE_THRESHOLD', silenceThreshold);
        saveSingleAudioSetting('SILENCE_DURATION', silenceDuration);
        saveSingleAudioSetting('IS_MUTED', isMuted);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [speechThreshold, silenceThreshold, silenceDuration, isMuted]); // Removed tempo from dependencies
  
  // Save tempo when it changes and log ALL changes to tempo
  useEffect(() => {
    // Skip saving during initial render to prevent overwriting AsyncStorage value
    const saveTempoValue = async () => {
      try {
        // First check the global reference
        const globalTempo = (global as any).__SAVED_AUDIO_SETTINGS?.tempo;
        if (globalTempo !== tempo) {
          console.log(`⚠️ Global tempo reference out of sync! Global: ${globalTempo}, State: ${tempo}. Updating global.`);
          // Always update global reference first for consistency
          (global as any).__SAVED_AUDIO_SETTINGS.tempo = tempo;
        }
        
        // Then check AsyncStorage
        const currentSavedStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
        const currentSaved = currentSavedStr ? parseFloat(currentSavedStr) : null;
        
        if (currentSaved !== tempo) {
          console.log(`💾 Persisting tempo change: ${currentSaved} → ${tempo} (${Math.round(tempo * 100)}%)`);
          
          // Update AsyncStorage
          await saveSingleAudioSetting('TEMPO', tempo);
          
          // Double-check that it was actually saved
          const verifyStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
          const verifyVal = verifyStr ? parseFloat(verifyStr) : null;
          console.log(`✅ Verify tempo saved: ${verifyVal} (${verifyVal ? Math.round(verifyVal * 100) : 'null'}%)`);
          
          // One final check to ensure everything is in sync
          if ((global as any).__SAVED_AUDIO_SETTINGS.tempo !== tempo) {
            console.log(`🛠️ Final sync check failed, forcing update to global reference`);
            (global as any).__SAVED_AUDIO_SETTINGS.tempo = tempo;
          }
        } else {
          console.log(`🔄 Tempo unchanged in AsyncStorage (${Math.round(tempo * 100)}%), still ensuring global is updated`);
          // Even if AsyncStorage is already correct, make sure global ref is updated
          (global as any).__SAVED_AUDIO_SETTINGS.tempo = tempo;
        }
        
        // Log the final state of everything
        console.log(`🔍 After save - State: ${tempo}, Global: ${(global as any).__SAVED_AUDIO_SETTINGS.tempo}, AsyncStorage: ${currentSaved || "unknown"}`);
      } catch (error) {
        console.error('Error saving tempo:', error);
        // Even if save fails, update global reference
        (global as any).__SAVED_AUDIO_SETTINGS.tempo = tempo;
      }
    };
    
    // Log with callstack to trace where tempo changes come from
    const stack = new Error().stack;
    console.log(`🎵 TEMPO CHANGE DETECTED: ${tempo} (${Math.round(tempo * 100)}%)`);
    console.log(`🎵 Callstack for tempo change: ${stack?.split('\n').slice(0, 5).join('\n')}`);
    
    // Save to AsyncStorage for debugging persistence
    AsyncStorage.setItem('DEBUG_LAST_TEMPO', JSON.stringify({
      value: tempo,
      timestamp: new Date().toISOString()
    }));
    
    // Update global reference immediately
    (global as any).__SAVED_AUDIO_SETTINGS.tempo = tempo;
    
    // Then do full persistence with a small delay
    const timeoutId = setTimeout(() => {
      saveTempoValue();
    }, 50); // Small delay to batch rapid changes
    
    return () => clearTimeout(timeoutId);
  }, [tempo]);

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
    // Get saved tempo directly from AsyncStorage to ensure we have the latest value
    const loadLatestTempo = async () => {
      try {
        const savedTempoStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
        return savedTempoStr ? parseFloat(savedTempoStr) : tempo;
      } catch (error) {
        console.error('Error loading latest tempo:', error);
        return tempo;
      }
    };
    
    // Perform the reset with the latest audio parameter values
    const resetWithCurrentParams = async () => {
      // Use our global reference as the source of truth for all audio parameters
      let audioSettings = (global as any).__SAVED_AUDIO_SETTINGS || {
        tempo: PLAYER_SETTINGS.DEFAULT_TEMPO,
        speechThreshold: AUDIO_SETTINGS.SPEECH_THRESHOLD,
        silenceThreshold: AUDIO_SETTINGS.SILENCE_THRESHOLD,
        silenceDuration: AUDIO_SETTINGS.SILENCE_DURATION,
        isMuted: false
      };
      
      console.log(`🔑 Using global audio settings reference in reset:`, audioSettings);
      
      // If we don't have global values, try AsyncStorage as a backup
      if (!audioSettings.tempo) {
        audioSettings.tempo = await loadLatestTempo();
      }
      
      console.log(`🔄 RESETTING CONVERSATION - Current settings:`, {
        tempo: tempo,
        speechThreshold: speechThreshold,
        silenceThreshold: silenceThreshold,
        silenceDuration: silenceDuration,
        isMuted: isMuted
      });
      console.log(`🔄 Will restore to:`, audioSettings);
      
      // Reset conversation and UI state
      setHistory([]);
      setConversationId(null);
      setIsLoading(false);
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
      
      // Debug log BEFORE restoring
      console.log(`🔍 BEFORE RESTORING AUDIO PARAMETERS`);
      
      // Ensure values are within valid ranges
      const validTempo = Math.max(0.6, Math.min(1.2, parseFloat(audioSettings.tempo.toString())));
      const validSpeechThreshold = Math.max(0, Math.min(100, audioSettings.speechThreshold));
      const validSilenceThreshold = Math.max(0, Math.min(validSpeechThreshold, audioSettings.silenceThreshold));
      const validSilenceDuration = Math.max(500, Math.min(5000, audioSettings.silenceDuration));
      
      // Restore audio parameters to their saved values
      // This ensures they persist between conversations
      setSpeechThreshold(validSpeechThreshold);
      setSilenceThreshold(validSilenceThreshold);
      setSilenceDuration(validSilenceDuration);
      setIsMuted(audioSettings.isMuted);
      
      // Set tempo in a separate update cycle to ensure it's not batched with other state updates
      setTimeout(() => {
        console.log(`🔍 SETTING TEMPO in setTimeout - Value: ${validTempo}`);
        setTempo(validTempo);
        
        // Update global reference with all validated values
        (global as any).__SAVED_AUDIO_SETTINGS = {
          tempo: validTempo,
          speechThreshold: validSpeechThreshold,
          silenceThreshold: validSilenceThreshold,
          silenceDuration: validSilenceDuration,
          isMuted: audioSettings.isMuted
        };
        
        // Ensure everything is also saved to AsyncStorage
        Promise.all([
          saveSingleAudioSetting('TEMPO', validTempo),
          saveSingleAudioSetting('SPEECH_THRESHOLD', validSpeechThreshold),
          saveSingleAudioSetting('SILENCE_THRESHOLD', validSilenceThreshold),
          saveSingleAudioSetting('SILENCE_DURATION', validSilenceDuration),
          saveSingleAudioSetting('IS_MUTED', audioSettings.isMuted)
        ])
          .then(() => console.log(`✅ All audio settings saved during reset`))
          .catch(err => console.error('Error saving audio settings during reset:', err));
      }, 0);
      
      // Log the preserved parameters for debugging
      console.log("🔄 Conversation state reset with preserved audio parameters:", {
        preservedAudioParams: {
          speechThreshold: currentSpeechThreshold,
          silenceThreshold: currentSilenceThreshold,
          silenceDuration: currentSilenceDuration,
          tempo: latestTempo,
          isMuted: currentIsMuted
        }
      });
    };
    
    // Execute the reset function
    resetWithCurrentParams();
    
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

  // Function to update any audio setting and ensure it's properly saved
  const updateAudioSetting = (type: string, value: any) => {
    // Update global reference immediately
    (global as any).__SAVED_AUDIO_SETTINGS = {
      ...(global as any).__SAVED_AUDIO_SETTINGS,
      [type.toLowerCase()]: value
    };
    
    console.log(`🔊 Updating ${type} to: ${value}`);
    
    // Update state based on setting type
    switch (type) {
      case 'tempo':
        setTempo(value);
        break;
      case 'speechThreshold':
        setSpeechThreshold(value);
        break;
      case 'silenceThreshold':
        setSilenceThreshold(value);
        break;
      case 'silenceDuration':
        setSilenceDuration(value);
        break;
      case 'isMuted':
        setIsMuted(value);
        break;
      default:
        console.warn(`Unknown audio setting type: ${type}`);
    }
    
    // Save to AsyncStorage (this is handled by the useEffect hooks)
  };

  // 3. Add toggle mute function
  const toggleMute = (muted: boolean) => {
    // Update mute state
    setIsMuted(muted);
    
    // Update global reference
    (global as any).__SAVED_AUDIO_SETTINGS.isMuted = muted;
    
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
  
  // Handle the "Let's Go" button click
  const handleStart = async () => {
    if (!welcomeReady || !welcomeData) return;
    
    // Hide the start button
    setShowStartButton(false);
    
    // Set the initial message from the stored welcome data but enhance it with hasAudio property
    // This ensures the welcome message can be replayed
    const enhancedHistory = welcomeData.history?.map((msg, index) => {
      // Add hasAudio property to the assistant message (which should be the first one)
      if (msg.role === 'assistant' && index === 0) {
        return {
          ...msg,
          hasAudio: welcomeData.has_audio && !isMuted
        };
      }
      return msg;
    }) || [];
    
    setHistory(enhancedHistory);
    
    // Now that we're showing welcome message, we can set isLoading to false
    // This ensures the typing indicator doesn't show separately
    setIsLoading(false);
    
    // Play audio for the welcome message if available
    if (welcomeData.has_audio && !isMuted) {
      setStatusMessage('Preparing welcome audio...');
      
      // Small delay to ensure state updates have taken effect
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log(`🔍 Playing welcome audio after clicking "Let's Go" button`);
      setStatusMessage('Streaming welcome audio...');
      await playAudio(welcomeData.conversation_id, 0); // Play the first message (welcome)
    }
    
    // Make sure to scroll to the bottom to show the welcome message
    setTimeout(() => scrollToBottom(true), 100);
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

  // Animation refs for buffering dots
  const bufferingDot1 = useRef(new Animated.Value(0)).current;
  const bufferingDot2 = useRef(new Animated.Value(0)).current;
  const bufferingDot3 = useRef(new Animated.Value(0)).current;
  
  // Animation for buffering dots in the empty state
  useEffect(() => {
    // Only run the animation when we're showing the buffering dots
    if (showStartButton && !welcomeReady) {
      // Create animations for each dot with different delays
      const createDotAnimation = (dot: Animated.Value) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };
      
      // Start animations with staggered delays
      const anim1 = createDotAnimation(bufferingDot1);
      const anim2 = createDotAnimation(bufferingDot2);
      const anim3 = createDotAnimation(bufferingDot3);
      
      // Start the animations with staggered timing
      anim1.start();
      setTimeout(() => { anim2.start(); }, 200);
      setTimeout(() => { anim3.start(); }, 400);
      
      // Cleanup function
      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    }
  }, [showStartButton, welcomeReady, bufferingDot1, bufferingDot2, bufferingDot3]);
  
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

      // Update global reference first for safety
      (global as any).__SAVED_AUDIO_SETTINGS = {
        tempo,
        speechThreshold,
        silenceThreshold,
        silenceDuration,
        isMuted
      };
      
      // Save current audio settings to ensure they persist
      console.log(`💾 Saving all audio settings on unmount`);
      console.log(`🎵 Tempo: ${tempo} (${Math.round(tempo * 100)}%)`);
      console.log(`🔊 Speech Threshold: ${speechThreshold}`);
      console.log(`🔇 Silence Threshold: ${silenceThreshold}`);
      console.log(`⏱️ Silence Duration: ${silenceDuration}ms`);
      console.log(`🔕 Muted: ${isMuted}`);
      
      saveAudioSettings({
        speechThreshold,
        silenceThreshold,
        silenceDuration,
        tempo,
        isMuted
      }).then(() => {
        console.log("✅ Audio settings saved on unmount");
      }).catch(error => {
        console.error("Error saving audio settings on unmount:", error);
      });

      // Save each parameter separately as well to ensure they're definitely saved
      Promise.all([
        saveSingleAudioSetting('TEMPO', tempo),
        saveSingleAudioSetting('SPEECH_THRESHOLD', speechThreshold),
        saveSingleAudioSetting('SILENCE_THRESHOLD', silenceThreshold),
        saveSingleAudioSetting('SILENCE_DURATION', silenceDuration),
        saveSingleAudioSetting('IS_MUTED', isMuted)
      ])
        .then(() => console.log(`✅ All audio parameters saved separately on unmount`))
        .catch(err => console.error('Error saving parameters on unmount:', err));

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
  }, [tempo, speechThreshold, silenceThreshold, silenceDuration, isMuted]); // Add dependencies to ensure we have the latest values in the cleanup

  // Add navigation event listeners to stop audio when exiting the screen
  useEffect(() => {
    // Function to stop audio playback
    const stopAudioPlayback = async () => {
      console.log("⏹️ Screen blur/navigation - stopping audio playback");
      
      if (isPlaying && soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          setIsPlaying(false);
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

    // Cleanup listeners when component unmounts
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
      backHandler.remove();
    };
  }, [navigation, isPlaying]);

  // Add this new function to initialize conversations
  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has available quota
      const hasQuota = await hasAvailableQuota();
      if (!hasQuota) {
        // Show quota exceeded modal
        setShowQuotaExceededModal(true);
        
        // Create a welcome message that explains the quota limit
        let quotaExceededMessage = {
          role: 'assistant',
          content: "You've reached your monthly usage limit. Please upgrade your subscription to continue using the language tutor.",
          timestamp: new Date().toISOString(),
          translation: ''
        };
        
        setHistory([quotaExceededMessage]);
        setIsLoading(false);
        return;
      }

      // Always use the audio settings global reference
      let audioSettings = (global as any).__SAVED_AUDIO_SETTINGS || {
        tempo: PLAYER_SETTINGS.DEFAULT_TEMPO,
        speechThreshold: AUDIO_SETTINGS.SPEECH_THRESHOLD,
        silenceThreshold: AUDIO_SETTINGS.SILENCE_THRESHOLD,
        silenceDuration: AUDIO_SETTINGS.SILENCE_DURATION,
        isMuted: false
      };
      
      // Get the current tempo from global reference
      let currentTempo = audioSettings.tempo;
      
      // Double-check with AsyncStorage as a backup
      try {
        const savedTempoStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
        if (savedTempoStr) {
          const savedTempo = parseFloat(savedTempoStr);
          // If there's a mismatch, update both state and global reference
          if (savedTempo !== currentTempo) {
            console.log(`⚠️ Tempo mismatch detected! AsyncStorage: ${savedTempo}, Global: ${currentTempo}. Using AsyncStorage value.`);
            currentTempo = savedTempo;
            setTempo(savedTempo); // Update our state to match
            
            // Update global reference
            (global as any).__SAVED_AUDIO_SETTINGS.tempo = savedTempo;
            console.log(`🔄 Updated global audio settings with tempo: ${savedTempo}`);
          }
        }
      } catch (error) {
        console.error('Error getting saved tempo before conversation init:', error);
      }
      
      console.log(`🏆 Using tempo for conversation: ${currentTempo} (${Math.round(currentTempo * 100)}%)`);
      console.log(`🔍 Current global audio settings:`, (global as any).__SAVED_AUDIO_SETTINGS);

      // Force tempo to be the correct type and range
      currentTempo = Math.max(0.6, Math.min(1.2, parseFloat(currentTempo.toString())));
      
      console.log(`🚀 Creating conversation with tempo: ${currentTempo} (${Math.round(currentTempo * 100)}%)`);

      // Call the new API endpoint to create a conversation
      const response = await api.createConversation({
        difficulty: getDifficulty(),
        nativeLanguage: getNativeLanguage(),
        targetLanguage: getTargetLanguage(),
        learningObjective: getLearningObjective(),
        conversationMode: route.params.conversationMode,
        tempo: currentTempo,
        isMuted: isMuted
      });

      // Update state with the response data
      if (response) {
        // Set conversation ID only, but don't show welcome message yet
        setConversationId(response.conversation_id);
        
        // Store the welcome data for when user clicks "Let's Go" button
        setWelcomeData(response);
        setWelcomeReady(true);
        setShowStartButton(true);
        
        // Clean up loading state, but don't set isLoading to false yet
        // We want to keep isLoading true until the user clicks "Let's Go"
        // This prevents the typing indicator from showing separately
        setStatusMessage('Ready to start');
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      
      // Check if the error is due to quota exceeded
      if (error instanceof Error && error.message.includes('quota exceeded')) {
        setShowQuotaExceededModal(true);
        
        // Create a welcome message that explains the quota limit
        let quotaExceededMessage = {
          role: 'assistant',
          content: "You've reached your monthly usage limit. Please upgrade your subscription to continue using the language tutor.",
          timestamp: new Date().toISOString(),
          translation: ''
        };
        
        setHistory([quotaExceededMessage]);
      } else {
        // Fallback if the API call fails for other reasons
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
      }
    } finally {
      // Only set isLoading to false if there was an error
      // For successful initialization, we'll keep isLoading true until the user clicks "Let's Go"
      if (!welcomeReady || !welcomeData) {
        setIsLoading(false);
      }
    }
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
  
  // Don't allow sending messages until welcome message is shown (regardless of mute state)
  if (showStartButton) {
    console.log("⛔ Blocked message - user must click Let's Go button first");
    setStatusMessage("Click 'Let's Go' to start the conversation");
    return;
  }

  // Check if this is a repetition request - if so, handle specially
  if (checkRepetitionRequest(inputMessage, getTargetLanguage(), getNativeLanguage())) {
    // Find the last assistant message
    const lastAssistantMessageIndex = history.findLastIndex(msg => msg.role === 'assistant');

    if (lastAssistantMessageIndex >= 0) {
      const lastAssistantMessage = history[lastAssistantMessageIndex];

      // Add user's repetition request to history
      const userMessage = {
        role: 'user',
        content: inputMessage,
        timestamp: new Date().toISOString()
      };

      setHistory(prev => [...prev, userMessage]);

      // If muted, just add the assistant message to history; if not muted, also play audio
      const assistantMessage = {
        role: 'assistant',
        content: lastAssistantMessage.content,
        translation: lastAssistantMessage.translation || '',
        timestamp: new Date().toISOString(),
        hasAudio: !isMuted,
        isRepetition: true
      };

      setHistory(prev => [...prev, assistantMessage]);

      // Play audio for the repetition message if not muted
      if (!isMuted) {
        await playAudio(conversationId, history.length); // This will play the newly added message
      }

      return;
    }
  }

  // Add user message to history immediately
  const userMessage = {
    role: 'user',
    content: inputMessage,
    timestamp: new Date().toISOString()
  };

  setHistory(prev => [...prev, userMessage]);
  setIsLoading(true);

  try {
    // Get the latest tempo value from AsyncStorage
    let currentTempo = tempo;
    try {
      const savedTempoStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
      if (savedTempoStr) {
        const savedTempo = parseFloat(savedTempoStr);
        if (savedTempo !== tempo) {
          console.log(`⚠️ Tempo mismatch before sendTextMessage: Saved: ${savedTempo}, Current: ${tempo}. Using saved value.`);
          currentTempo = savedTempo;
          // Update the state for future requests
          setTempo(savedTempo);
        }
      }
    } catch (error) {
      console.error('Error getting saved tempo before sendTextMessage:', error);
    }
    
    console.log(`📨 Sending text message with tempo: ${currentTempo} (${Math.round(currentTempo * 100)}%)`);
    
    const response = await api.sendTextMessage(
      inputMessage,
      conversationId,
      currentTempo, // Use verified tempo value
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

      const newHistory = [];

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
    const errorMessage = {
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
  
  // Don't allow processing voice recordings until welcome message is shown (regardless of mute state)
  if (showStartButton) {
    console.log("⛔ Blocked voice recording - user must click Let's Go button first");
    setStatusMessage("Click 'Let's Go' to start the conversation");
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

    // Get the latest tempo value from AsyncStorage
    let currentTempo = tempo;
    try {
      const savedTempoStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
      if (savedTempoStr) {
        const savedTempo = parseFloat(savedTempoStr);
        if (savedTempo !== tempo) {
          console.log(`⚠️ Tempo mismatch before voice recording: Saved: ${savedTempo}, Current: ${tempo}. Using saved value.`);
          currentTempo = savedTempo;
          // Update the state for future requests
          setTempo(savedTempo);
        }
      }
    } catch (error) {
      console.error('Error getting saved tempo before voice recording:', error);
    }
    
    console.log(`🎤 Sending voice recording with tempo: ${currentTempo} (${Math.round(currentTempo * 100)}%)`);

    const response = await api.sendVoiceRecording({
      audioUri,
      conversationId,
      tempo: currentTempo, // Use verified tempo value
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

      // Always use the audio settings global reference
      let audioSettings = (global as any).__SAVED_AUDIO_SETTINGS || {
        tempo: PLAYER_SETTINGS.DEFAULT_TEMPO,
        speechThreshold: AUDIO_SETTINGS.SPEECH_THRESHOLD,
        silenceThreshold: AUDIO_SETTINGS.SILENCE_THRESHOLD,
        silenceDuration: AUDIO_SETTINGS.SILENCE_DURATION,
        isMuted: false
      };
      
      // Get the current tempo from global reference
      let currentTempo = audioSettings.tempo;
      
      // Log the current state and global values for debugging
      console.log(`🔍 Audio playback - State tempo: ${tempo}, Global tempo: ${currentTempo}`);
      
      // If there's a mismatch between state and global reference, update state
      if (currentTempo !== tempo) {
        console.log(`⚠️ Tempo mismatch detected before audio playback! State: ${tempo}, Global: ${currentTempo}. Using global value.`);
        setTempo(currentTempo);
      }
      
      // Double-check with AsyncStorage for complete safety
      try {
        const savedTempoStr = await AsyncStorage.getItem(PREFERENCE_KEYS.TEMPO);
        if (savedTempoStr) {
          const savedTempo = parseFloat(savedTempoStr);
          // If AsyncStorage has a different value, update both state and global reference
          if (savedTempo !== currentTempo) {
            console.log(`⚠️ AsyncStorage tempo differs from global reference! AsyncStorage: ${savedTempo}, Global: ${currentTempo}`);
            currentTempo = savedTempo;
            setTempo(savedTempo);
            
            // Update global reference
            (global as any).__SAVED_AUDIO_SETTINGS.tempo = savedTempo;
            console.log(`🔄 Updated global audio settings with tempo from AsyncStorage: ${savedTempo}`);
          }
        }
      } catch (error) {
        console.error('Error checking AsyncStorage tempo before audio playback:', error);
      }
      
      // Ensure currentTempo is within valid range and is a number
      currentTempo = Math.max(0.6, Math.min(1.2, parseFloat(currentTempo.toString())));
      
      console.log(`🎧 Using tempo for audio playback: ${currentTempo} (${Math.round(currentTempo * 100)}%)`);

      // Build streaming URL with the verified tempo value
      const audioUrl = api.getAudioStreamUrl(
        conversationId,
        messageIndex,
        currentTempo, // Use verified tempo
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
    
    // Don't allow recording until welcome message is shown (regardless of mute state)
    if (showStartButton) {
      console.log("⛔ Blocked voice recording - user must click Let's Go button first");
      setStatusMessage("Click 'Let's Go' to start the conversation");
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
        
        {/* Show loading indicator while welcome data is loading */}
        {showStartButton && !welcomeReady && (
          <View style={styles.loadingContainer}>
            <View style={styles.buffering}>
              <Animated.View 
                style={[
                  styles.bufferingDot,
                  {
                    opacity: bufferingDot1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1]
                    }),
                    transform: [{
                      scale: bufferingDot1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1.2]
                      })
                    }]
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.bufferingDot,
                  {
                    opacity: bufferingDot2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1]
                    }),
                    transform: [{
                      scale: bufferingDot2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1.2]
                      })
                    }]
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.bufferingDot,
                  {
                    opacity: bufferingDot3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1]
                    }),
                    transform: [{
                      scale: bufferingDot3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1.2]
                      })
                    }]
                  }
                ]} 
              />
            </View>
            <Text style={styles.bufferingText}>Preparing your conversation...</Text>
          </View>
        )}
        
        {/* Show the "Let's Go" button if welcome data is ready */}
        {showStartButton && welcomeReady && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStart}
          >
            <Text style={styles.startButtonText}>Let's Go!</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return history.map((msg, index) => {
    // Determine if this is the latest assistant message for display purposes
    const isLatestAssistantMessage =
      msg.role === 'assistant' &&
      index === history.findLastIndex(m => m.role === 'assistant');

    // Only allow the latest assistant message with audio to be replayed
    const canReplayThisMessage =
      isLatestAssistantMessage &&
      msg.hasAudio === true &&  // Must explicitly check for true
      !isMuted &&
      canReplayLastMessage;

    // If this is the latest assistant message, set up the replay handler
    const replayHandler = canReplayThisMessage ? handleReplayLastMessage : undefined;

    return (
      <Message
        key={index}
        message={{
          ...msg,
          // hasAudio is already part of the message object now
        }}
        isLatestAssistantMessage={isLatestAssistantMessage}
        onRequestReplay={replayHandler}
        isPlaying={isPlaying}
        isMuted={isMuted}
      />
    );
  });
};



  return (
    <SafeView style={styles.container}>
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
      
      {/* Quota Exceeded Modal */}
      <QuotaExceededModal
        visible={showQuotaExceededModal}
        onClose={() => setShowQuotaExceededModal(false)}
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
                  <Text style={styles.countdownText}>{String(silenceCountdown)}s</Text>
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

          {/* Only show typing indicator if we're not still in the welcome state */}
          {isLoading && !showStartButton && (
            <View style={styles.loadingMessage}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Only show input container after clicking Let's Go button */}
        {showStartButton ? (
          <View style={styles.startButtonHint}>
            <Text style={styles.startButtonHintText}>
              Click 'Let's Go' above to start the conversation
            </Text>
          </View>
        ) : (
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
              isMuted={isMuted} // Pass the mute state to allow sending when muted
            />
          )}
        </View>
        )}
      </KeyboardAvoidingView>
    </SafeView>
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
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buffering: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  bufferingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginHorizontal: 5,
  },
  bufferingText: {
    color: colors.gray600,
    marginTop: 8,
    fontSize: 14,
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
  startButtonHint: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonHintText: {
    color: colors.gray600,
    fontSize: 14,
  },

});

export default LanguageTutor;