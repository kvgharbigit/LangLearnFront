// src/utils/userPreferences.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for preferences
export const PREFERENCE_KEYS = {
  // Audio settings
  SPEECH_THRESHOLD: 'pref_speech_threshold',
  SILENCE_THRESHOLD: 'pref_silence_threshold',
  SILENCE_DURATION: 'pref_silence_duration',
  TEMPO: 'pref_tempo',
  // UI settings
  IS_MUTED: 'pref_is_muted',
  VOICE_INPUT_ENABLED: 'pref_voice_input_enabled',
  AUTO_SEND_ENABLED: 'pref_auto_send_enabled',
  AUTO_RECORD_ENABLED: 'pref_auto_record_enabled',
  DEBUG_MODE: 'pref_debug_mode',
  SIMULATE_REVENUECAT: 'pref_simulate_revenuecat',
  // Learning preferences
  DIFFICULTY_LEVEL: 'pref_difficulty_level',
  // Session preferences
  LAST_LEARNING_OBJECTIVE: 'pref_last_learning_objective',
  CONVERSATION_MODE: 'pref_conversation_mode',
};

/**
 * Interface for audio settings
 */
export interface AudioSettings {
  speechThreshold: number;
  silenceThreshold: number;
  silenceDuration: number;
  tempo: number;
  isMuted: boolean;
}

/**
 * Interface for UI settings
 */
export interface UISettings {
  voiceInputEnabled: boolean;
  autoSendEnabled: boolean;
  autoRecordEnabled: boolean;
  debugMode: boolean;
  simulateRevenueCat: boolean;
}

/**
 * Interface for learning preferences
 */
export interface LearningPreferences {
  difficultyLevel: string;
  lastLearningObjective: string;
}

/**
 * Save audio settings
 */
export const saveAudioSettings = async (settings: AudioSettings): Promise<void> => {
  try {
    const data = {
      [PREFERENCE_KEYS.SPEECH_THRESHOLD]: settings.speechThreshold.toString(),
      [PREFERENCE_KEYS.SILENCE_THRESHOLD]: settings.silenceThreshold.toString(),
      [PREFERENCE_KEYS.SILENCE_DURATION]: settings.silenceDuration.toString(),
      [PREFERENCE_KEYS.TEMPO]: settings.tempo.toString(),
      [PREFERENCE_KEYS.IS_MUTED]: settings.isMuted.toString(),
    };

    await AsyncStorage.multiSet(Object.entries(data));
    console.log('Audio settings saved successfully');
  } catch (error) {
    console.error('Error saving audio settings:', error);
  }
};

/**
 * Save UI settings
 */
export const saveUISettings = async (settings: UISettings): Promise<void> => {
  try {
    const data = {
      [PREFERENCE_KEYS.VOICE_INPUT_ENABLED]: settings.voiceInputEnabled.toString(),
      [PREFERENCE_KEYS.AUTO_SEND_ENABLED]: settings.autoSendEnabled.toString(),
      [PREFERENCE_KEYS.AUTO_RECORD_ENABLED]: settings.autoRecordEnabled.toString(),
      [PREFERENCE_KEYS.DEBUG_MODE]: settings.debugMode.toString(),
      [PREFERENCE_KEYS.SIMULATE_REVENUECAT]: settings.simulateRevenueCat.toString(),
    };

    await AsyncStorage.multiSet(Object.entries(data));
    console.log('UI settings saved successfully');
  } catch (error) {
    console.error('Error saving UI settings:', error);
  }
};

/**
 * Save learning preferences
 */
export const saveLearningPreferences = async (preferences: LearningPreferences): Promise<void> => {
  try {
    const data = {
      [PREFERENCE_KEYS.DIFFICULTY_LEVEL]: preferences.difficultyLevel,
      [PREFERENCE_KEYS.LAST_LEARNING_OBJECTIVE]: preferences.lastLearningObjective || '',
    };

    await AsyncStorage.multiSet(Object.entries(data));
    console.log('Learning preferences saved successfully');
  } catch (error) {
    console.error('Error saving learning preferences:', error);
  }
};

