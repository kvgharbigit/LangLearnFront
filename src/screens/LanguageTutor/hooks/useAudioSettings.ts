/**
 * useAudioSettings.ts
 * 
 * Custom hook for managing audio settings throughout the app.
 * Handles loading, saving, and updating audio settings with persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AUDIO_SETTINGS, 
  PLAYER_SETTINGS 
} from '../../../constants/settings';
import { 
  getAudioSettings, 
  saveAudioSettings, 
  saveSingleAudioSetting, 
  PREFERENCE_KEYS 
} from '../../../utils/userPreferences';

// Improved debounce implementation with cancel method
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout | null = null;
  
  const debouncedFunc = (...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
    
    // Return an object with control methods
    return {
      // Flush method to immediately execute if needed
      flush: () => {
        if (timeout) {
          clearTimeout(timeout);
          func(...args);
          timeout = null;
        }
      },
      // Cancel method to abort without executing
      cancel: () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      }
    };
  };
  
  // Add the control methods to the main function as well
  debouncedFunc.flush = () => {
    if (timeout && debouncedFunc.lastArgs) {
      clearTimeout(timeout);
      func(...debouncedFunc.lastArgs);
      timeout = null;
    }
  };
  
  debouncedFunc.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  // Storage for the last arguments
  debouncedFunc.lastArgs = null as any;
  
  return debouncedFunc;
};

// Interface for audio settings
interface AudioSettings {
  tempo: number;
  speechThreshold: number;
  silenceThreshold: number;
  silenceDuration: number;
  isMuted: boolean;
}

/**
 * Hook for managing audio settings with persistence
 */
