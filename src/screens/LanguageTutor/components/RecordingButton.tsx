/**
 * RecordingButton.tsx
 * 
 * Circular button component for controlling recording functionality.
 * Displays different icons based on the current state (recording, processing, etc.)
 */

import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  ViewStyle 
} from 'react-native';
import colors from '../../../styles/colors';

interface RecordingButtonProps {
  onPress: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  isListening: boolean;
  isPlaying: boolean;
  isPreBuffering: boolean;
  autoRecordEnabled: boolean;
  disabled: boolean;
  pulseAnim: Animated.Value;
}

/**
 * Button component for voice recording with multiple states
 */
const RecordingButton: React.FC<RecordingButtonProps> = ({
  onPress,
  isRecording,
  isProcessing,
  isListening,
  isPlaying,
  isPreBuffering,
  autoRecordEnabled,
  disabled,
  pulseAnim
}) => {
  
  /**
   * Get the appropriate button style based on current state
   */
  const getButtonStyle = (): ViewStyle[] => {
    const buttonStyles = [styles.voiceButton];
    
    if (isRecording || isPreBuffering) {
      buttonStyles.push(styles.recordingButton);
    }
    
    if (isProcessing) {
      buttonStyles.push(styles.processingButton);
    }
    
    if (isListening) {
      buttonStyles.push(styles.listeningButton);
    }
    
    if (isPlaying) {
      buttonStyles.push(styles.disabledVoiceButton);
    }
    
    // Apply auto-record style when in default state
    if (!isRecording && !isProcessing && !isListening && 
        !isPlaying && !isPreBuffering && autoRecordEnabled) {
      buttonStyles.push(styles.autoRecordButton);
    }
    
    return buttonStyles;
  };
  
  /**
   * Render the appropriate icon based on current state
   */
  const renderButtonContent = () => {
    if (isRecording) {
      return (
        <>
          <Animated.View
            style={[
              styles.pulse,
              { transform: [{ scale: pulseAnim }] }
            ]}
          />
          <Text style={styles.micIcon}>📩</Text>
        </>
      );
    } else if (isPreBuffering) {
      return (
        <>
          <Animated.View
            style={[
              styles.pulse,
              { transform: [{ scale: pulseAnim }] }
            ]}
          />
          <Text style={styles.micIcon}>👂</Text>
        </>
      );
    } else if (isProcessing) {
      return <Text style={styles.processingIcon}>⏳</Text>;
    } else if (isPlaying) {
      return <Text style={styles.playingIcon}>🔊</Text>;
    } else if (isListening) {
      return <Text style={styles.listeningIcon}>👂</Text>;
    } else {
      // Default state - microphone
      return <Text style={styles.micIcon}>🎙️</Text>;
    }
  };
  
  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || isProcessing || isPlaying}
    >
      {renderButtonContent()}
    </TouchableOpacity>
  );
};

/**
 * Styles for the recording button and its various states
 */
const styles = StyleSheet.create({
  voiceButton: {
    position: 'relative',
    backgroundColor: colors.primary,
    borderRadius: 40, // Make it perfectly round
    width: 80, // Set width and height to be the same
    height: 80, // Large enough for the emoji
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingButton: {
    backgroundColor: colors.danger,
  },
  processingButton: {
    backgroundColor: colors.warning,
  },
  listeningButton: {
    backgroundColor: colors.info,
  },
  disabledVoiceButton: {
    backgroundColor: colors.gray400,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  autoRecordButton: {
    backgroundColor: '#8e44ad', // Purple color to indicate auto-record mode
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6, // For Android
  },
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: -1,
  },
  micIcon: {
    fontSize: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  processingIcon: {
    fontSize: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  playingIcon: {
    fontSize: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  listeningIcon: {
    fontSize: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

export default RecordingButton;