/**
 * Get audio settings with default values
 */
export const getAudioSettings = async (): Promise<AudioSettings> => {
  try {
    const keys = [
      PREFERENCE_KEYS.SPEECH_THRESHOLD,
      PREFERENCE_KEYS.SILENCE_THRESHOLD,
      PREFERENCE_KEYS.SILENCE_DURATION,
      PREFERENCE_KEYS.TEMPO,
      PREFERENCE_KEYS.IS_MUTED,
    ];

    const results = await AsyncStorage.multiGet(keys);

    // Default platform-specific values
    const isIOS = Platform.OS === 'ios';
    const defaultAudioSettings: AudioSettings = {
      speechThreshold: isIOS ? 78 : 45,
      silenceThreshold: isIOS ? 75 : 43,
      silenceDuration: 1500,
      tempo: 0.75, // Changed from 0.9 to match PLAYER_SETTINGS.DEFAULT_TEMPO
      isMuted: false,
    };

    // Parse saved values
    const savedSettings: Partial<AudioSettings> = {};

    results.forEach(([key, value]) => {
      if (value !== null) {
        switch (key) {
          case PREFERENCE_KEYS.SPEECH_THRESHOLD:
            savedSettings.speechThreshold = parseInt(value);
            break;
          case PREFERENCE_KEYS.SILENCE_THRESHOLD:
            savedSettings.silenceThreshold = parseInt(value);
            break;
          case PREFERENCE_KEYS.SILENCE_DURATION:
            savedSettings.silenceDuration = parseInt(value);
            break;
          case PREFERENCE_KEYS.TEMPO:
            savedSettings.tempo = parseFloat(value);
            break;
          case PREFERENCE_KEYS.IS_MUTED:
            savedSettings.isMuted = value === 'true';
            break;
        }
      }
    });

    // Combine default and saved settings
    return {
      ...defaultAudioSettings,
      ...savedSettings,
    };
  } catch (error) {
    console.error('Error retrieving audio settings:', error);

    // Return defaults if there's an error
    return {
      speechThreshold: Platform.OS === 'ios' ? 78 : 45,
      silenceThreshold: Platform.OS === 'ios' ? 75 : 43,
      silenceDuration: 1500,
      tempo: 0.75,  // Changed from 0.9 to match PLAYER_SETTINGS.DEFAULT_TEMPO
      isMuted: false,
    };
  }
};

/**
 * Get UI settings with default values
 */
export const getUISettings = async (): Promise<UISettings> => {
  try {
    const keys = [
      PREFERENCE_KEYS.VOICE_INPUT_ENABLED,
      PREFERENCE_KEYS.AUTO_SEND_ENABLED,
      PREFERENCE_KEYS.AUTO_RECORD_ENABLED,
      PREFERENCE_KEYS.DEBUG_MODE,
      PREFERENCE_KEYS.SIMULATE_REVENUECAT,
    ];

    const results = await AsyncStorage.multiGet(keys);

    // Default values
    const defaultUISettings: UISettings = {
      voiceInputEnabled: true,
      autoSendEnabled: true,
      autoRecordEnabled: true,
      debugMode: false,
      simulateRevenueCat: false,
    };

    // Parse saved values
    const savedSettings: Partial<UISettings> = {};

    results.forEach(([key, value]) => {
      if (value !== null) {
        switch (key) {
          case PREFERENCE_KEYS.VOICE_INPUT_ENABLED:
            savedSettings.voiceInputEnabled = value === 'true';
            break;
          case PREFERENCE_KEYS.AUTO_SEND_ENABLED:
            savedSettings.autoSendEnabled = value === 'true';
            break;
          case PREFERENCE_KEYS.AUTO_RECORD_ENABLED:
            savedSettings.autoRecordEnabled = value === 'true';
            break;
          case PREFERENCE_KEYS.DEBUG_MODE:
            savedSettings.debugMode = value === 'true';
            break;
          case PREFERENCE_KEYS.SIMULATE_REVENUECAT:
            savedSettings.simulateRevenueCat = value === 'true';
            break;
        }
      }
    });

    // Combine default and saved settings
    return {
      ...defaultUISettings,
      ...savedSettings,
    };
  } catch (error) {
    console.error('Error retrieving UI settings:', error);

    // Return defaults if there's an error
    return {
      voiceInputEnabled: true,
      autoSendEnabled: true,
      autoRecordEnabled: true,
      debugMode: false,
      simulateRevenueCat: false,
    };
  }
};

