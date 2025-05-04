/**
 * useAudioSettings.ts
 * 
 * Custom hook for managing audio settings throughout the app.
 * Handles loading, saving, and updating audio settings with persistence.
 */

import { useState, useEffect, useCallback } from 'react';
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

  /**
   * Update the tempo setting
   * @param newTempo - New tempo value
   */
  const updateTempo = useCallback(async (newTempo: number) => {
    setTempo(newTempo);
    (global as any).__SAVED_AUDIO_SETTINGS.tempo = newTempo;
    await saveSingleAudioSetting(PREFERENCE_KEYS.TEMPO, newTempo);
  }, []);

  /**
   * Toggle the mute state
   */
  const toggleMute = useCallback(async () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    (global as any).__SAVED_AUDIO_SETTINGS.isMuted = newMuteState;
    await saveSingleAudioSetting(PREFERENCE_KEYS.IS_MUTED, newMuteState);
  }, [isMuted]);

  /**
   * Update the speech threshold
   * @param newThreshold - New speech threshold value
   */
  const updateSpeechThreshold = useCallback(async (newThreshold: number) => {
    setSpeechThreshold(newThreshold);
    (global as any).__SAVED_AUDIO_SETTINGS.speechThreshold = newThreshold;
    await saveSingleAudioSetting(PREFERENCE_KEYS.SPEECH_THRESHOLD, newThreshold);
  }, []);

  /**
   * Update the silence threshold
   * @param newThreshold - New silence threshold value
   */
  const updateSilenceThreshold = useCallback(async (newThreshold: number) => {
    setSilenceThreshold(newThreshold);
    (global as any).__SAVED_AUDIO_SETTINGS.silenceThreshold = newThreshold;
    await saveSingleAudioSetting(PREFERENCE_KEYS.SILENCE_THRESHOLD, newThreshold);
  }, []);

  /**
   * Update the silence duration
   * @param newDuration - New silence duration value
   */
  const updateSilenceDuration = useCallback(async (newDuration: number) => {
    setSilenceDuration(newDuration);
    (global as any).__SAVED_AUDIO_SETTINGS.silenceDuration = newDuration;
    await saveSingleAudioSetting(PREFERENCE_KEYS.SILENCE_DURATION, newDuration);
  }, []);

  /**
   * Save all audio settings at once
   */
  const saveAllSettings = useCallback(async () => {
    // Update global reference
    (global as any).__SAVED_AUDIO_SETTINGS = {
      tempo,
      speechThreshold,
      silenceThreshold,
      silenceDuration,
      isMuted
    };
    
    // Save all settings
    await saveAudioSettings({
      speechThreshold,
      silenceThreshold,
      silenceDuration,
      tempo,
      isMuted
    });
    
    // Also save each parameter separately for robustness
    await Promise.all([
      saveSingleAudioSetting(PREFERENCE_KEYS.TEMPO, tempo),
      saveSingleAudioSetting(PREFERENCE_KEYS.SPEECH_THRESHOLD, speechThreshold),
      saveSingleAudioSetting(PREFERENCE_KEYS.SILENCE_THRESHOLD, silenceThreshold),
      saveSingleAudioSetting(PREFERENCE_KEYS.SILENCE_DURATION, silenceDuration),
      saveSingleAudioSetting(PREFERENCE_KEYS.IS_MUTED, isMuted)
    ]);
    
    console.log('All audio settings saved successfully');
  }, [tempo, speechThreshold, silenceThreshold, silenceDuration, isMuted]);

  // Load settings on mount
  useEffect(() => {
    loadSavedAudioSettings();
  }, [loadSavedAudioSettings]);

  // Save settings on unmount
  useEffect(() => {
    return () => {
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
        saveSingleAudioSetting(PREFERENCE_KEYS.TEMPO, tempo),
        saveSingleAudioSetting(PREFERENCE_KEYS.SPEECH_THRESHOLD, speechThreshold),
        saveSingleAudioSetting(PREFERENCE_KEYS.SILENCE_THRESHOLD, silenceThreshold),
        saveSingleAudioSetting(PREFERENCE_KEYS.SILENCE_DURATION, silenceDuration),
        saveSingleAudioSetting(PREFERENCE_KEYS.IS_MUTED, isMuted)
      ])
        .then(() => console.log(`✅ All audio parameters saved separately on unmount`))
        .catch(err => console.error('Error saving parameters on unmount:', err));
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