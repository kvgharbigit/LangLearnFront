// useVoiceRecorder.ts - Updated based on working AudioTestScreen approach
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Types
interface VoiceRecorderOptions {
  silenceThreshold?: number;
  speechThreshold?: number;
  silenceDuration?: number;
  minRecordingTime?: number;
  checkInterval?: number;
}

interface VoiceRecorderSettings {
  silenceThreshold: number;
  speechThreshold: number;
  silenceDuration: number;
  minRecordingTime: number;
  checkInterval: number;
}

interface VoiceRecorderState {
  isRecording: boolean;
  hasSpeech: boolean;
  silenceDetected: boolean;
  audioLevel: number;
  peakLevel: number;
  statusMessage: string;
  silenceCountdown: number | null;
  audioSamples: number[];
  isProcessing: boolean;
}

interface RecordingStatus {
  isRecording: boolean;
  durationMillis: number;
  metering?: number;
}

interface VoiceRecorderResult extends VoiceRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  getAudioURI: () => string | null;
  resetRecording: () => void;
  setIsProcessing: (processing: boolean) => void;
  setStatusMessage: (message: string) => void;
  settings: VoiceRecorderSettings;
}

/**
 * Custom hook for voice recording with automatic silence detection in React Native
 *
 * @param options - Configuration options
 * @returns Recording state and control functions
 */