/**
 * Get learning preferences with default values
 */
export const getLearningPreferences = async (): Promise<LearningPreferences> => {
  try {
    const keys = [
      PREFERENCE_KEYS.DIFFICULTY_LEVEL,
      PREFERENCE_KEYS.LAST_LEARNING_OBJECTIVE,
    ];

    const results = await AsyncStorage.multiGet(keys);

    // Default values
    const defaultLearningPreferences: LearningPreferences = {
      difficultyLevel: 'beginner',
      lastLearningObjective: '',
    };

    // Parse saved values
    const savedPreferences: Partial<LearningPreferences> = {};

    results.forEach(([key, value]) => {
      if (value !== null) {
        switch (key) {
          case PREFERENCE_KEYS.DIFFICULTY_LEVEL:
            savedPreferences.difficultyLevel = value;
            break;
          case PREFERENCE_KEYS.LAST_LEARNING_OBJECTIVE:
            savedPreferences.lastLearningObjective = value;
            break;
        }
      }
    });

    // Combine default and saved preferences
    return {
      ...defaultLearningPreferences,
      ...savedPreferences,
    };
  } catch (error) {
    console.error('Error retrieving learning preferences:', error);

    // Return defaults if there's an error
    return {
      difficultyLevel: 'beginner',
      lastLearningObjective: '',
    };
  }
};

/**
 * Save a single audio setting
 */
export const saveSingleAudioSetting = async (key: keyof typeof PREFERENCE_KEYS, value: any): Promise<void> => {
  try {
    const preferenceKey = PREFERENCE_KEYS[key];
    if (!preferenceKey) {
      throw new Error(`Invalid preference key: ${key}`);
    }

    await AsyncStorage.setItem(preferenceKey, value.toString());
    console.log(`Setting ${key} saved successfully: ${value}`);
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error);
  }
};

/**
 * Get a single setting value
 */
export const getSingleSetting = async <T>(key: keyof typeof PREFERENCE_KEYS, defaultValue: T): Promise<T> => {
  try {
    const preferenceKey = PREFERENCE_KEYS[key];
    if (!preferenceKey) {
      throw new Error(`Invalid preference key: ${key}`);
    }

    const value = await AsyncStorage.getItem(preferenceKey);

    if (value === null) {
      return defaultValue;
    }

    // Convert value to the appropriate type
    if (typeof defaultValue === 'boolean') {
      return (value === 'true') as unknown as T;
    } else if (typeof defaultValue === 'number') {
      return (Number(value)) as unknown as T;
    } else {
      return value as unknown as T;
    }
  } catch (error) {
    console.error(`Error retrieving setting ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Clear all user preferences
 */
export const clearAllPreferences = async (): Promise<void> => {
  try {
    const allKeys = Object.values(PREFERENCE_KEYS);
    await AsyncStorage.multiRemove(allKeys);
    console.log('All preferences cleared successfully');
  } catch (error) {
    console.error('Error clearing preferences:', error);
  }
};

// Remember to import Platform at the top
import { Platform } from 'react-native';

export default {
  saveAudioSettings,
  saveUISettings,
  saveLearningPreferences,
  getAudioSettings,
  getUISettings,
  getLearningPreferences,
  saveSingleAudioSetting,
  getSingleSetting,
  clearAllPreferences,
};