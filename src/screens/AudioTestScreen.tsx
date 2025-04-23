import React, {useEffect, useState} from 'react';
import {Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {Audio, InterruptionModeAndroid, InterruptionModeIOS} from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'AudioTest'>;

const AudioTestScreen: React.FC<Props> = ({ navigation }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [logs, setLogs] = useState<Array<{message: string, timestamp: string, isError: boolean}>>([]);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  // Initialize and request permissions
  useEffect(() => {
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
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            shouldDuckAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
          addLog('Audio session initialized');
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

  // Helper for logging with timestamps
  const addLog = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [
      { message, timestamp, isError },
      ...prevLogs
    ]);
    console.log(`${timestamp}: ${message}`);
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
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
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
          // Log every 5th status update to avoid flooding
          if (Math.random() < 0.2) {
            if (status.isRecording) {
              const metering = status.metering;
              if (metering !== undefined) {
                addLog(`Recording level: ${metering.toFixed(2)} dB`);
              } else {
                addLog('Recording (no metering data)');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Audio Recorder Test</Text>
      </View>

      <Text style={styles.status}>
        Permission: {permissionStatus || 'Checking...'}
      </Text>

      <View style={styles.controls}>
        {isRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopRecording}
          >
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={startRecording}
            disabled={isPlaying}
          >
            <Text style={styles.buttonText}>Start Recording</Text>
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
        >
          <Text style={styles.buttonText}>
            {isPlaying ? 'Playing...' : 'Play Recording'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logsTitle}>Debug Logs:</Text>
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text
            key={index}
            style={[styles.logEntry, log.isError && styles.errorLog]}
          >
            [{log.timestamp}] {log.message}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#5d6af8',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  status: {
    fontSize: 16,
    margin: 24,
    textAlign: 'center',
    color: '#555',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 150,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  recordButton: {
    backgroundColor: '#5d6af8',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  playButton: {
    backgroundColor: '#4caf50',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 20,
    padding: 10,
    borderRadius: 5,
  },
  logEntry: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorLog: {
    color: '#f44336',
  },
});

export default AudioTestScreen;