export default function useAudioSettings() {
  // Initialize global reference for audio settings if needed
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
  
  // State for audio settings
  const [tempo, setTempo] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS.tempo || PLAYER_SETTINGS.DEFAULT_TEMPO
  );
  const [speechThreshold, setSpeechThreshold] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold || AUDIO_SETTINGS.SPEECH_THRESHOLD
  );
  const [silenceThreshold, setSilenceThreshold] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold || AUDIO_SETTINGS.SILENCE_THRESHOLD
  );
  const [silenceDuration, setSilenceDuration] = useState<number>(
    (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration || AUDIO_SETTINGS.SILENCE_DURATION
  );
  const [isMuted, setIsMuted] = useState<boolean>(
    (global as any).__SAVED_AUDIO_SETTINGS.isMuted || false
  );
  
  // Create refs to store the debounced save functions
  const debouncedSaveRef = useRef<any>(null);
  
  // Create a debounced save function that will persist settings after 500ms
  const createDebouncedSave = useCallback(() => {
    return debounce(async (settings: AudioSettings) => {
      console.log('⏱️ Executing debounced save for audio settings');
      await saveAudioSettings(settings);
    }, 500);
  }, []);

  /**
   * Load audio settings from AsyncStorage
   */
  const loadSavedAudioSettings = useCallback(async () => {
    try {
      // First log the current global audio settings
      console.log('🔍 [STARTUP] Current global audio settings before loading:', 
        JSON.stringify((global as any).__SAVED_AUDIO_SETTINGS));
      
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
          console.log(`🔍 Found stored value for ${key}: ${value}`);
          try {
            savedValues[key] = JSON.parse(value);
          } catch (e) {
            console.warn(`Failed to parse value for ${key}: ${value}`);
          }
        } else {
          console.log(`🔍 No stored value found for ${key}`);
        }
      });
      
      // Apply each value from storage if it exists
      if (savedValues[PREFERENCE_KEYS.TEMPO] !== undefined) {
        const savedTempo = Number(savedValues[PREFERENCE_KEYS.TEMPO]);
        console.log(`🎵 Setting tempo from storage: ${savedTempo}`);
        setTempo(savedTempo);
        (global as any).__SAVED_AUDIO_SETTINGS.tempo = savedTempo;
      }
      
      if (savedValues[PREFERENCE_KEYS.SPEECH_THRESHOLD] !== undefined) {
        const savedSpeechThreshold = Number(savedValues[PREFERENCE_KEYS.SPEECH_THRESHOLD]);
        console.log(`🎙️ Setting speech threshold from storage: ${savedSpeechThreshold}`);
        setSpeechThreshold(savedSpeechThreshold);
        (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold = savedSpeechThreshold;
      }
      
      if (savedValues[PREFERENCE_KEYS.SILENCE_THRESHOLD] !== undefined) {
        const savedSilenceThreshold = Number(savedValues[PREFERENCE_KEYS.SILENCE_THRESHOLD]);
        console.log(`🔇 Setting silence threshold from storage: ${savedSilenceThreshold}`);
        setSilenceThreshold(savedSilenceThreshold);
        (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold = savedSilenceThreshold;
      }
      
      if (savedValues[PREFERENCE_KEYS.SILENCE_DURATION] !== undefined) {
        const savedSilenceDuration = Number(savedValues[PREFERENCE_KEYS.SILENCE_DURATION]);
        console.log(`⏱️ Setting silence duration from storage: ${savedSilenceDuration}`);
        setSilenceDuration(savedSilenceDuration);
        (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration = savedSilenceDuration;
      }
      
      if (savedValues[PREFERENCE_KEYS.IS_MUTED] !== undefined) {
        const savedIsMuted = Boolean(savedValues[PREFERENCE_KEYS.IS_MUTED]);
        console.log(`🔕 Setting mute state from storage: ${savedIsMuted}`);
        setIsMuted(savedIsMuted);
        (global as any).__SAVED_AUDIO_SETTINGS.isMuted = savedIsMuted;
      }
      
      console.log('🔍 Settings loaded from storage:', {
        tempo: savedValues[PREFERENCE_KEYS.TEMPO],
        speechThreshold: savedValues[PREFERENCE_KEYS.SPEECH_THRESHOLD],
        silenceThreshold: savedValues[PREFERENCE_KEYS.SILENCE_THRESHOLD],
        silenceDuration: savedValues[PREFERENCE_KEYS.SILENCE_DURATION],
        isMuted: savedValues[PREFERENCE_KEYS.IS_MUTED]
      });
    } catch (error) {
      console.error('Error loading audio settings:', error);
    }
  }, []);

  // Initialize debounced save on first render
  useEffect(() => {
    if (!debouncedSaveRef.current) {
      debouncedSaveRef.current = createDebouncedSave();
    }
  }, [createDebouncedSave]);

  // Helper to trigger debounced save with current settings
  const triggerDebouncedSave = useCallback(() => {
    if (debouncedSaveRef.current) {
      const settings = {
        tempo,
        speechThreshold,
        silenceThreshold,
        silenceDuration,
        isMuted
      };
      
      // Update global reference first
      (global as any).__SAVED_AUDIO_SETTINGS = { ...settings };
      
      // Trigger debounced save
      debouncedSaveRef.current(settings);
    }
  }, [tempo, speechThreshold, silenceThreshold, silenceDuration, isMuted]);

  /**
   * Update the tempo setting
   * @param newTempo - New tempo value
   */
  const updateTempo = useCallback(async (newTempo: number) => {
    // Only update if value has changed
    if (tempo !== newTempo) {
      console.log(`💾 Persisting tempo change: ${tempo} → ${newTempo} (${Math.round(newTempo * 100)}%)`);
      setTempo(newTempo);
      (global as any).__SAVED_AUDIO_SETTINGS.tempo = newTempo;
      
      // For tempo, we'll still use immediate save for a single setting
      // because it's a critical setting that needs to be persisted immediately
      await saveSingleAudioSetting(PREFERENCE_KEYS.TEMPO, newTempo);
      console.log(`✅ Verify tempo saved: ${newTempo} (${Math.round(newTempo * 100)}%)`);
      
      // Log state after save for debugging
      console.log(`🔍 After save - State: ${newTempo}, Global: ${(global as any).__SAVED_AUDIO_SETTINGS.tempo}, AsyncStorage: ${tempo}`);
    }
  }, [tempo]);

  /**
   * Toggle the mute state
   */
  const toggleMute = useCallback(async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    (global as any).__SAVED_AUDIO_SETTINGS.isMuted = newMuteState;
    triggerDebouncedSave();
  }, [isMuted, triggerDebouncedSave]);

  /**
   * Update the speech threshold
   * @param newThreshold - New speech threshold value
   */
  const updateSpeechThreshold = useCallback(async (newThreshold: number) => {
    // Only update if value has changed
    if (speechThreshold !== newThreshold) {
      setSpeechThreshold(newThreshold);
      (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold = newThreshold;
      triggerDebouncedSave();
    }
  }, [speechThreshold, triggerDebouncedSave]);

  /**
   * Update the silence threshold
   * @param newThreshold - New silence threshold value
   */
  const updateSilenceThreshold = useCallback(async (newThreshold: number) => {
    // Only update if value has changed
    if (silenceThreshold !== newThreshold) {
      setSilenceThreshold(newThreshold);
      (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold = newThreshold;
      triggerDebouncedSave();
    }
  }, [silenceThreshold, triggerDebouncedSave]);

  /**
   * Update the silence duration
   * @param newDuration - New silence duration value
   */
  const updateSilenceDuration = useCallback(async (newDuration: number) => {
    // Only update if value has changed
    if (silenceDuration !== newDuration) {
      setSilenceDuration(newDuration);
      (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration = newDuration;
      triggerDebouncedSave();
    }
  }, [silenceDuration, triggerDebouncedSave]);

  /**
   * Save all audio settings at once (immediately, without debouncing)
   * Only uses batch save to avoid duplicates
   */
  const saveAllSettings = useCallback(async () => {
    console.log('📝 Saving all audio settings in batch');
    
    // Update global reference
    (global as any).__SAVED_AUDIO_SETTINGS = {
      tempo,
      speechThreshold,
      silenceThreshold,
      silenceDuration,
      isMuted
    };
    
    // Save all settings at once - ONLY using the batch method
    await saveAudioSettings({
      speechThreshold,
      silenceThreshold,
      silenceDuration,
      tempo,
      isMuted
    });
    
    // Cancel any pending debounced saves
    if (debouncedSaveRef.current) {
      if (debouncedSaveRef.current.cancel) {
        debouncedSaveRef.current.cancel();
      }
    }
    
    console.log('✅ All settings saved in single batch operation');
  }, [tempo, speechThreshold, silenceThreshold, silenceDuration, isMuted]);

  // Load settings on mount
  useEffect(() => {
    loadSavedAudioSettings();
  }, [loadSavedAudioSettings]);

  // On unmount, flush any pending saves
  useEffect(() => {
    return () => {
      console.log(`🧹 Component unmounting - cleaning up all audio resources`);
      console.log(`💾 Saving all audio settings on unmount`);
      
      // Log what the settings currently are
      console.log(`🎵 Tempo: ${tempo} (${Math.round(tempo * 100)}%)`);
      console.log(`🔊 Speech Threshold: ${speechThreshold}`);
      console.log(`🔇 Silence Threshold: ${silenceThreshold}`);
      console.log(`⏱️ Silence Duration: ${silenceDuration}ms`);
      console.log(`🔕 Muted: ${isMuted}`);
      
      // Update global reference to ensure it reflects current values
      (global as any).__SAVED_AUDIO_SETTINGS = {
        tempo,
        speechThreshold,
        silenceThreshold,
        silenceDuration,
        isMuted
      };
      
      // Flush any pending debounced saves to ensure all changes are persisted
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current.flush();
      }
    };
  }, [tempo, speechThreshold, silenceThreshold, silenceDuration, isMuted]);

  return {
    tempo,
    speechThreshold,
    silenceThreshold,
    silenceDuration,
    isMuted,
    updateTempo,
    toggleMute,
    updateSpeechThreshold,
    updateSilenceThreshold,
    updateSilenceDuration,
    saveAllSettings
  };
}