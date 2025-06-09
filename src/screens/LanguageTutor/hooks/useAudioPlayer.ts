/**
 * useAudioPlayer.ts
 * 
 * Custom hook that provides audio playback functionality for the language tutor.
 * It handles audio loading, playback, status updates, and cleanup.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { API_URL } from '../../../utils/api';
import * as api from '../../../utils/api';

interface UseAudioPlayerProps {
  isMuted: boolean;
  tempo: number;
  onStatusUpdate?: (isPlaying: boolean) => void;
}

/**
 * Custom hook for managing audio playback in the Language Tutor
 */
export default function useAudioPlayer({ 
  isMuted, 
  tempo, 
  onStatusUpdate 
}: UseAudioPlayerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackCallbackRef = useRef<((status: Audio.PlaybackStatus) => void) | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // State for replay functionality
  const [lastAudioConversationId, setLastAudioConversationId] = useState<string | null>(null);
  const [lastAudioMessageIndex, setLastAudioMessageIndex] = useState<number | null>(null);
  const [canReplayLastMessage, setCanReplayLastMessage] = useState<boolean>(false);

  /**
   * Configure audio mode for playback
   */
  const configureAudioForPlayback = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 1, // DoNotMix
        interruptionModeAndroid: 1, // DoNotMix
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      
      console.log('🔊 Audio configured for playback');
    } catch (error) {
      console.error('Failed to configure audio for playback:', error);
    }
  }, []);

  /**
   * Stop audio playback
   * @param preserveLastMessage - Whether to preserve the last message for replay functionality
   */
  const stopAudio = useCallback(async (preserveLastMessage = false) => {
    if (soundRef.current) {
      try {
        console.log('📩 Stopping audio playback');
        
        // Remove the callback first
        if (playbackCallbackRef.current) {
          soundRef.current.setOnPlaybackStatusUpdate(null);
          playbackCallbackRef.current = null;
        }
        
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        
        // Update state
        setIsPlaying(false);
        if (onStatusUpdate) onStatusUpdate(false);
        
        // Clear message reference if not preserving
        if (!preserveLastMessage) {
          setLastAudioMessageIndex(null);
        }
      } catch (error) {
        console.error('Error stopping audio:', error);
      } finally {
        soundRef.current = null;
      }
    }
  }, [onStatusUpdate]);

  /**
   * Handle playback status updates
   */
  const createPlaybackStatusCallback = useCallback(() => {
    return (status: Audio.PlaybackStatus) => {
      // First check if component is still mounted
      if (!isMountedRef.current) {
        console.log("🎵 [AUDIO] Component unmounted, ignoring status update");
        return;
      }
      
      if (!status.isLoaded) {
        console.log("🎵 Sound is not loaded");
        if (status.error) {
          console.error(`🎵 Error loading sound: ${status.error}`);
          setStatusMessage(`Audio error: ${status.error}`);
          
          // If there's an error loading the sound, update the message status
          if (window && window.updateMessageTTSStatus && lastAudioConversationId && lastAudioMessageIndex !== null) {
            window.updateMessageTTSStatus(lastAudioConversationId, lastAudioMessageIndex, 'failed');
          }
        }
        return;
      }
      
      // Check if playback has finished
      if (status.isLoaded && status.didJustFinish) {
        console.log("🎵 Audio playback completed");
        setIsPlaying(false);
        if (onStatusUpdate) onStatusUpdate(false);
        
        // Make sure the message status is updated to completed
        if (window && window.updateMessageTTSStatus && lastAudioConversationId && lastAudioMessageIndex !== null) {
          window.updateMessageTTSStatus(lastAudioConversationId, lastAudioMessageIndex, 'completed');
        }
        
        // Cleanup sound object
        if (soundRef.current) {
          soundRef.current.setOnPlaybackStatusUpdate(null);
          playbackCallbackRef.current = null;
          
          soundRef.current.unloadAsync().catch(error => {
            console.error('Error unloading sound:', error);
          });
          
          soundRef.current = null;
        }
      }
    };
  }, [onStatusUpdate, lastAudioConversationId, lastAudioMessageIndex]);

  /**
   * Play audio from a specific message
   * @param conversationId - ID of the conversation
   * @param messageIndex - Index of the message to play audio from (-1 for latest)
   */
  const playAudio = useCallback(async (conversationId: string, messageIndex: number = -1) => {
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
      // Stop any currently playing audio
      await stopAudio(true);
      
      // Configure audio for playback
      await configureAudioForPlayback();
      
      // Update UI state
      setIsPlaying(true);
      if (onStatusUpdate) onStatusUpdate(true);
      setStatusMessage('Loading audio...');
      
      // Construct the audio URL
      const tempoParam = tempo ? `&tempo=${tempo}` : '';
      const audioUrl = `${API_URL}/stream-audio/${conversationId}?message_index=${messageIndex}${tempoParam}`;
      
      console.log(`🎵 Loading audio from: ${audioUrl}`);
      
      // Update the message's TTS status in history
      // This is an important step to signal that we are attempting to load audio
      // Find and update the message in the parent component
      if (window && window.updateMessageTTSStatus) {
        window.updateMessageTTSStatus(conversationId, messageIndex, 'running');
      }
      
      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl, isNetwork: true },
        {
          shouldPlay: true,
          rate: 1.0,
          progressUpdateIntervalMillis: 100,
        },
        createPlaybackStatusCallback()
      );
      
      // Save references
      soundRef.current = sound;
      playbackCallbackRef.current = createPlaybackStatusCallback();
      
      // Start playback
      await sound.playAsync();
      setStatusMessage('');
      
      // Update the message's TTS status to completed
      if (window && window.updateMessageTTSStatus) {
        window.updateMessageTTSStatus(conversationId, messageIndex, 'completed');
      }
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setStatusMessage('Failed to play audio');
      setIsPlaying(false);
      if (onStatusUpdate) onStatusUpdate(false);
      
      // Update the message's TTS status to failed
      if (window && window.updateMessageTTSStatus) {
        window.updateMessageTTSStatus(conversationId, messageIndex, 'failed');
      }
    }
  }, [isMuted, tempo, stopAudio, configureAudioForPlayback, createPlaybackStatusCallback, onStatusUpdate]);

  /**
   * Handle replaying the last audio message
   */
  const handleReplayLastMessage = useCallback(async () => {
    console.log(`🔄 Replay requested. lastAudioConversationId: ${lastAudioConversationId}, lastAudioMessageIndex: ${lastAudioMessageIndex}, isMuted: ${isMuted}, isPlaying: ${isPlaying}`);
    
    // Check if we can play audio
    if (isMuted) {
      console.log("🔇 Audio is muted, can't replay");
      setStatusMessage('Audio is muted');
      return;
    }
    
    // If already playing, stop first
    if (isPlaying) {
      console.log("🔄 Already playing audio, stopping first");
      await stopAudio(true); // Stop but preserve message index
    }
    
    // Verify we have the necessary info to replay
    if (!lastAudioConversationId || lastAudioMessageIndex === null) {
      console.log("🔄 Missing audio reference info, can't replay");
      setStatusMessage('No audio to replay');
      return;
    }

    try {
      console.log(`🔄 Replaying message at index ${lastAudioMessageIndex}`);
      setStatusMessage('Replaying last message...');

      // Use the existing playAudio function with the saved conversation ID and message index
      await playAudio(lastAudioConversationId, lastAudioMessageIndex);
    } catch (error) {
      console.error('Error replaying audio:', error);
      setStatusMessage('Failed to replay message');
    }
  }, [lastAudioConversationId, lastAudioMessageIndex, isMuted, isPlaying, stopAudio, playAudio]);

  // Initialize sound and cleanup when unmounting
  useEffect(() => {
    // Set mount flag
    isMountedRef.current = true;
    
    // Set up initial audio configuration
    const setupAudio = async () => {
      try {
        // Request audio permissions
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          console.warn('Audio permissions not granted');
        }

        // Configure audio session
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          interruptionModeIOS: 2, // Audio.InterruptionModeIOS.MixWithOthers = 2
          interruptionModeAndroid: 2, // Audio.InterruptionModeAndroid.MixWithOthers = 2
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

    // Cleanup function for unmounting
    return () => {
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
    };
  }, []);

  return {
    isPlaying,
    statusMessage,
    canReplayLastMessage,
    playAudio,
    stopAudio,
    handleReplayLastMessage,
    lastAudioMessageIndex,
    soundRef,
  };
}