const useVoiceRecorder = (options: VoiceRecorderOptions = {}): VoiceRecorderResult => {
  // Default settings with adjusted values for better sensitivity
  const settings: VoiceRecorderSettings = {
    silenceThreshold: options.silenceThreshold || 5,
    speechThreshold: options.speechThreshold || 15,
    silenceDuration: options.silenceDuration || 2000,
    minRecordingTime: options.minRecordingTime || 500,
    checkInterval: options.checkInterval || 50,
  };

  // State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasSpeech, setHasSpeech] = useState<boolean>(false);
  const [silenceDetected, setSilenceDetected] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [peakLevel, setPeakLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [audioSamples, setAudioSamples] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceDetectorRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);
  const recordingUriRef = useRef<string | null>(null);

  // Tracking refs
  const hasSpeechRef = useRef<boolean>(false);
  const silenceDetectedRef = useRef<boolean>(false);

  // Request permissions
  useEffect(() => {
    const requestPermissions = async (): Promise<void> => {
      try {
        console.log('Requesting audio recording permissions...');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          setStatusMessage('Microphone permissions not granted');
          console.error('Microphone permissions not granted');
        } else {
          console.log('Permissions granted:', status);
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
        setStatusMessage(`Permission error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    requestPermissions();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback((): void => {
    console.log('Running cleanup...');
    // Clear silence detector interval
    if (silenceDetectorRef.current) {
      clearInterval(silenceDetectorRef.current);
      silenceDetectorRef.current = null;
    }

    // Stop recording if it exists
    if (recordingRef.current) {
      try {
        recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
      recordingRef.current = null;
    }
  }, []);

  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Add samples to audio visualizer data
  useEffect(() => {
    if (audioLevel > 0) {
      setAudioSamples(prev => {
        const newSamples = [...prev, audioLevel];
        return newSamples.length > 50 ? newSamples.slice(-50) : newSamples;
      });
    }
  }, [audioLevel]);

  // Update UI from refs
  useEffect(() => {
    const syncUI = (): void => {
      if (mountedRef.current) {
        setHasSpeech(hasSpeechRef.current);
        setSilenceDetected(silenceDetectedRef.current);
      }
    };

    const interval = setInterval(syncUI, 50);
    return () => clearInterval(interval);
  }, []);

  // Start recording function - Using approach from AudioTestScreen
  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording || isProcessing) {
      console.log('Already recording or processing, ignoring start request');
      return;
    }

    try {
      // Reset state
      setAudioLevel(0);
      setPeakLevel(0);
      setAudioSamples([]);
      setSilenceCountdown(null);
      setHasSpeech(false);
      setSilenceDetected(false);
      hasSpeechRef.current = false;
      silenceDetectedRef.current = false;
      silenceStartRef.current = null;
      recordingUriRef.current = null;

      setStatusMessage('Preparing to record...');

      // Clean up previous resources
      cleanup();

      // Ensure audio mode is set for recording - CRITICAL PART
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        // Use numeric constants directly instead of nested objects
        interruptionModeIOS: 1, // 1 = DoNotMix
        interruptionModeAndroid: 1, // 1 = DoNotMix
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Generate file path for recording
      const fileDirectory = FileSystem.documentDirectory;
      const fileName = `recording_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'webm'}`;
      const fileUri = fileDirectory + fileName;

      console.log(`Recording to file: ${fileUri}`);

      // Create a new recording object
      const recording = new Audio.Recording();

      // Begin recording with HIGH_QUALITY preset for better metering
      await recording.prepareToRecordAsync({
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

      // Set up status update handler using event listener
      recording.setOnRecordingStatusUpdate((status) => {
        if (!mountedRef.current) return;

        if (status.isRecording) {
          // Get the metering level (dB) and convert to a 0-100 scale
          const db = status.metering !== undefined ? status.metering : -160;
          const normalizedLevel = Math.max(0, (db + 160) / 160 * 100);

          console.log(`Recording status update: level=${normalizedLevel.toFixed(1)}, raw=${db}`);

          setAudioLevel(normalizedLevel);
          if (normalizedLevel > peakLevel) {
            setPeakLevel(normalizedLevel);
          }

          // SPEECH DETECTION
          if (normalizedLevel > settings.speechThreshold) {
            if (!hasSpeechRef.current) {
              console.log(`Speech detected! Level: ${normalizedLevel.toFixed(1)}`);
              hasSpeechRef.current = true;
              silenceDetectedRef.current = false;
              silenceStartRef.current = null;
              setSilenceCountdown(null);
              setStatusMessage('Recording speech...');
            }
          }

          // SILENCE DETECTION - only check if we've detected speech previously
          if (hasSpeechRef.current && recordingStartTimeRef.current !== null) {
            const recordingTime = Date.now() - recordingStartTimeRef.current;

            // Only process silence after minimum recording time
            if (recordingTime > settings.minRecordingTime) {
              // Check if current level is below silence threshold
              if (normalizedLevel < settings.silenceThreshold) {
                // Start silence timer if not already started
                if (silenceStartRef.current === null) {
                  silenceStartRef.current = Date.now();
                  silenceDetectedRef.current = true;
                  setStatusMessage('Silence detected after speech...');
                } else {
                  // Calculate current silence duration
                  const silenceDuration = Date.now() - silenceStartRef.current;

                  // Show countdown to user
                  const remainingTime = Math.ceil((settings.silenceDuration - silenceDuration) / 1000);
                  setSilenceCountdown(remainingTime);

                  // Check if silence duration threshold is reached
                  if (silenceDuration > settings.silenceDuration) {
                    setStatusMessage('Silence threshold reached - auto-stopping');

                    // Use setTimeout to ensure we don't call stop during interval execution
                    setTimeout(() => {
                      if (mountedRef.current && isRecording) {
                        stopRecording();
                      }
                    }, 0);
                  } else {
                    setStatusMessage(`Silence detected (${remainingTime}s until auto-submit)...`);
                  }
                }
              } else {
                // Audio level is above silence threshold, so reset silence detection
                if (silenceStartRef.current !== null) {
                  silenceStartRef.current = null;
                  silenceDetectedRef.current = false;
                  setSilenceCountdown(null);
                  setStatusMessage('Recording speech...');
                }
              }
            }
          }
        }
      });

      // Start recording
      await recording.startAsync();

      recordingRef.current = recording;
      recordingUriRef.current = fileUri;
      setStatusMessage('Recording started! Waiting for speech...');
      setIsRecording(true);

      // Start tracking recording time
      recordingStartTimeRef.current = Date.now();

      // Set up silence detection interval (used for UI updates)
      silenceDetectorRef.current = setInterval(() => {
        if (!mountedRef.current || !isRecording) {
          if (silenceDetectorRef.current) {
            clearInterval(silenceDetectorRef.current);
          }
          return;
        }
      }, settings.checkInterval);

      // Get initial status to confirm recording is working
      try {
        const status = await recording.getStatusAsync();
        console.log('Initial recording status:', status);
      } catch (err) {
        console.error('Error getting recording status:', err);
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatusMessage(`Microphone error: ${error instanceof Error ? error.message : String(error)}`);
      setIsRecording(false);
      cleanup();
    }
  }, [cleanup, isProcessing, isRecording, peakLevel, settings]);

  // Stop recording function
  const stopRecording = useCallback(async (): Promise<void> => {
    setStatusMessage('Stopping recording...');

    if (!recordingRef.current) {
      console.log('No recording to stop');
      setIsRecording(false);
      return;
    }

    try {
      console.log('Stopping recording...');
      await recordingRef.current.stopAndUnloadAsync();
      console.log('Recording stopped');

      const uri = recordingRef.current.getURI();
      console.log('Recording URI:', uri);

      if (uri) {
        recordingUriRef.current = uri;

        // Check file size to confirm it worked
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          console.log('Recording file info:', fileInfo);
          if (fileInfo.exists && fileInfo.size === 0) {
            console.warn('Warning: Recording file is empty!');
          }
        } catch (fileError) {
          console.error('File check error:', fileError);
        }
      } else {
        console.warn('No URI from recording');
      }

      // Configure audio for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        // Use numeric constants directly
        interruptionModeIOS: 1, // 1 = DoNotMix
        interruptionModeAndroid: 1, // 1 = DoNotMix
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

    } catch (err) {
      console.error('Error stopping recorder:', err);
      setStatusMessage(`Error stopping: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Clear silence detector
    if (silenceDetectorRef.current) {
      clearInterval(silenceDetectorRef.current);
      silenceDetectorRef.current = null;
    }

    // Reset recording reference but maintain speech flag for processing
    recordingRef.current = null;
    setIsRecording(false);
    setSilenceDetected(false);
    silenceDetectedRef.current = false;
  }, []);

  // Get the recorded audio URI
  const getAudioURI = useCallback((): string | null => {
    return recordingUriRef.current;
  }, []);

  // Reset the recording state
  const resetRecording = useCallback((): void => {
    setAudioLevel(0);
    setPeakLevel(0);
    setAudioSamples([]);
    setSilenceCountdown(null);
    setHasSpeech(false);
    setSilenceDetected(false);
    hasSpeechRef.current = false;
    silenceDetectedRef.current = false;
    silenceStartRef.current = null;
  }, []);

  return {
    // State
    isRecording,
    hasSpeech,
    silenceDetected,
    audioLevel,
    peakLevel,
    statusMessage,
    silenceCountdown,
    audioSamples,
    isProcessing,

    // Methods
    startRecording,
    stopRecording,
    getAudioURI,
    resetRecording,
    setIsProcessing,
    setStatusMessage,

    // Settings
    settings
  };
};

export default useVoiceRecorder;