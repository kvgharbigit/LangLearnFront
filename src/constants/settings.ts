// src/constants/settings.ts

// Default audio settings for voice recording
export const AUDIO_SETTINGS = {
  // Silence detection threshold (below this level is considered silence)
  SILENCE_THRESHOLD: 40,

  // Speech detection threshold (above this level is considered speech)
  SPEECH_THRESHOLD: 70,

  // Time in milliseconds to wait in silence before auto-stopping
  SILENCE_DURATION: 1500,

  // Minimum recording time in milliseconds before silence detection starts
  MIN_RECORDING_TIME: 500,

  // Interval in milliseconds to check audio levels
  CHECK_INTERVAL: 50,
};

// Default audio player settings
export const PLAYER_SETTINGS = {
  // Default playback speed
  DEFAULT_TEMPO: 0.75,

  // Min/max tempo range
  MIN_TEMPO: 0.5,
  MAX_TEMPO: 1.5,

  // Tempo step size
  TEMPO_STEP: 0.1,
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
  API_CONFIG
};