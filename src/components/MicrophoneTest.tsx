import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import AudioVisualizer from './AudioVisualizer';

interface MicrophoneTestProps {
  speechThreshold: number;
  silenceThreshold: number;
}

const MicrophoneTest: React.FC<MicrophoneTestProps> = ({
  speechThreshold,
  silenceThreshold
}) => {
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [preparing, setPreparing] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioSamples, setAudioSamples] = useState<number[]>([]);
  const [audioStatus, setAudioStatus] = useState<string>('Ready');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopMicTest();
    };
  }, []);

  // Normalize audio level from dB to 0-100 scale
  const normalizeAudioLevel = (db: number): number => {
    return Math.max(0, Math.min(100, (db + 160) / 160 * 100));
  };

  // Start microphone test
  const startMicTest = async () => {
    if (isTestActive) return;

    try {
      setPreparing(true);
      setErrorMessage(null);
      setAudioStatus('Preparing microphone...');

      // Clean up any existing recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      // Set up audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2, // MixWithOthers - allows audio to continue during modals
        interruptionModeAndroid: 2, // MixWithOthers - allows audio to continue during modals
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Create recording object
      const recording = new Audio.Recording();
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

      // Set up status update handler
      recording.setOnRecordingStatusUpdate((status) => {
        if (!mountedRef.current) return;

        if (status.isRecording) {
          // Get the metering level and normalize to 0-100
          const db = status.metering !== undefined ? status.metering : -160;
          const level = normalizeAudioLevel(db);

          setAudioLevel(level);

          // Update visualization samples
          setAudioSamples(prev => {
            const newSamples = [...prev, level];
            return newSamples.length > 50 ? newSamples.slice(-50) : newSamples;
          });

          // Update status based on current audio level
          if (level > speechThreshold) {
            setAudioStatus('Speech detected');
          } else if (level > silenceThreshold) {
            setAudioStatus('Medium level');
          } else {
            setAudioStatus('Silence/low level');
          }
        }
      });

      // Start recording
      await recording.startAsync();
      recordingRef.current = recording;

      if (mountedRef.current) {
        setIsTestActive(true);
        setPreparing(false);
        setAudioStatus('Listening...');
      }
    } catch (error) {
      console.error('Microphone test error:', error);
      if (mountedRef.current) {
        setPreparing(false);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        setAudioStatus('Failed to access microphone');
      }
    }
  };

  // Stop microphone test
  const stopMicTest = async () => {
    if (!recordingRef.current) return;

    try {
      setAudioStatus('Stopping test...');

      // Stop recording
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2, // MixWithOthers - allows audio to continue during modals
        interruptionModeAndroid: 2, // MixWithOthers - allows audio to continue during modals
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      if (mountedRef.current) {
        setIsTestActive(false);
        setAudioStatus('Ready');
      }
    } catch (error) {
      console.error('Error stopping microphone test:', error);
      if (mountedRef.current) {
        setIsTestActive(false);
        setAudioStatus('Error stopping test');
      }
    }
  };

  // Get level indicator color based on audio level
  const getLevelColor = () => {
    if (audioLevel > speechThreshold) {
      return '#4caf50'; // Green for speech
    } else if (audioLevel > silenceThreshold) {
      return '#ff9800'; // Orange for medium
    } else {
      return '#ced4da'; // Gray for low/silence
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic-outline" size={18} color={colors.primary} />
        <Text style={styles.title}>Test Your Microphone</Text>
      </View>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color="#f44336" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.testArea}>
        {isTestActive && (
          <>
            <View style={styles.levelIndicator}>
              <View style={styles.levelLabel}>
                <Text style={styles.levelText}>Current level:</Text>
                <Text style={[styles.levelValue, { color: getLevelColor() }]}>
                  {audioLevel.toFixed(1)}
                </Text>
              </View>

              <View style={styles.levelBarContainer}>
                <View
                  style={[
                    styles.levelBar,
                    {
                      width: `${audioLevel}%`,
                      backgroundColor: getLevelColor()
                    }
                  ]}
                />
              </View>

              <Text style={styles.statusText}>{audioStatus}</Text>
            </View>

            <AudioVisualizer
              audioSamples={audioSamples}
              speechThreshold={speechThreshold}
              silenceThreshold={silenceThreshold}
            />
          </>
        )}

        <TouchableOpacity
          style={[
            styles.testButton,
            isTestActive ? styles.stopButton : styles.startButton,
            preparing && styles.disabledButton
          ]}
          onPress={isTestActive ? stopMicTest : startMicTest}
          disabled={preparing}
        >
          {preparing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons
                name={isTestActive ? "stop-circle" : "mic"}
                size={20}
                color="white"
              />
              <Text style={styles.buttonText}>
                {isTestActive ? "Stop Test" : "Start Microphone Test"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  testArea: {
    alignItems: 'center',
  },
  levelIndicator: {
    width: '100%',
    marginBottom: 16,
  },
  levelLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 14,
    color: colors.gray700,
  },
  levelValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelBarContainer: {
    height: 20,
    backgroundColor: colors.gray200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  levelBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    color: colors.gray600,
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 50,
    marginTop: 16,
    gap: 8,
    justifyContent: 'center',
    minWidth: 200,
  },
  startButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: colors.gray400,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 15,
  },
});

export default MicrophoneTest;