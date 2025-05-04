import React, {useEffect, useState, useRef} from 'react';
import {
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {Audio, InterruptionModeAndroid, InterruptionModeIOS} from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {AUDIO_SETTINGS} from '../constants/settings';
import {Ionicons} from '@expo/vector-icons';
import colors from '../styles/colors';
import SafeView from '../components/SafeView';

type Props = NativeStackScreenProps<RootStackParamList, 'AudioTest'>;
const { width } = Dimensions.get('window');

const AudioTestScreen: React.FC<Props> = ({ navigation }) => {
  // Recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [logs, setLogs] = useState<Array<{message: string, timestamp: string, isError: boolean}>>([]);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(15)).current;
  const levelAnim = useRef(new Animated.Value(0)).current;

  // Initialize and request permissions
  useEffect(() => {
    // Run entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
    
    (async () => {
      try {
        addLog('Requesting audio recording permissions...');
        const { status } = await Audio.requestPermissionsAsync();
        setPermissionStatus(status);
        addLog(`Permission status: ${status}`);

        if (status === 'granted') {
          addLog('Setting up audio session...');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers, // Allow audio to continue during modals
            shouldDuckAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.MixWithOthers, // Allow audio to continue during modals
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
          addLog('Audio session initialized');
          addLog(`Platform: ${Platform.OS.toUpperCase()}`);
          addLog(`Using SILENCE_THRESHOLD: ${AUDIO_SETTINGS.SILENCE_THRESHOLD}`);
          addLog(`Using SPEECH_THRESHOLD: ${AUDIO_SETTINGS.SPEECH_THRESHOLD}`);
          addLog(`Using SILENCE_DURATION: ${AUDIO_SETTINGS.SILENCE_DURATION}ms`);
        } else {
          addLog('Permission not granted!', true);
        }
      } catch (error) {
        addLog(`Setup error: ${(error as Error).message}`, true);
      }
    })();

    // Cleanup on unmount
    return () => {
      if (recording) {
        stopRecording();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);
  
  // Update level animation when currentLevel changes
  useEffect(() => {
    Animated.spring(levelAnim, {
      toValue: currentLevel,
      useNativeDriver: false,
      friction: 7,
      tension: 40
    }).start();
  }, [currentLevel]);

  // Helper for logging with timestamps
  const addLog = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [
      { message, timestamp, isError },
      ...prevLogs
    ]);
    console.log(`${timestamp}: ${message}`);
  };

  // Normalize audio level function - consistent with useVoiceRecorder.ts
  const normalizeAudioLevel = (db: number): number => {
    // Convert from dB scale to 0-100 linear scale consistently
    // dB is typically negative, with -160 being silence and 0 being loudest
    return Math.max(0, Math.min(100, (db + 160) / 160 * 100));
  };

  // Start recording function
  const startRecording = async () => {
    try {
      // Check if we already have a recording object
      if (recording) {
        addLog('Cleaning up previous recording');
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      // Clean up any existing sound
      if (sound) {
        addLog('Cleaning up previous sound');
        await sound.unloadAsync();
        setSound(null);
      }

      addLog('Preparing to record...');

      // Ensure audio mode is set for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers, // Allow audio to continue during modals
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.MixWithOthers, // Allow audio to continue during modals
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      addLog('Creating new recording...');

      // Use explicit file URI for better debugging
      const fileDirectory = FileSystem.documentDirectory;
      const fileName = `recording_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'webm'}`;
      const fileUri = fileDirectory + fileName;

      addLog(`Recording to file: ${fileUri}`);

      // Create recording with detailed options and status updates
      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.webm',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WEBM,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_OPUS,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            meteringEnabled: true,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
            meteringEnabled: true,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        },
        (status) => {
          // Process all status updates but log only occasionally
          if (status.isRecording) {
            const db = status.metering !== undefined ? status.metering : -160;
            const normalizedLevel = normalizeAudioLevel(db);
            setCurrentLevel(normalizedLevel);

            // Log every 5th status update to avoid flooding
            if (Math.random() < 0.2) {
              // Categorize audio level based on thresholds from settings
              if (normalizedLevel > AUDIO_SETTINGS.SPEECH_THRESHOLD) {
                addLog(`Speech detected! Level: ${normalizedLevel.toFixed(2)} (${db.toFixed(2)} dB)`);
              } else if (normalizedLevel > AUDIO_SETTINGS.SILENCE_THRESHOLD) {
                addLog(`Medium audio level: ${normalizedLevel.toFixed(2)} (${db.toFixed(2)} dB)`);
              } else {
                addLog(`Low level/silence: ${normalizedLevel.toFixed(2)} (${db.toFixed(2)} dB)`);
              }
            }
          }
        },
        100 // Update interval in ms
      );

      setRecording(newRecording);
      setIsRecording(true);
      addLog('Recording started!');

      // Get initial status to check if metering is working
      try {
        const status = await newRecording.getStatusAsync();
        addLog(`Initial recording status: ${JSON.stringify(status)}`);
      } catch (err) {
        addLog(`Status check error: ${(err as Error).message}`, true);
      }
    } catch (error) {
      addLog(`Recording error: ${(error as Error).message}`, true);
      setIsRecording(false);
    }
  };

  // Stop recording function
  const stopRecording = async () => {
    if (!recording) {
      addLog('No active recording to stop');
      return;
    }

    try {
      addLog('Stopping recording...');
      await recording.stopAndUnloadAsync();

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const uri = recording.getURI();
      setRecordingUri(uri);
      setCurrentLevel(0);

      if (uri) {
        addLog(`Recording saved to: ${uri}`);

        // Check if file exists and log its size
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            addLog(`File size: ${fileInfo.size} bytes`);
            if (fileInfo.size === 0) {
              addLog('Warning: File exists but is empty!', true);
            }
          } else {
            addLog('Error: File does not exist!', true);
          }
        } catch (fileError) {
          addLog(`File check error: ${(fileError as Error).message}`, true);
        }
      } else {
        addLog('Error: No URI returned from recording!', true);
      }

      setRecording(null);
      setIsRecording(false);
    } catch (error) {
      addLog(`Stop recording error: ${(error as Error).message}`, true);
      setIsRecording(false);
    }
  };

  // Play recorded audio
  const playRecording = async () => {
    if (!recordingUri) {
      addLog('No recording to play');
      return;
    }

    try {
      // Unload any existing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      addLog(`Loading sound from: ${recordingUri}`);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        (status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            addLog('Playback finished');
          }
        }
      );

      setSound(newSound);
      setIsPlaying(true);
      addLog('Playing recorded audio...');

      await newSound.playAsync();
    } catch (error) {
      addLog(`Playback error: ${(error as Error).message}`, true);
      setIsPlaying(false);
    }
  };

  // Get audio level display color
  const getAudioLevelColor = () => {
    if (currentLevel > AUDIO_SETTINGS.SPEECH_THRESHOLD) {
      return '#4caf50'; // Green for speech
    } else if (currentLevel > AUDIO_SETTINGS.SILENCE_THRESHOLD) {
      return '#ff9800'; // Orange for medium
    } else {
      return '#aaaaaa'; // Gray for low/silence
    }
  };

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audio Recorder Test</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            { opacity: fadeAnim, transform: [{ translateY }] }
          ]}
        >
          <View style={styles.statusCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="mic" size={22} color={colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Microphone Status</Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Permission:</Text>
              <View style={[
                styles.statusPill, 
                permissionStatus === 'granted' ? styles.statusPillSuccess : 
                permissionStatus === 'denied' ? styles.statusPillError : 
                styles.statusPillPending
              ]}>
                <Text style={styles.statusPillText}>{permissionStatus || 'Checking...'}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.platformInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform:</Text>
                <Text style={styles.infoValue}>{Platform.OS.toUpperCase()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Silence Threshold:</Text>
                <Text style={styles.infoValue}>{AUDIO_SETTINGS.SILENCE_THRESHOLD}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Speech Threshold:</Text>
                <Text style={styles.infoValue}>{AUDIO_SETTINGS.SPEECH_THRESHOLD}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Silence Duration:</Text>
                <Text style={styles.infoValue}>{AUDIO_SETTINGS.SILENCE_DURATION}ms</Text>
              </View>
            </View>
          </View>

          {isRecording && (
            <View style={styles.levelIndicatorCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="analytics" size={22} color={colors.primary} style={styles.cardHeaderIcon} />
                <Text style={styles.cardHeaderTitle}>Audio Level</Text>
                <View style={styles.levelValueContainer}>
                  <Text style={styles.levelValue}>{currentLevel.toFixed(1)}</Text>
                </View>
              </View>
              
              <View style={styles.levelIndicator}>
                <View style={styles.levelBarContainer}>
                  <Animated.View
                    style={[
                      styles.levelBar,
                      {
                        width: levelAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: getAudioLevelColor()
                      }
                    ]}
                  />
                </View>
                
                <View style={styles.thresholdMarkersContainer}>
                  <View style={styles.thresholdMarkers}>
                    <View
                      style={[
                        styles.thresholdMarker,
                        {
                          left: `${AUDIO_SETTINGS.SILENCE_THRESHOLD}%`,
                          backgroundColor: '#ff9800'
                        }
                      ]}
                    />
                    <View
                      style={[
                        styles.thresholdMarker,
                        {
                          left: `${AUDIO_SETTINGS.SPEECH_THRESHOLD}%`,
                          backgroundColor: '#4caf50'
                        }
                      ]}
                    />
                  </View>
                  
                  <View style={styles.thresholdLabels}>
                    <Text style={[styles.thresholdLabel, {left: `${AUDIO_SETTINGS.SILENCE_THRESHOLD}%`}]}>
                      Silence
                    </Text>
                    <Text style={[styles.thresholdLabel, {left: `${AUDIO_SETTINGS.SPEECH_THRESHOLD}%`}]}>
                      Speech
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.controlsCard}>
            <View style={styles.controls}>
              {isRecording ? (
                <TouchableOpacity
                  style={[styles.button, styles.stopButton]}
                  onPress={stopRecording}
                  accessibilityLabel="Stop Recording"
                >
                  <Ionicons name="stop" size={24} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Stop Recording</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.recordButton]}
                  onPress={startRecording}
                  disabled={isPlaying}
                  accessibilityLabel="Record"
                >
                  <Ionicons name="mic" size={24} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Record</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.playButton,
                  (!recordingUri || isRecording || isPlaying) && styles.disabledButton
                ]}
                onPress={playRecording}
                disabled={!recordingUri || isRecording || isPlaying}
                accessibilityLabel="Play Recording"
              >
                {isPlaying ? (
                  <>
                    <ActivityIndicator color="white" size="small" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Playing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="play" size={24} color="white" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Play Recording</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.logsCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={22} color={colors.primary} style={styles.cardHeaderIcon} />
              <Text style={styles.cardHeaderTitle}>Debug Logs</Text>
            </View>
            
            <View style={styles.logsContainer}>
              {logs.length === 0 ? (
                <Text style={styles.noLogsText}>No logs yet. Start recording to see logs.</Text>
              ) : (
                logs.map((log, index) => (
                  <Text
                    key={index}
                    style={[styles.logEntry, log.isError && styles.errorLog]}
                  >
                    <Text style={styles.logTimestamp}>[{log.timestamp}]</Text> {log.message}
                  </Text>
                ))
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    width: 40,
  },
  placeholderButton: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
  },
  // Cards
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  levelIndicatorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  controlsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  cardHeaderIcon: {
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 8,
  },
  // Status
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray700,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusPillSuccess: {
    backgroundColor: '#E8F5E9',
  },
  statusPillError: {
    backgroundColor: '#FFEBEE',
  },
  statusPillPending: {
    backgroundColor: '#E3F2FD',
  },
  statusPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Platform info
  platformInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray600,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Level indicator
  levelIndicator: {
    padding: 16,
  },
  levelValueContainer: {
    backgroundColor: 'rgba(93, 106, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  levelBarContainer: {
    height: 24,
    backgroundColor: '#eeeeee',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  levelBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  thresholdMarkersContainer: {
    marginBottom: 8,
  },
  thresholdMarkers: {
    position: 'relative',
    height: 16,
  },
  thresholdMarker: {
    position: 'absolute',
    height: 16,
    width: 2,
    backgroundColor: '#ff0000',
  },
  thresholdLabels: {
    position: 'relative',
    height: 20,
    marginTop: 2,
  },
  thresholdLabel: {
    position: 'absolute',
    fontSize: 12,
    color: colors.gray600,
    transform: [{ translateX: -20 }],
  },
  // Controls
  controls: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  recordButton: {
    backgroundColor: colors.primary,
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  playButton: {
    backgroundColor: '#4caf50',
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Logs
  logsContainer: {
    padding: 16,
    maxHeight: 300,
  },
  noLogsText: {
    textAlign: 'center',
    color: colors.gray500,
    fontStyle: 'italic',
    padding: 20,
  },
  logEntry: {
    fontSize: 13,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.gray800,
  },
  logTimestamp: {
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '500',
  },
  errorLog: {
    color: '#f44336',
  },
});

export default AudioTestScreen;