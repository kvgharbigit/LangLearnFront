// useVoiceRecorder.ts - With pre-buffer implementation and improved cleanup
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { AUDIO_SETTINGS } from '../constants/settings'; // Import settings directly

// Hardcoded maximum recording duration in milliseconds (25 seconds)
const MAX_RECORDING_DURATION = 25000;

// Types
interface VoiceRecorderOptions {
  silenceThreshold?: number;
  speechThreshold?: number;
  silenceDuration?: number;
  minRecordingTime?: number;
  checkInterval?: number;
  preBufferDuration?: number; // Duration of pre-buffer in milliseconds
}

interface VoiceRecorderSettings {
  silenceThreshold: number;
  speechThreshold: number;
  silenceDuration: number;
  minRecordingTime: number;
  checkInterval: number;
  preBufferDuration: number; // Duration of pre-buffer in milliseconds
  maxRecordingDuration: number; // Maximum recording duration in milliseconds
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
  isPreBuffering: boolean; // State to track pre-buffer mode
  maxRecordingTimeRemaining: number | null; // Remaining time in seconds until max duration is reached
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
  startPreBuffering: () => Promise<void>; // Function to start pre-buffer mode
  settings: VoiceRecorderSettings;
}

/**
 * Custom hook for voice recording with automatic silence detection and pre-buffering in React Native
 *
 * @param options - Configuration options
 * @returns Recording state and control functions
 */
