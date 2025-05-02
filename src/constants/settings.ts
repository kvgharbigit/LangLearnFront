// src/constants/settings.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific audio settings values
export const PLATFORM_SPECIFIC = {
  ios: {
    // iOS tends to need higher thresholds due to different audio processing
    SILENCE_THRESHOLD: 75,
    SPEECH_THRESHOLD: 78,
    SILENCE_DURATION: 1500, // Slightly shorter silence duration for iOS
  },
  android: {
    // Android typically needs lower thresholds
    SILENCE_THRESHOLD: 43,
    SPEECH_THRESHOLD: 45,
    SILENCE_DURATION: 1500, // Slightly longer silence duration for Android
  }
};

// Get the correct platform-specific values
const platformValues = Platform.OS === 'ios' ? PLATFORM_SPECIFIC.ios : PLATFORM_SPECIFIC.android;

// Default audio settings for voice recording with platform-specific values
export const AUDIO_SETTINGS = {
  // Silence detection threshold (below this level is considered silence)
  SILENCE_THRESHOLD: platformValues.SILENCE_THRESHOLD,

  // Speech detection threshold (above this level is considered speech)
  SPEECH_THRESHOLD: platformValues.SPEECH_THRESHOLD,

  // Time in milliseconds to wait in silence before auto-stopping
  SILENCE_DURATION: platformValues.SILENCE_DURATION,

  // Minimum recording time in milliseconds before silence detection starts
  MIN_RECORDING_TIME: 500,

  // Interval in milliseconds to check audio levels
  CHECK_INTERVAL: 50,
};

// Helper functions to save and load custom audio settings
export const saveAudioSettings = async (settings: {
  speechThreshold: number;
  silenceThreshold: number;
  silenceDuration: number;
}) => {
  try {
    await AsyncStorage.setItem('AUDIO_SETTINGS', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving audio settings:', error);
    return false;
  }
};

export const loadAudioSettings = async () => {
  try {
    const savedSettings = await AsyncStorage.getItem('AUDIO_SETTINGS');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // Update the in-memory settings
      AUDIO_SETTINGS.SPEECH_THRESHOLD = settings.speechThreshold;
      AUDIO_SETTINGS.SILENCE_THRESHOLD = settings.silenceThreshold;
      AUDIO_SETTINGS.SILENCE_DURATION = settings.silenceDuration;
      return settings;
    }
  } catch (error) {
    console.error('Error loading audio settings:', error);
  }
  return null;
};

// Reset to platform defaults
export const resetAudioSettings = async () => {
  try {
    await AsyncStorage.removeItem('AUDIO_SETTINGS');
    // Reset the in-memory settings
    AUDIO_SETTINGS.SPEECH_THRESHOLD = platformValues.SPEECH_THRESHOLD;
    AUDIO_SETTINGS.SILENCE_THRESHOLD = platformValues.SILENCE_THRESHOLD;
    AUDIO_SETTINGS.SILENCE_DURATION = platformValues.SILENCE_DURATION;
    return true;
  } catch (error) {
    console.error('Error resetting audio settings:', error);
    return false;
  }
};

// Default audio player settings
export const PLAYER_SETTINGS = {
  // Default playback speed
  DEFAULT_TEMPO: 0.75,  // 75%

  // Min/max tempo range
  MIN_TEMPO: 0.5,  // 50%
  MAX_TEMPO: 1.2,  // 120%

  // Tempo step size
  TEMPO_STEP: 0.05,
};

// API configuration
export const API_CONFIG = {
  // Base API URL - replace with your actual API endpoint in production
  BASE_URL: 'http://your-api-url.com',

  // API endpoints
  ENDPOINTS: {
    CHAT: '/chat',
    VOICE_INPUT: '/voice-input',
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000,
};

export default {
  AUDIO_SETTINGS,
  PLAYER_SETTINGS,
  API_CONFIG,
  saveAudioSettings,
  loadAudioSettings,
  resetAudioSettings,
};