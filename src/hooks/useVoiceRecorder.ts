// useVoiceRecorder.ts
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
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setStatusMessage('Microphone permissions not granted');
        console.error('Microphone permissions not granted');
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

  // Start recording function
  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording || isProcessing) return;

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

      setStatusMessage('Requesting microphone permissions...');

      // Clean up previous resources
      cleanup();

      // Set up audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Get recording directory for temp files
      const documentDirectory = FileSystem.documentDirectory;
      // Generate recording path
      const recordingPath = `${documentDirectory}recording_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'webm'}`;

      // Configure recording options
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.webm',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WEBM,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_OPUS,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      // Create recording object
      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        onRecordingStatusUpdate,
        100 // Update status every 100ms
      );

      recordingRef.current = recording;
      recordingUriRef.current = recordingPath;
      setStatusMessage('Recording started! Waiting for speech...');
      setIsRecording(true);

      // Start tracking recording time
      recordingStartTimeRef.current = Date.now();

      // Set up silence detection interval
      silenceDetectorRef.current = setInterval(() => {
        if (!mountedRef.current || !isRecording) {
          if (silenceDetectorRef.current) {
            clearInterval(silenceDetectorRef.current);
          }
          return;
        }

        // Note: This interval is mostly for UI updates and silence countdown
        // The actual audio level detection happens in onRecordingStatusUpdate
      }, settings.checkInterval);

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatusMessage(`Microphone error: ${error instanceof Error ? error.message : String(error)}`);
      setIsRecording(false);
      cleanup();
    }
  }, [cleanup, isProcessing, isRecording, settings]);

  // Monitor recording status
  const onRecordingStatusUpdate = (status: RecordingStatus): void => {
    if (!mountedRef.current) return;

    if (status.isRecording) {
      // Get the metering level (dB) and convert to a 0-100 scale
      // Note: metering level is usually negative, with 0 being max volume and -160 being silence
      const db = status.metering || -160; // Default to -160dB if metering is not available
      const normalizedLevel = Math.max(0, (db + 160) / 160 * 100); // Convert to 0-100 scale

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
  };

  // Stop recording function
  const stopRecording = useCallback(async (): Promise<void> => {
    setStatusMessage('Stopping recording...');
    setIsRecording(false);

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (err) {
        console.error('Error stopping recorder:', err);
        setStatusMessage(`Error stopping: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Clear silence detector
      if (silenceDetectorRef.current) {
        clearInterval(silenceDetectorRef.current);
        silenceDetectorRef.current = null;
      }

      // We keep hasSpeech true until the next recording starts
      setSilenceDetected(false);
      silenceDetectedRef.current = false;
    }
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