const useVoiceRecorder = (options: VoiceRecorderOptions = {}): VoiceRecorderResult => {
  // Use settings from the imported AUDIO_SETTINGS and override with options if provided
  // Maintain consistent 0-100 scale for all audio levels and thresholds
  const settings: VoiceRecorderSettings = {
    silenceThreshold: options.silenceThreshold || AUDIO_SETTINGS.SILENCE_THRESHOLD,
    speechThreshold: options.speechThreshold || AUDIO_SETTINGS.SPEECH_THRESHOLD,
    silenceDuration: options.silenceDuration || AUDIO_SETTINGS.SILENCE_DURATION,
    minRecordingTime: options.minRecordingTime || AUDIO_SETTINGS.MIN_RECORDING_TIME,
    checkInterval: options.checkInterval || AUDIO_SETTINGS.CHECK_INTERVAL,
    preBufferDuration: options.preBufferDuration || 1000,
    maxRecordingDuration: MAX_RECORDING_DURATION, // Use hardcoded constant instead of user option
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
  const [isPreBuffering, setIsPreBuffering] = useState<boolean>(false);
  const [maxRecordingTimeRemaining, setMaxRecordingTimeRemaining] = useState<number | null>(null);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceDetectorRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);
  const recordingUriRef = useRef<string | null>(null);
  const preBufferStartTimeRef = useRef<number | null>(null);
  const speechDetectedTimeRef = useRef<number | null>(null);
  const cleanupInProgressRef = useRef<boolean>(false);
  const preBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Added ref for pre-buffer timeout
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Added ref for max recording duration timeout
  const maxRecordingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval to check recording duration
  const stopRecordingRef = useRef<boolean>(false); // Flag to prevent duplicate stop calls

  // Tracking refs
  const hasSpeechRef = useRef<boolean>(false);
  const silenceDetectedRef = useRef<boolean>(false);
  const isPreBufferingRef = useRef<boolean>(false);

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

  // Cleanup function with proper promise handling
  const cleanup = useCallback(async (): Promise<void> => {
    console.log('Running cleanup...');

    // Set flag to prevent concurrent cleanup operations
    if (cleanupInProgressRef.current) {
      console.log('Cleanup already in progress, waiting...');
      // Wait for existing cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    cleanupInProgressRef.current = true;

    try {
      // Clear any pre-buffer timeout
      if (preBufferTimeoutRef.current) {
        clearTimeout(preBufferTimeoutRef.current);
        preBufferTimeoutRef.current = null;
      }
      
      // Clear max recording duration timeout
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
        maxRecordingTimeoutRef.current = null;
      }
      
      // Clear max recording duration interval
      if (maxRecordingIntervalRef.current) {
        clearInterval(maxRecordingIntervalRef.current);
        maxRecordingIntervalRef.current = null;
        console.log('Cleared max recording interval during cleanup');
      }

      // Clear silence detector interval
      if (silenceDetectorRef.current) {
        clearInterval(silenceDetectorRef.current);
        silenceDetectorRef.current = null;
      }

      // Stop recording if it exists
      if (recordingRef.current) {
        try {
          console.log('Stopping and unloading recording in cleanup');
          await recordingRef.current.stopAndUnloadAsync();

          // Small delay to ensure recording is fully unloaded
          await new Promise(resolve => setTimeout(resolve, 100));

          recordingRef.current = null;
        } catch (error) {
          console.error('Error stopping recording during cleanup:', error);

          // Force reset the recording reference if we get an error
          recordingRef.current = null;
        }
      }

      // Reset state references
      isPreBufferingRef.current = false;
      speechDetectedTimeRef.current = null;
      preBufferStartTimeRef.current = null;

      // Reset UI state if component is mounted
      if (mountedRef.current) {
        setIsPreBuffering(false);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      cleanupInProgressRef.current = false;
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

  // Update UI from refs and track max recording time remaining
  useEffect(() => {
    const syncUI = (): void => {
      if (mountedRef.current) {
        setHasSpeech(hasSpeechRef.current);
        setSilenceDetected(silenceDetectedRef.current);
        setIsPreBuffering(isPreBufferingRef.current);
        
        // Update max recording time remaining if actively recording
        if (isRecording && recordingStartTimeRef.current) {
          const elapsedTime = Date.now() - recordingStartTimeRef.current;
          const remainingMs = Math.max(0, MAX_RECORDING_DURATION - elapsedTime);
          const remainingSec = Math.ceil(remainingMs / 1000);
          setMaxRecordingTimeRemaining(remainingSec);
        } else if (!isRecording && maxRecordingTimeRemaining !== null) {
          setMaxRecordingTimeRemaining(null);
        }
      }
    };

    const interval = setInterval(syncUI, 250); // Update slightly less frequently (every 250ms)
    return () => clearInterval(interval);
  }, [isRecording, maxRecordingTimeRemaining]);

  // Convert dB level to normalized 0-100 scale
  const normalizeAudioLevel = (db: number): number => {
    // Convert from dB scale to 0-100 linear scale consistently
    // dB is typically negative, with -160 being silence and 0 being loudest
    return Math.max(0, Math.min(100, (db + 160) / 160 * 100));
  };

  // Start pre-buffering function
  const startPreBuffering = useCallback(async (): Promise<void> => {
    if (isRecording || isProcessing) {
      console.log('Already recording or processing, ignoring pre-buffer request');
      return;
    }

    // Skip audio mode check since getAudioModeAsync is not available
    // This was causing TypeError: _expoAv.Audio.getAudioModeAsync is not a function
    try {
      // Instead, just set a new audio mode explicitly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2, // 2 = MixWithOthers - allows audio to continue during modals
        interruptionModeAndroid: 2, // 2 = MixWithOthers - allows audio to continue during modals
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.log('Error setting audio mode:', error);
      // Continue anyway since this is just a precaution
    }

    try {
      // Reset state for pre-buffering
      setAudioLevel(0);
      setPeakLevel(0);
      setAudioSamples([]);
      setSilenceCountdown(null);
      setMaxRecordingTimeRemaining(null);
      setHasSpeech(false);
      setSilenceDetected(false);
      hasSpeechRef.current = false;
      silenceDetectedRef.current = false;
      silenceStartRef.current = null;
      recordingUriRef.current = null;
      speechDetectedTimeRef.current = null;

      // Clear any existing pre-buffer timeout
      if (preBufferTimeoutRef.current) {
        clearTimeout(preBufferTimeoutRef.current);
        preBufferTimeoutRef.current = null;
      }
      
      // Clear any existing max recording duration timeout
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
        maxRecordingTimeoutRef.current = null;
      }

      // Run cleanup to make sure we don't have any lingering recordings
      console.log('Running cleanup before pre-buffering');
      await cleanup();

      // Wait a small amount of time to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Set pre-buffering mode
      isPreBufferingRef.current = true;
      setIsPreBuffering(true);

      setStatusMessage('Pre-buffering audio...');

      // Ensure audio mode is set for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2, // 2 = MixWithOthers - allows audio to continue during modals
        interruptionModeAndroid: 2, // 2 = MixWithOthers - allows audio to continue during modals
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Generate file path for recording
      const fileDirectory = FileSystem.documentDirectory;
      const fileName = `recording_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'webm'}`;
      const fileUri = fileDirectory + fileName;

      console.log(`Pre-buffering to file: ${fileUri}`);

      // Create a new recording object
      const recording = new Audio.Recording();
      recordingRef.current = recording;  // Set ref before preparing to avoid race conditions

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
          // Get the metering level (dB) and normalize to 0-100 scale
          const db = status.metering !== undefined ? status.metering : -160;
          const normalizedLevel = normalizeAudioLevel(db);

          // Only log occasionally to reduce console noise
          if (Math.random() < 0.05) {
            console.log(`Pre-buffer level=${normalizedLevel.toFixed(1)}, raw=${db}`);
          }

          setAudioLevel(normalizedLevel);
          if (normalizedLevel > peakLevel) {
            setPeakLevel(normalizedLevel);
          }

          // SPEECH DETECTION in pre-buffer mode
          if (normalizedLevel > settings.speechThreshold && isPreBufferingRef.current) {
            console.log(`🎙️ Speech detected during pre-buffering! Level: ${normalizedLevel.toFixed(1)}`);

            // Mark the time when speech was detected
            speechDetectedTimeRef.current = Date.now();

            // Clear the pre-buffer timeout since we've detected speech
            if (preBufferTimeoutRef.current) {
              clearTimeout(preBufferTimeoutRef.current);
              preBufferTimeoutRef.current = null;
              console.log('Cleared pre-buffer timeout due to speech detection');
            }

            // Transition from pre-buffer to active recording
            isPreBufferingRef.current = false;
            setIsPreBuffering(false);

            hasSpeechRef.current = true;
            silenceDetectedRef.current = false;
            silenceStartRef.current = null;
            setSilenceCountdown(null);

            // Update UI state to show we're now actively recording
            setIsRecording(true);
            setStatusMessage('Speech detected - recording...');
            
            // Set a timeout to automatically stop recording after max duration (25 seconds)
            console.log(`Setting max recording timeout for exactly ${MAX_RECORDING_DURATION}ms (25 seconds) at ${new Date().toISOString()}`);
            const startTime = Date.now();
            
            // Use both approaches to ensure at least one works: timeout and interval
            
            // 1. Traditional timeout approach
            maxRecordingTimeoutRef.current = setTimeout(() => {
              const elapsed = Date.now() - startTime;
              console.log(`MAX RECORDING TIMEOUT TRIGGERED after ${elapsed}ms at ${new Date().toISOString()}`);
              
              if (mountedRef.current) {
                console.log(`Component is mounted: ${mountedRef.current}`);
                console.log(`Is recording state: ${isRecording}`);
                
                setStatusMessage('Maximum recording time (25s) reached - auto-stopping');
                console.log('Maximum recording duration (25 seconds) reached - auto-stopping');
                stopRecording();
              } else {
                console.log('Timeout triggered but component not mounted');
              }
            }, MAX_RECORDING_DURATION);
            console.log(`Max recording timeout ID: ${maxRecordingTimeoutRef.current}`);
            
            // 2. Additional interval-based approach to ensure timing reliability
            // Check every 500ms if we've exceeded the max recording duration
            maxRecordingIntervalRef.current = setInterval(() => {
              if (recordingStartTimeRef.current) {
                const elapsedTime = Date.now() - recordingStartTimeRef.current;
                
                // Log progress every second
                if (elapsedTime % 1000 < 500) {
                  console.log(`Recording duration: ${elapsedTime}ms / ${MAX_RECORDING_DURATION}ms`);
                }
                
                // If we've exceeded the max duration, stop recording
                if (elapsedTime >= MAX_RECORDING_DURATION) {
                  console.log(`MAX RECORDING INTERVAL CHECK: Duration ${elapsedTime}ms exceeds limit of ${MAX_RECORDING_DURATION}ms`);
                  
                  if (mountedRef.current && isRecording) {
                    setStatusMessage('Maximum recording time (25s) reached - auto-stopping (interval)');
                    console.log('Maximum recording duration (25 seconds) reached - auto-stopping (interval)');
                    
                    // Clear this interval first to prevent multiple calls
                    if (maxRecordingIntervalRef.current) {
                      clearInterval(maxRecordingIntervalRef.current);
                      maxRecordingIntervalRef.current = null;
                    }
                    
                    stopRecording();
                  }
                }
              }
            }, 500);
            console.log(`Max recording interval ID: ${maxRecordingIntervalRef.current}`);

            // Set recording start time to when pre-buffer began (for silence detection timing)
            if (preBufferStartTimeRef.current) {
              recordingStartTimeRef.current = preBufferStartTimeRef.current;
            } else {
              recordingStartTimeRef.current = Date.now() - status.durationMillis;
            }
          }

          // SILENCE DETECTION - only check if we've transitioned to active recording
          if (hasSpeechRef.current && !isPreBufferingRef.current && recordingStartTimeRef.current) {
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
                      if (mountedRef.current && (isRecording || isPreBuffering)) {
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

      // Start recording for pre-buffer
      await recording.startAsync();

      // Set recording URI for later use
      recordingUriRef.current = fileUri;
      preBufferStartTimeRef.current = Date.now();

      setStatusMessage('Pre-buffering active - waiting for speech...');

      // Set up a timeout to auto-stop pre-buffering if no speech is detected
      // Store the timeout ID so we can cancel it later if needed
      const preBufferTimeoutId = setTimeout(() => {
        // Only stop if we're still in pre-buffer mode (no speech detected)
        if (isPreBufferingRef.current && mountedRef.current) {
          console.log("Pre-buffer timeout reached with no speech detected");
          isPreBufferingRef.current = false;
          setIsPreBuffering(false);

          // Stop and discard the recording if no speech was detected
          if (recordingRef.current && !hasSpeechRef.current) {
            stopRecording().then(() => {
              // Reset everything since no speech was detected
              resetRecording();
              setStatusMessage('No speech detected - stopped pre-buffering');
            });
          }
        }
      }, 25000); // 25-second timeout for pre-buffer mode

      // Store the timeout ID in our ref
      preBufferTimeoutRef.current = preBufferTimeoutId;

    } catch (error) {
      console.error('Error starting pre-buffer recording:', error);
      setStatusMessage(`Microphone error: ${error instanceof Error ? error.message : String(error)}`);
      setIsPreBuffering(false);
      isPreBufferingRef.current = false;
      cleanup();
    }
  }, [cleanup, isProcessing, isRecording, peakLevel, settings]);

  // Start recording function - Using approach from AudioTestScreen
  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording || isProcessing) {
      console.log('Already recording or processing, ignoring start request');
      return;
    }

    // Skip audio mode check since getAudioModeAsync is not available
    // This was causing TypeError: _expoAv.Audio.getAudioModeAsync is not a function
    try {
      // Instead, just set a new audio mode explicitly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2, // 2 = MixWithOthers - allows audio to continue during modals
        interruptionModeAndroid: 2, // 2 = MixWithOthers - allows audio to continue during modals
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.log('Error setting audio mode:', error);
      // Continue anyway since this is just a precaution
    }

    try {
      // Reset state
      setAudioLevel(0);
      setPeakLevel(0);
      setAudioSamples([]);
      setSilenceCountdown(null);
      setMaxRecordingTimeRemaining(null);
      setHasSpeech(false);
      setSilenceDetected(false);
      hasSpeechRef.current = false;
      silenceDetectedRef.current = false;
      silenceStartRef.current = null;
      recordingUriRef.current = null;
      isPreBufferingRef.current = false;
      setIsPreBuffering(false);

      // Clear any existing pre-buffer timeout
      if (preBufferTimeoutRef.current) {
        clearTimeout(preBufferTimeoutRef.current);
        preBufferTimeoutRef.current = null;
      }
      
      // Clear any existing max recording duration timeout
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
        maxRecordingTimeoutRef.current = null;
      }

      setStatusMessage('Preparing to record...');

      // Clean up previous resources
      await cleanup();

      // Short delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Ensure audio mode is set for recording - CRITICAL PART
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2, // 2 = MixWithOthers - allows audio to continue during modals
        interruptionModeAndroid: 2, // 2 = MixWithOthers - allows audio to continue during modals
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
      recordingRef.current = recording;  // Set ref before preparing to avoid race conditions

      // /Begin recording with HIGH_QUALITY preset for better metering
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
          // Get the metering level (dB) and normalize to 0-100 scale
          const db = status.metering !== undefined ? status.metering : -160;
          const normalizedLevel = normalizeAudioLevel(db);

          // Only log occasionally to reduce console noise
          if (Math.random() < 0.05) {
            console.log(`Recording level=${normalizedLevel.toFixed(1)}, raw=${db}`);
          }

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
                      if (mountedRef.current && (isRecording || isPreBuffering)) {
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

      // Set recording URI for later use
      recordingUriRef.current = fileUri;
      setStatusMessage('Recording started! Waiting for speech...');
      setIsRecording(true);

      // Start tracking recording time
      recordingStartTimeRef.current = Date.now();
      
      // Set a timeout to automatically stop recording after max duration (25 seconds)
      console.log(`Setting max recording timeout for exactly ${MAX_RECORDING_DURATION}ms (25 seconds) at ${new Date().toISOString()}`);
      const startTime = Date.now();
      
      // Use both approaches to ensure at least one works: timeout and interval
      
      // 1. Traditional timeout approach
      maxRecordingTimeoutRef.current = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        console.log(`MAX RECORDING TIMEOUT TRIGGERED after ${elapsed}ms at ${new Date().toISOString()}`);
        
        if (mountedRef.current) {
          console.log(`Component is mounted: ${mountedRef.current}`);
          console.log(`Is recording state: ${isRecording}`);
          
          setStatusMessage('Maximum recording time (25s) reached - auto-stopping');
          console.log('Maximum recording duration (25 seconds) reached - auto-stopping');
          stopRecording();
        } else {
          console.log('Timeout triggered but component not mounted');
        }
      }, MAX_RECORDING_DURATION);
      console.log(`Max recording timeout ID: ${maxRecordingTimeoutRef.current}`);
      
      // 2. Additional interval-based approach to ensure timing reliability
      // Check every 500ms if we've exceeded the max recording duration
      maxRecordingIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsedTime = Date.now() - recordingStartTimeRef.current;
          
          // Log progress every second
          if (elapsedTime % 1000 < 500) {
            console.log(`Recording duration: ${elapsedTime}ms / ${MAX_RECORDING_DURATION}ms`);
          }
          
          // If we've exceeded the max duration, stop recording
          if (elapsedTime >= MAX_RECORDING_DURATION) {
            console.log(`MAX RECORDING INTERVAL CHECK: Duration ${elapsedTime}ms exceeds limit of ${MAX_RECORDING_DURATION}ms`);
            
            if (mountedRef.current && isRecording) {
              setStatusMessage('Maximum recording time (25s) reached - auto-stopping (interval)');
              console.log('Maximum recording duration (25 seconds) reached - auto-stopping (interval)');
              
              // Clear this interval first to prevent multiple calls
              if (maxRecordingIntervalRef.current) {
                clearInterval(maxRecordingIntervalRef.current);
                maxRecordingIntervalRef.current = null;
              }
              
              stopRecording();
            }
          }
        }
      }, 500);
      console.log(`Max recording interval ID: ${maxRecordingIntervalRef.current}`);

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
    // Just in case this is called multiple times in quick succession
    const isAlreadyStopping = stopRecordingRef.current;
    if (isAlreadyStopping) {
      console.log('Already stopping recording, ignoring duplicate stopRecording call');
      return;
    }
    
    // Set flag to prevent duplicate calls
    stopRecordingRef.current = true;
    
    console.log(`stopRecording called at ${new Date().toISOString()}`);
    setStatusMessage('Stopping recording...');

    // Clear any pre-buffer timeout first
    if (preBufferTimeoutRef.current) {
      clearTimeout(preBufferTimeoutRef.current);
      preBufferTimeoutRef.current = null;
      console.log('Cleared pre-buffer timeout during stopRecording');
    }
    
    // Clear max recording timeout
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
      console.log('Cleared max recording timeout during stopRecording');
    }
    
    // Clear max recording interval
    if (maxRecordingIntervalRef.current) {
      clearInterval(maxRecordingIntervalRef.current);
      maxRecordingIntervalRef.current = null;
      console.log('Cleared max recording interval during stopRecording');
    }

    if (!recordingRef.current) {
      console.log('No recording to stop');
      setIsRecording(false);
      setIsPreBuffering(false);
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
    isPreBufferingRef.current = false;
    setIsRecording(false);
    setIsPreBuffering(false);
    setSilenceDetected(false);
    silenceDetectedRef.current = false;
    
    // Reset stop recording flag
    setTimeout(() => {
      stopRecordingRef.current = false;
      console.log('Reset stopRecordingRef');
    }, 500);
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
    setMaxRecordingTimeRemaining(null);
    setHasSpeech(false);
    setSilenceDetected(false);
    hasSpeechRef.current = false;
    silenceDetectedRef.current = false;
    silenceStartRef.current = null;
    speechDetectedTimeRef.current = null;
    preBufferStartTimeRef.current = null;
    isPreBufferingRef.current = false;
    setIsPreBuffering(false);

    // Clear any existing pre-buffer timeout
    if (preBufferTimeoutRef.current) {
      clearTimeout(preBufferTimeoutRef.current);
      preBufferTimeoutRef.current = null;
      console.log('Cleared pre-buffer timeout during resetRecording');
    }
    
    // Clear any existing max recording timeout
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current);
      maxRecordingTimeoutRef.current = null;
      console.log('Cleared max recording timeout during resetRecording');
    }
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
    isPreBuffering,
    maxRecordingTimeRemaining,

    // Methods
    startRecording,
    stopRecording,
    getAudioURI,
    resetRecording,
    setIsProcessing,
    setStatusMessage,
    startPreBuffering,

    // Settings
    settings
  };
};

export default useVoiceRecorder;